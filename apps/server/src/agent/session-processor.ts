import { randomUUID } from 'node:crypto';
import type { MessageDto, SessionCheckpoint, ToolName } from '@opencode/shared';
import type {
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem
} from 'openai/resources/responses/responses';
import { approvalRepository } from '../repositories/approval-repository.js';
import { toolCallRepository } from '../repositories/tool-call-repository.js';
import { stringifyJsonValue } from '../lib/json.js';
import { messageService } from '../services/session/message-service.js';
import { sessionEventService } from '../services/session/session-event-service.js';
import { sessionService } from '../services/session/session-service.js';
import { buildSessionCheckpoint } from './checkpoint.js';
import { streamModelResponse } from './model-client.js';
import { prepareToolExecution, toolRequiresApproval } from './tool-executor.js';

type SessionProcessorDeps = {
  prepareToolExecution?: typeof prepareToolExecution;
  streamModelResponse?: typeof streamModelResponse;
  toolRequiresApproval?: typeof toolRequiresApproval;
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
    output: stringifyJsonValue(payload),
    type: 'function_call_output'
  };
}

export class SessionProcessor {
  constructor(private readonly deps: SessionProcessorDeps = {}) {}

  async processTurn(input: ProcessTurnInput): Promise<ProcessorResult> {
    const assistantState: AssistantMessageState = {
      message: null,
      text: ''
    };
    const stream = this.streamModelResponse({
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
        messageService.updateMessageContent(message.id, [
          {
            text: assistantState.text,
            type: 'text'
          }
        ]) ?? message;

      sessionEventService.append({
        delta: event.delta,
        messageId: message.id,
        sessionId: input.sessionId,
        type: 'message.delta'
      });
    }

    const finalResponse = await stream.finalResponse();
    const previousResponseId = finalResponse.id;

    if (assistantState.message) {
      sessionEventService.append({
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
      const updatedSession = sessionService.updateSessionRuntimeState({
        lastCheckpoint: checkpoint,
        lastErrorText: null,
        sessionId: input.sessionId,
        status: 'executing'
      });

      if (updatedSession) {
        sessionEventService.append({
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

  private async createToolResultMessage(input: {
    payload: Record<string, unknown>;
    sessionId: string;
    toolName: ToolName;
  }) {
    const message = messageService.createMessage({
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

    sessionEventService.append({
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

    const message = messageService.createMessage({
      content: [],
      role: 'assistant',
      sessionId
    });

    state.message = message;
    sessionEventService.append({
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
    const now = new Date().toISOString();
    const rawInput = this.parseFunctionArguments(input.functionCall);
    const toolName = input.functionCall.name as ToolName;

    if (!toolName) {
      throw new Error('Function tool call is missing a valid tool name.');
    }

    if (this.toolRequiresApproval(toolName)) {
      const toolCall = toolCallRepository.create({
        createdAt: now,
        id: randomUUID(),
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

      const approval = approvalRepository.create({
        createdAt: now,
        decisionReasonText: null,
        decidedAt: null,
        decidedBy: null,
        decisionScope: 'once',
        id: randomUUID(),
        kind: toolName,
        payload: approvalPayload.payload,
        sessionId: input.sessionId,
        status: 'pending',
        suggestedRuleJson: null,
        taskId: null,
        toolCallId: toolCall.id
      });

      sessionEventService.append({
        approval,
        sessionId: input.sessionId,
        toolCall,
        type: 'tool.pending'
      });
      sessionEventService.append({
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
      const updatedSession = sessionService.updateSessionRuntimeState({
        lastCheckpoint: checkpoint,
        sessionId: input.sessionId,
        status: 'waiting_approval'
      });

      sessionEventService.append({
        checkpoint,
        sessionId: input.sessionId,
        type: 'session.resumable'
      });

      if (updatedSession) {
        sessionEventService.append({
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

    const runningToolCall = toolCallRepository.create({
      createdAt: now,
      id: randomUUID(),
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

    sessionEventService.append({
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

      const completedAt = new Date().toISOString();
      const completedToolCall = toolCallRepository.update({
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

      sessionEventService.append({
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
      const completedAt = new Date().toISOString();
      const failedToolCall = toolCallRepository.update({
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

      sessionEventService.append({
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

  private streamModelResponse(
    input: Parameters<typeof streamModelResponse>[0]
  ) {
    return (this.deps.streamModelResponse ?? streamModelResponse)(input);
  }

  private toolRequiresApproval(toolName: ToolName) {
    return (this.deps.toolRequiresApproval ?? toolRequiresApproval)(toolName);
  }
}

export const sessionProcessor = new SessionProcessor();
