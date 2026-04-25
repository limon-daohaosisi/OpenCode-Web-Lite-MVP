import { randomUUID } from 'node:crypto';
import type {
  ApprovalDto,
  MessageDto,
  MessagePart,
  SessionCheckpoint,
  SessionDto,
  SessionEvent,
  SessionStatus,
  ToolCallDto,
  ToolName
} from '@opencode/shared';
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem
} from 'openai/resources/responses/responses';
import { buildSessionCheckpoint } from './checkpoint.js';
import {
  executeApprovedTool,
  prepareToolExecution,
  toolRequiresApproval
} from './tool-executor.js';
import type { StreamModelResponse } from './model-client.js';

type CreateApprovalInput = {
  createdAt: string;
  decisionReasonText: null | string;
  decidedAt: null | string;
  decidedBy: null | string;
  decisionScope: 'once' | 'session_rule';
  id: string;
  kind: ApprovalDto['kind'];
  payload: Record<string, unknown>;
  sessionId: string;
  status: ApprovalDto['status'];
  suggestedRuleJson: null | string;
  taskId: null | string;
  toolCallId: string;
};

type CreateMessageInput = {
  content: MessagePart[];
  createdAt?: string;
  id?: string;
  role: MessageDto['role'];
  sessionId: string;
  taskId?: string;
};

type CreateToolCallInput = {
  createdAt: string;
  id: string;
  input: Record<string, unknown>;
  messageId: null | string;
  requiresApproval: boolean;
  sessionId: string;
  startedAt?: string;
  status: ToolCallDto['status'];
  taskId: null | string;
  toolName: ToolName;
  updatedAt: string;
};

type UpdateSessionRuntimeStateInput = {
  currentTaskId?: null | string;
  lastCheckpoint?: null | SessionCheckpoint | string;
  lastErrorText?: null | string;
  sessionId: string;
  status?: SessionStatus;
};

export type SessionProcessorDeps = {
  appendSessionEvent(event: SessionEvent): unknown;
  createApproval(input: CreateApprovalInput): ApprovalDto;
  createId?: () => string;
  createMessage(input: CreateMessageInput): MessageDto;
  createToolCall(input: CreateToolCallInput): ToolCallDto;
  executeApprovedTool?: typeof executeApprovedTool;
  now?: () => string;
  prepareToolExecution?: typeof prepareToolExecution;
  streamModelResponse: StreamModelResponse;
  toolRequiresApproval?: typeof toolRequiresApproval;
  updateMessageContent(id: string, content: MessagePart[]): MessageDto | null;
  updateSessionRuntimeState(
    input: UpdateSessionRuntimeStateInput
  ): SessionDto | null;
  updateToolCall(input: {
    completedAt?: null | string;
    errorText?: null | string;
    id: string;
    result?: null | Record<string, unknown>;
    startedAt?: null | string;
    status: ToolCallDto['status'];
    updatedAt: string;
  }): ToolCallDto | null;
};

export type ProcessTurnInput = {
  input: string | ResponseInputItem[];
  previousResponseId?: null | string;
  sessionId: string;
  workspaceRoot: string;
};

export type ProcessorResult =
  | {
      kind: 'completed';
      previousResponseId: string;
    }
  | {
      kind: 'continue_with_tool_results';
      nextInput: ResponseInputItem[];
      previousResponseId: string;
    }
  | {
      checkpoint: SessionCheckpoint;
      kind: 'paused_for_approval';
      previousResponseId: string;
    };

type AssistantMessageState = {
  message: MessageDto | null;
  text: string;
};

type ExecuteFunctionCallResult =
  | { kind: 'continue'; output: ResponseInputItem }
  | { checkpoint: SessionCheckpoint; kind: 'paused_for_approval' };

function formatError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown runtime error.';
}

function isFunctionToolCall(
  item: ResponseOutputItem | { type: string }
): item is ResponseFunctionToolCall {
  return item.type === 'function_call';
}

export function buildFunctionCallOutput(
  callId: string,
  payload: Record<string, unknown>
): ResponseInputItem {
  return {
    call_id: callId,
    output: JSON.stringify(payload),
    type: 'function_call_output'
  };
}

export class SessionProcessor {
  constructor(private readonly deps: SessionProcessorDeps) {}

  async processTurn(input: ProcessTurnInput): Promise<ProcessorResult> {
    const assistantState: AssistantMessageState = {
      message: null,
      text: ''
    };
    const stream = this.deps.streamModelResponse({
      input: input.input,
      previousResponseId: input.previousResponseId
    });

    for await (const event of stream) {
      if (event.type !== 'response.output_text.delta') {
        continue;
      }

      const message = await this.ensureAssistantMessage(
        input.sessionId,
        assistantState
      );
      assistantState.text += event.delta;
      assistantState.message =
        this.deps.updateMessageContent(message.id, [
          {
            text: assistantState.text,
            type: 'text'
          }
        ]) ?? message;

      this.deps.appendSessionEvent({
        delta: event.delta,
        messageId: message.id,
        sessionId: input.sessionId,
        type: 'message.delta'
      });
    }

    const finalResponse = await stream.finalResponse();
    const previousResponseId = finalResponse.id;

    if (assistantState.message) {
      this.deps.appendSessionEvent({
        messageId: assistantState.message.id,
        sessionId: input.sessionId,
        type: 'message.completed'
      });
    }

    const functionCalls = finalResponse.output.reduce<
      ResponseFunctionToolCall[]
    >((calls, item) => {
      if (isFunctionToolCall(item)) {
        calls.push(item);
      }

      return calls;
    }, []);

    if (functionCalls.length === 0) {
      const checkpoint = buildSessionCheckpoint({
        kind: 'executing_task',
        previousResponseId
      });
      const updatedSession = this.deps.updateSessionRuntimeState({
        lastCheckpoint: checkpoint,
        lastErrorText: null,
        sessionId: input.sessionId,
        status: 'executing'
      });

      if (updatedSession) {
        this.deps.appendSessionEvent({
          sessionId: updatedSession.id,
          type: 'session.updated',
          updatedAt: updatedSession.updatedAt
        });
      }

      return {
        kind: 'completed',
        previousResponseId
      };
    }

    const nextInput: ResponseInputItem[] = [];

    for (const functionCall of functionCalls) {
      const outcome = await this.executeFunctionCall({
        assistantMessageId: assistantState.message?.id,
        functionCall,
        previousResponseId,
        sessionId: input.sessionId,
        workspaceRoot: input.workspaceRoot
      });

      if (outcome.kind === 'paused_for_approval') {
        return {
          checkpoint: outcome.checkpoint,
          kind: 'paused_for_approval',
          previousResponseId
        };
      }

      nextInput.push(outcome.output);
    }

    return {
      kind: 'continue_with_tool_results',
      nextInput,
      previousResponseId
    };
  }

  async executeApprovedToolCall(input: {
    callId: string;
    decision: 'approved' | 'rejected';
    sessionId: string;
    toolCall: ToolCallDto;
    workspaceRoot: string;
  }): Promise<ResponseInputItem> {
    const toolName = input.toolCall.toolName as ToolName;
    const now = this.now();

    if (input.decision === 'rejected') {
      const payload = {
        error: 'Approval rejected by user',
        ok: false,
        rejected: true
      };

      await this.createToolResultMessage({
        payload,
        sessionId: input.sessionId,
        toolName
      });

      this.deps.appendSessionEvent({
        error: 'Approval rejected by user',
        sessionId: input.sessionId,
        toolCallId: input.toolCall.id,
        type: 'tool.failed'
      });

      return buildFunctionCallOutput(input.callId, payload);
    }

    this.deps.updateToolCall({
      id: input.toolCall.id,
      startedAt: now,
      status: 'running',
      updatedAt: now
    });

    this.deps.appendSessionEvent({
      sessionId: input.sessionId,
      toolCallId: input.toolCall.id,
      type: 'tool.running'
    });

    try {
      const result = await this.executeApprovedTool(
        toolName as Extract<ToolName, 'run_command' | 'write_file'>,
        input.toolCall.input,
        input.workspaceRoot
      );
      const completedAt = this.now();
      const completedToolCall = this.deps.updateToolCall({
        completedAt,
        id: input.toolCall.id,
        result,
        startedAt: now,
        status: 'completed',
        updatedAt: completedAt
      });

      await this.createToolResultMessage({
        payload: result,
        sessionId: input.sessionId,
        toolName
      });

      if (completedToolCall) {
        this.deps.appendSessionEvent({
          sessionId: input.sessionId,
          toolCall: completedToolCall,
          type: 'tool.completed'
        });
      }

      return buildFunctionCallOutput(input.callId, result);
    } catch (error) {
      const errorMessage = formatError(error);
      const payload = { error: errorMessage, ok: false };
      const completedAt = this.now();

      this.deps.updateToolCall({
        completedAt,
        errorText: errorMessage,
        id: input.toolCall.id,
        result: payload,
        startedAt: now,
        status: 'failed',
        updatedAt: completedAt
      });

      await this.createToolResultMessage({
        payload,
        sessionId: input.sessionId,
        toolName
      });

      this.deps.appendSessionEvent({
        error: errorMessage,
        sessionId: input.sessionId,
        toolCallId: input.toolCall.id,
        type: 'tool.failed'
      });

      return buildFunctionCallOutput(input.callId, payload);
    }
  }

  private async createToolResultMessage(input: {
    payload: Record<string, unknown>;
    sessionId: string;
    toolName: ToolName;
  }) {
    const message = this.deps.createMessage({
      content: [
        {
          content: input.payload,
          toolName: input.toolName,
          type: 'tool_result'
        }
      ],
      role: 'tool',
      sessionId: input.sessionId
    });

    this.deps.appendSessionEvent({
      message,
      sessionId: input.sessionId,
      type: 'message.created'
    });

    return message;
  }

  private async ensureAssistantMessage(
    sessionId: string,
    state: AssistantMessageState
  ) {
    if (state.message) {
      return state.message;
    }

    const message = this.deps.createMessage({
      content: [],
      role: 'assistant',
      sessionId
    });

    state.message = message;
    this.deps.appendSessionEvent({
      message,
      sessionId,
      type: 'message.created'
    });
    return message;
  }

  private async executeFunctionCall(input: {
    assistantMessageId?: string;
    functionCall: ResponseFunctionToolCall;
    previousResponseId: string;
    sessionId: string;
    workspaceRoot: string;
  }): Promise<ExecuteFunctionCallResult> {
    const now = this.now();
    const rawInput = this.parseFunctionArguments(input.functionCall);
    const toolName = input.functionCall.name as ToolName;

    if (!toolName) {
      throw new Error('Function tool call is missing a valid tool name.');
    }

    if (this.toolRequiresApproval(toolName)) {
      const toolCall = this.deps.createToolCall({
        createdAt: now,
        id: this.createId(),
        input: rawInput,
        messageId: input.assistantMessageId ?? null,
        requiresApproval: true,
        sessionId: input.sessionId,
        status: 'pending_approval',
        taskId: null,
        toolName,
        updatedAt: now
      });
      const approvalPayload = await this.prepareToolExecution(
        toolName,
        rawInput,
        input.workspaceRoot
      );

      if (approvalPayload.kind !== 'approval') {
        throw new Error(
          'Expected approval payload for approval-required tool.'
        );
      }

      const approval = this.deps.createApproval({
        createdAt: now,
        decisionReasonText: null,
        decidedAt: null,
        decidedBy: null,
        decisionScope: 'once',
        id: this.createId(),
        kind: toolName,
        payload: approvalPayload.payload,
        sessionId: input.sessionId,
        status: 'pending',
        suggestedRuleJson: null,
        taskId: null,
        toolCallId: toolCall.id
      });

      this.deps.appendSessionEvent({
        approval,
        sessionId: input.sessionId,
        toolCall,
        type: 'tool.pending'
      });
      this.deps.appendSessionEvent({
        approval,
        sessionId: input.sessionId,
        type: 'approval.created'
      });

      const checkpoint = buildSessionCheckpoint({
        approvalId: approval.id,
        callId: input.functionCall.call_id,
        kind: 'waiting_approval',
        previousResponseId: input.previousResponseId,
        toolCallId: toolCall.id
      });
      const updatedSession = this.deps.updateSessionRuntimeState({
        lastCheckpoint: checkpoint,
        sessionId: input.sessionId,
        status: 'waiting_approval'
      });

      this.deps.appendSessionEvent({
        checkpoint,
        sessionId: input.sessionId,
        type: 'session.resumable'
      });

      if (updatedSession) {
        this.deps.appendSessionEvent({
          sessionId: updatedSession.id,
          type: 'session.updated',
          updatedAt: updatedSession.updatedAt
        });
      }

      return {
        checkpoint,
        kind: 'paused_for_approval'
      };
    }

    const runningToolCall = this.deps.createToolCall({
      createdAt: now,
      id: this.createId(),
      input: rawInput,
      messageId: input.assistantMessageId ?? null,
      requiresApproval: false,
      sessionId: input.sessionId,
      startedAt: now,
      status: 'running',
      taskId: null,
      toolName,
      updatedAt: now
    });

    this.deps.appendSessionEvent({
      sessionId: input.sessionId,
      toolCallId: runningToolCall.id,
      type: 'tool.running'
    });

    try {
      const prepared = await this.prepareToolExecution(
        toolName,
        rawInput,
        input.workspaceRoot
      );

      if (prepared.kind !== 'auto') {
        throw new Error('Expected auto-executed tool result.');
      }

      const completedAt = this.now();
      const completedToolCall = this.deps.updateToolCall({
        completedAt,
        id: runningToolCall.id,
        result: prepared.output,
        startedAt: now,
        status: 'completed',
        updatedAt: completedAt
      });

      if (!completedToolCall) {
        throw new Error('Failed to persist completed tool call.');
      }

      await this.createToolResultMessage({
        payload: prepared.output,
        sessionId: input.sessionId,
        toolName
      });

      this.deps.appendSessionEvent({
        sessionId: input.sessionId,
        toolCall: completedToolCall,
        type: 'tool.completed'
      });

      return {
        kind: 'continue',
        output: buildFunctionCallOutput(
          input.functionCall.call_id,
          prepared.output
        )
      };
    } catch (error) {
      const errorMessage = formatError(error);
      const payload = {
        error: errorMessage,
        ok: false
      };
      const completedAt = this.now();
      const failedToolCall = this.deps.updateToolCall({
        completedAt,
        errorText: errorMessage,
        id: runningToolCall.id,
        result: payload,
        startedAt: now,
        status: 'failed',
        updatedAt: completedAt
      });

      await this.createToolResultMessage({
        payload,
        sessionId: input.sessionId,
        toolName
      });

      this.deps.appendSessionEvent({
        error: errorMessage,
        sessionId: input.sessionId,
        toolCallId: failedToolCall?.id ?? runningToolCall.id,
        type: 'tool.failed'
      });

      return {
        kind: 'continue',
        output: buildFunctionCallOutput(input.functionCall.call_id, payload)
      };
    }
  }

  private createId() {
    return this.deps.createId?.() ?? randomUUID();
  }

  private executeApprovedTool(
    toolName: Extract<ToolName, 'run_command' | 'write_file'>,
    rawInput: Record<string, unknown>,
    workspaceRoot: string
  ) {
    return (this.deps.executeApprovedTool ?? executeApprovedTool)(
      toolName,
      rawInput,
      workspaceRoot
    );
  }

  private now() {
    return this.deps.now?.() ?? new Date().toISOString();
  }

  private parseFunctionArguments(functionCall: ResponseFunctionToolCall) {
    try {
      return JSON.parse(functionCall.arguments) as Record<string, unknown>;
    } catch {
      throw new Error(
        `Failed to parse arguments for tool ${functionCall.name}.`
      );
    }
  }

  private prepareToolExecution(
    toolName: ToolName,
    rawInput: Record<string, unknown>,
    workspaceRoot: string
  ) {
    return (this.deps.prepareToolExecution ?? prepareToolExecution)(
      toolName,
      rawInput,
      workspaceRoot
    );
  }

  private toolRequiresApproval(toolName: ToolName) {
    return (this.deps.toolRequiresApproval ?? toolRequiresApproval)(toolName);
  }
}
