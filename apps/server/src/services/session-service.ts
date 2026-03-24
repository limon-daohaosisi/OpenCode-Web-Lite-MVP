import type { MessageDto, SessionDto } from '@opencode/shared';

const sessions = new Map<string, SessionDto>([
  [
    'session-001',
    {
      createdAt: '2026-03-23T23:21:00.000Z',
      id: 'session-001',
      status: 'waiting_approval',
      title: 'Refine auth redirect behavior',
      updatedAt: '2026-03-23T23:28:00.000Z',
      workspaceId: 'local-demo'
    }
  ]
]);

const messages = new Map<string, MessageDto[]>([
  [
    'session-001',
    [
      {
        content: [
          {
            text: 'Review the auth flow and patch the redirect bug.',
            type: 'text'
          }
        ],
        createdAt: '2026-03-23T23:21:00.000Z',
        id: 'msg-user-001',
        kind: 'message',
        role: 'user',
        sessionId: 'session-001'
      }
    ]
  ]
]);

export function buildAssistantMessage(
  sessionId: string,
  content: string
): MessageDto {
  return {
    content: [{ text: content, type: 'text' }],
    createdAt: new Date().toISOString(),
    id: `msg-${Date.now()}`,
    kind: 'message',
    role: 'assistant',
    sessionId
  };
}

export const sessionService = {
  createSession(workspaceId: string, title?: string): SessionDto {
    const now = new Date().toISOString();
    const session: SessionDto = {
      createdAt: now,
      id: `session-${Date.now()}`,
      status: 'active',
      title: title || 'New session',
      updatedAt: now,
      workspaceId
    };

    sessions.set(session.id, session);
    messages.set(session.id, []);
    return session;
  },

  getSession(sessionId: string) {
    return sessions.get(sessionId);
  },

  listMessages(sessionId: string) {
    return messages.get(sessionId) ?? [];
  },

  listSessions(workspaceId: string) {
    return Array.from(sessions.values()).filter(
      (session) => session.workspaceId === workspaceId
    );
  },

  resumeSession(sessionId: string) {
    const session = sessions.get(sessionId);

    return {
      canResume: Boolean(session),
      session
    };
  }
};
