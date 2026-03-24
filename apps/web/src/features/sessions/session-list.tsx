import { Link } from '@tanstack/react-router';
import type { SessionDto } from '@opencode/shared';
import { sampleWorkspace } from '../../lib/mock-data';

type SessionListProps = {
  sessions: SessionDto[];
};

export function SessionList({ sessions }: SessionListProps) {
  return (
    <aside className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
            Sessions
          </p>
          <h2 className="text-lg font-semibold text-ink">Recent Runs</h2>
        </div>
        <button className="rounded-full border border-sand bg-mist px-3 py-1.5 text-xs font-semibold text-ink">
          New Session
        </button>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => (
          <Link
            key={session.id}
            className="block rounded-2xl border border-sand bg-mist p-4 transition hover:border-amber-300 hover:bg-amber-50"
            to="/workspace/$workspaceId/session/$sessionId"
            params={{ sessionId: session.id, workspaceId: sampleWorkspace.id }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{session.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {session.status}
                </p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                {session.updatedAt}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
