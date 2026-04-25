export function FilePreview() {
  return (
    <div className="rounded-2xl border border-sand bg-mist p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Preview
          </p>
          <h3 className="font-medium text-ink">
            packages/agent/src/tools/run-command.ts
          </h3>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">
          utf-8
        </span>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
        {`export const runCommandToolDefinition = {
  name: 'run_command',
  description: 'Run a non-interactive shell command in the workspace.'
}

export async function runCommandTool() {
  // Guard interactive commands, enforce timeout, and stream tool output.
}`}
      </pre>
    </div>
  );
}
