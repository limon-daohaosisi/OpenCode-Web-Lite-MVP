import type { ResponseInputItem } from 'openai/resources/responses/responses';
import {
  sessionProcessor,
  type ProcessTurnInput,
  type ProcessorResult,
  type SessionProcessor
} from './session-processor.js';

export type RunLoopInput = ProcessTurnInput;

export type RunLoopResult =
  | {
      kind: 'completed';
      previousResponseId: string;
    }
  | {
      checkpoint: ProcessorResult extends infer T
        ? T extends { checkpoint: infer Checkpoint }
          ? Checkpoint
          : never
        : never;
      kind: 'paused_for_approval';
      previousResponseId: string;
    };

export class RunLoop {
  constructor(
    private readonly processor: SessionProcessor = sessionProcessor
  ) {}

  async run(input: RunLoopInput): Promise<RunLoopResult> {
    let currentInput: string | ResponseInputItem[] = input.input;
    let previousResponseId = input.previousResponseId ?? null;

    while (true) {
      const result = await this.processor.processTurn({
        input: currentInput,
        previousResponseId,
        sessionId: input.sessionId,
        workspaceRoot: input.workspaceRoot
      });

      if (result.kind === 'completed') {
        return result;
      }

      if (result.kind === 'paused_for_approval') {
        return result;
      }

      currentInput = result.nextInput;
      previousResponseId = result.previousResponseId;
    }
  }
}

export const runLoop = new RunLoop();
