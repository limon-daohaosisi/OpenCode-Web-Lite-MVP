import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { AppShell } from './components/app-shell';
import { Composer } from './features/chat/composer';
import { TimelinePanel } from './features/chat/timeline-panel';
import { ApprovalCenter } from './features/approvals/approval-center';
import { FileExplorer } from './features/explorer/file-explorer';
import { FilePreview } from './features/explorer/file-preview';
import { SessionList } from './features/sessions/session-list';
import { useSessionStream } from './hooks/use-session-stream';
import {
  primarySession,
  sampleApprovals,
  sampleSessions,
  sampleTimeline,
  sampleTree,
  sampleWorkspace
} from './lib/mock-data';

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function HomePage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-6 py-12">
      <section className="w-full rounded-[32px] border border-white/60 bg-white/85 p-10 shadow-panel backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-ember">
          OpenCode Web Lite
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-ink">
          Local-first coding agent console skeleton for timeline replay,
          approvals, and workspace browsing.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          The monorepo is ready. The next step is wiring the real API, SQLite
          persistence, and the agent loop.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            to="/workspace/$workspaceId/session/$sessionId"
            params={{
              sessionId: primarySession.id,
              workspaceId: sampleWorkspace.id
            }}
          >
            Open Workspace
          </Link>
          <div className="rounded-full border border-sand bg-mist px-5 py-3 text-sm text-slate-600">
            Workspace root:{' '}
            <span className="font-medium text-ink">
              /Users/demo/opencode-lite
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkspacePage() {
  const stream = useSessionStream();

  return (
    <div className="min-h-screen px-4 py-4 md:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/60 bg-white/80 px-5 py-4 shadow-panel backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
            Workspace
          </p>
          <h1 className="text-xl font-semibold text-ink">
            {sampleWorkspace.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="rounded-full border border-sand bg-mist px-3 py-1.5">
            Model: {sampleWorkspace.model}
          </span>
          <span className="rounded-full border border-sand bg-mist px-3 py-1.5">
            SSE: {stream.status}
          </span>
          <Link
            className="rounded-full bg-ink px-4 py-1.5 font-semibold text-white transition hover:bg-slate-800"
            to="/"
          >
            Switch Workspace
          </Link>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_420px]">
        <SessionList sessions={sampleSessions} />

        <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
                Timeline Replay
              </p>
              <h2 className="text-lg font-semibold text-ink">Session Run</h2>
            </div>
            <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              1 pending approval
            </div>
          </div>
          <TimelinePanel events={sampleTimeline} />
          <Composer />
        </section>

        <div className="grid gap-4">
          <ApprovalCenter approvals={sampleApprovals} />
          <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
            <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
              <FileExplorer tree={sampleTree} />
              <FilePreview />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workspace/$workspaceId/session/$sessionId',
  component: WorkspacePage
});

const routeTree = rootRoute.addChildren([homeRoute, workspaceRoute]);

export const router = createRouter({
  routeTree
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
