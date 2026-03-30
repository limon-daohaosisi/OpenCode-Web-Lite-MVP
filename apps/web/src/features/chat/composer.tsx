type ComposerProps = {
  defaultValue: string;
  hint: string;
};

export function Composer({ defaultValue, hint }: ComposerProps) {
  return (
    <form className="mt-5 rounded-[24px] border border-sand bg-mist p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        补充要求
      </label>
      <textarea
        className="min-h-28 w-full resize-none rounded-2xl border border-white bg-white px-4 py-3 text-sm text-ink outline-none ring-0"
        defaultValue={defaultValue}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">{hint}</p>
        <button
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          type="button"
        >
          发送给 agent
        </button>
      </div>
    </form>
  );
}
