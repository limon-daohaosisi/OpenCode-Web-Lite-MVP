import { FileExplorer } from '../explorer/file-explorer';
import type { MockDetailPane } from '../../lib/mock-data';

type DetailPaneProps = {
  data: MockDetailPane;
};

const tabs: Array<MockDetailPane['activeTab']> = [
  '文件',
  'Diff',
  '输出',
  '错误',
  '产物'
];

export function DetailPane({ data }: DetailPaneProps) {
  return (
    <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ember">
          Detail Pane
        </p>
        <h2 className="mt-1 text-xl font-semibold text-ink">{data.title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{data.subtitle}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <FileExplorer selectedPath={data.selectedPath} tree={data.fileTree} />

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = tab === data.activeTab;

              return (
                <button
                  key={tab}
                  className={
                    active
                      ? 'rounded-full bg-ink px-3 py-1.5 text-sm font-semibold text-white'
                      : 'rounded-full border border-sand bg-white px-3 py-1.5 text-sm text-slate-600'
                  }
                  type="button"
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {data.pendingApproval ? (
            <article className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                    {data.pendingApproval.kind}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-amber-950">
                    {data.pendingApproval.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-amber-900">
                    {data.pendingApproval.summary}
                  </p>
                </div>
                <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                  {data.pendingApproval.risk}
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
                  type="button"
                >
                  批准
                </button>
                <button
                  className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900"
                  type="button"
                >
                  拒绝
                </button>
              </div>
            </article>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            {data.metadata.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-sand bg-mist/80 px-4 py-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 text-sm font-medium text-ink">
                  {item.value}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-[24px] border border-sand bg-mist/80 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  当前内容
                </p>
                <h3 className="mt-1 font-medium text-ink">
                  {data.contentTitle}
                </h3>
              </div>
              <span className="rounded-full border border-white bg-white/80 px-3 py-1 text-xs text-slate-500">
                {data.activeTab}
              </span>
            </div>

            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
              {data.content}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
