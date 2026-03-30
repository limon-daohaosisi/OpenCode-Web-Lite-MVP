import { Link } from '@tanstack/react-router';
import { sampleWorkspace } from '../../lib/mock-data';
import type { MockSessionView } from '../../lib/mock-data';

type SessionListProps = {
  currentSessionId: string;
  sessions: MockSessionView[];
};

function sessionStateLabel(session: MockSessionView) {
  if (session.mode === 'planning') {
    return '规划中';
  }

  if (session.status === 'waiting_approval') {
    return '待审批';
  }

  if (session.status === 'completed') {
    return '已完成';
  }

  return '执行中';
}

export function SessionList({ currentSessionId, sessions }: SessionListProps) {
  return (
    <aside className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
            Complex Tasks
          </p>
          <h2 className="text-lg font-semibold text-ink">复杂任务</h2>
        </div>
        <button className="rounded-full border border-sand bg-mist px-3 py-1.5 text-xs font-semibold text-ink">
          新建任务
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            className={
              session.id === currentSessionId
                ? 'block rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm transition'
                : 'block rounded-2xl border border-sand bg-mist p-4 transition hover:border-amber-300 hover:bg-amber-50'
            }
            to="/workspace/$workspaceId/session/$sessionId"
            params={{ sessionId: session.id, workspaceId: sampleWorkspace.id }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{session.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {session.summary}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                {session.updatedAt}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-slate-600">
                {sessionStateLabel(session)}
              </span>
              <span className="rounded-full border border-white bg-white/80 px-3 py-1.5 text-slate-600">
                {session.progressLabel}
              </span>
              {session.pendingApprovals ? (
                <span className="rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-amber-800">
                  {session.pendingApprovals} 个待审批
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
