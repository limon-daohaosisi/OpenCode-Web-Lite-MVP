export function Composer() {
  return (
    <form className="mt-5 rounded-[24px] border border-sand bg-mist p-4">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Ask the agent
      </label>
      <textarea
        className="min-h-28 w-full resize-none rounded-2xl border border-white bg-white px-4 py-3 text-sm text-ink outline-none ring-0"
        defaultValue="Read the auth flow and prepare a safe patch."
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Future: streamed Responses API output + approval-gated tool loop.
        </p>
        <button
          className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          type="button"
        >
          Send
        </button>
      </div>
    </form>
  );
}
