import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useParams
} from '@tanstack/react-router';
import { AppShell } from './components/app-shell';
import { Composer } from './features/chat/composer';
import { TimelinePanel } from './features/chat/timeline-panel';
import { DetailPane } from './features/details/detail-pane';
import { SessionList } from './features/sessions/session-list';
import { TaskBoard } from './features/tasks/task-board';
import { useSessionStream } from './hooks/use-session-stream';
import {
  getMockSession,
  primarySession,
  sampleSessions,
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
          复杂任务优先的 agent 工作台原型，先拆解任务，再进入执行。
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          这版页面 mock 的重点不是聊天记录，而是“复杂任务列表、任务板、
          执行时间线、详情区”之间的关系。
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
            工作区路径：
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
  const { sessionId } = useParams({
    from: '/workspace/$workspaceId/session/$sessionId'
  });
  const currentSession = getMockSession(sessionId);

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
          <p className="mt-1 text-sm text-slate-600">{currentSession.title}</p>
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
        <SessionList
          currentSessionId={currentSession.id}
          sessions={sampleSessions}
        />

        <div className="space-y-4">
          <TaskBoard session={currentSession} />

          <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
                  Execution Timeline
                </p>
                <h2 className="text-lg font-semibold text-ink">执行时间线</h2>
              </div>
              <div className="rounded-full border border-sand bg-mist px-3 py-1.5 text-sm text-slate-600">
                {currentSession.pendingApprovals
                  ? `${currentSession.pendingApprovals} 个待审批动作`
                  : '当前无待审批动作'}
              </div>
            </div>

            <TimelinePanel items={currentSession.timeline} />
            <Composer
              defaultValue={currentSession.composerValue}
              hint={currentSession.composerHint}
            />
          </section>
        </div>

        <DetailPane data={currentSession.detailPane} />
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
