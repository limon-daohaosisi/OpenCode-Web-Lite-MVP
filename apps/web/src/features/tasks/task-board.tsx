import type {
  MockSessionView,
  MockTask,
  MockTaskStatus
} from '../../lib/mock-data';

type TaskBoardProps = {
  session: MockSessionView;
};

function statusLabel(status: MockTaskStatus) {
  switch (status) {
    case 'draft':
      return '草稿';
    case 'todo':
      return '待执行';
    case 'running':
      return '进行中';
    case 'blocked':
      return '已阻塞';
    case 'done':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status;
  }
}

function statusClassName(status: MockTaskStatus) {
  switch (status) {
    case 'draft':
      return 'bg-stone-100 text-stone-700';
    case 'todo':
      return 'bg-slate-100 text-slate-700';
    case 'running':
      return 'bg-amber-100 text-amber-800';
    case 'blocked':
      return 'bg-rose-100 text-rose-700';
    case 'done':
      return 'bg-emerald-100 text-emerald-700';
    case 'failed':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function TaskCard({
  task,
  index,
  mode
}: {
  index: number;
  mode: MockSessionView['mode'];
  task: MockTask;
}) {
  return (
    <article className="rounded-[24px] border border-sand bg-mist/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            任务 {index + 1}
          </p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            {task.title}
          </h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(task.status)}`}
        >
          {statusLabel(task.status)}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        {task.description}
      </p>

      <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          验收标准
        </p>
        <p className="mt-1 leading-6">{task.acceptance}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <span className="rounded-full border border-white bg-white/80 px-3 py-1.5">
          {task.summary}
        </span>
        {task.evidenceSummary ? (
          <span className="rounded-full border border-white bg-white/80 px-3 py-1.5">
            {task.evidenceSummary}
          </span>
        ) : null}
        {task.pendingApproval ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-800">
            {task.pendingApproval} 个待审批动作
          </span>
        ) : null}
        {mode === 'planning' ? (
          <button
            className="rounded-full border border-sand bg-white px-3 py-1.5 font-medium text-ink"
            type="button"
          >
            编辑任务
          </button>
        ) : null}
      </div>
    </article>
  );
}

export function TaskBoard({ session }: TaskBoardProps) {
  const isPlanning = session.mode === 'planning';

  return (
    <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
            {isPlanning ? '规划阶段' : '执行阶段'}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-ink">
            {session.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {session.goal}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-sand bg-mist px-3 py-1.5 text-sm text-slate-700">
            {session.progressLabel}
          </span>
          {isPlanning ? (
            <>
              <button
                className="rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-ink"
                type="button"
              >
                重新生成
              </button>
              <button
                className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                type="button"
              >
                确认计划
              </button>
            </>
          ) : (
            <button
              className="rounded-full border border-sand bg-white px-4 py-2 text-sm font-semibold text-ink"
              type="button"
            >
              重试当前任务
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-4">
          {session.tasks.map((task, index) => (
            <TaskCard
              key={task.id}
              index={index}
              mode={session.mode}
              task={task}
            />
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[24px] border border-sand bg-mist/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              当前摘要
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {session.summary}
            </p>
          </section>

          <section className="rounded-[24px] border border-sand bg-mist/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Planner Notes
            </p>
            <div className="mt-3 space-y-3">
              {session.plannerNotes.map((note) => (
                <div
                  key={note}
                  className="rounded-2xl bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700"
                >
                  {note}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
