import type {
  ApprovalDto,
  MessageDto,
  SessionDto,
  SessionEvent,
  WorkspaceDto
} from '@opencode/shared';

export const sampleWorkspace: WorkspaceDto & { model: string } = {
  id: 'local-demo',
  lastOpenedAt: '2026-03-23 23:30',
  model: 'gpt-4.1-mini',
  name: 'OpenCode Web Lite MVP',
  rootPath: '/Users/demo/opencode-lite',
  updatedAt: '2026-03-23 23:30'
};

export const sampleSessions: SessionDto[] = [
  {
    createdAt: '2026-03-23 23:01',
    id: 'session-001',
    status: 'waiting_approval',
    title: 'Refine auth redirect behavior',
    updatedAt: '2026-03-23 23:30',
    workspaceId: sampleWorkspace.id
  },
  {
    createdAt: '2026-03-23 21:48',
    id: 'session-002',
    status: 'completed',
    title: 'Inspect SSE reconnect flow',
    updatedAt: '2026-03-23 22:05',
    workspaceId: sampleWorkspace.id
  }
];

export const primarySession = sampleSessions[0]!;

const assistantMessage: MessageDto = {
  content: [
    {
      text: 'I inspected the auth routes and prepared a safe patch for the redirect handling.',
      type: 'text'
    }
  ],
  createdAt: '2026-03-23 23:24',
  id: 'msg-assistant-001',
  kind: 'message',
  role: 'assistant',
  sessionId: primarySession.id
};

export const sampleApprovals: ApprovalDto[] = [
  {
    createdAt: '2026-03-23 23:26',
    id: 'approval-001',
    kind: 'write_file',
    payload: {
      nextContentPreview: 'const redirectTarget = normalizedPath || "/"',
      path: 'apps/server/src/routes/auth.ts',
      summary: 'Normalize redirect targets before writing the new handler.'
    },
    status: 'pending',
    toolCallId: 'tool-002'
  }
];

export const primaryApproval = sampleApprovals[0]!;

export const sampleTimeline: SessionEvent[] = [
  {
    message: {
      content: [
        {
          text: 'Review the auth flow and patch the redirect bug.',
          type: 'text'
        }
      ],
      createdAt: '2026-03-23 23:21',
      id: 'msg-user-001',
      kind: 'message',
      role: 'user',
      sessionId: primarySession.id
    },
    sessionId: primarySession.id,
    type: 'message.created'
  },
  {
    message: assistantMessage,
    sessionId: primarySession.id,
    type: 'message.created'
  },
  {
    approval: primaryApproval,
    sessionId: primarySession.id,
    toolCall: {
      createdAt: '2026-03-23 23:26',
      id: 'tool-002',
      input: { path: 'apps/server/src/routes/auth.ts' },
      messageId: assistantMessage.id,
      sessionId: primarySession.id,
      status: 'pending_approval',
      toolName: 'write_file',
      updatedAt: '2026-03-23 23:26'
    },
    type: 'tool.pending'
  },
  {
    decision: 'approved',
    approvalId: primaryApproval.id,
    sessionId: primarySession.id,
    type: 'approval.resolved'
  },
  {
    sessionId: primarySession.id,
    toolCall: {
      createdAt: '2026-03-23 23:28',
      id: 'tool-002',
      input: { path: 'apps/server/src/routes/auth.ts' },
      messageId: assistantMessage.id,
      result: { bytesWritten: 412, path: 'apps/server/src/routes/auth.ts' },
      sessionId: primarySession.id,
      status: 'completed',
      toolName: 'write_file',
      updatedAt: '2026-03-23 23:28'
    },
    type: 'tool.completed'
  }
];

export const sampleTree = [
  {
    children: [
      { name: 'main.ts', type: 'file' as const },
      {
        children: [
          { name: 'run-command.ts', type: 'file' as const },
          { name: 'write-file.ts', type: 'file' as const }
        ],
        name: 'tools',
        type: 'directory' as const
      }
    ],
    name: 'apps',
    type: 'directory' as const
  },
  { name: 'package.json', type: 'file' as const },
  { name: 'README.md', type: 'file' as const }
];
