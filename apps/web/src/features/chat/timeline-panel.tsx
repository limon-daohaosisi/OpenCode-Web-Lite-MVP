import type { SessionEvent } from '@opencode/shared';

type TimelinePanelProps = {
  events: SessionEvent[];
};

function eventLabel(event: SessionEvent) {
  switch (event.type) {
    case 'message.created':
      return event.message.role;
    case 'tool.pending':
      return event.toolCall.toolName;
    case 'tool.completed':
      return event.toolCall.toolName;
    case 'approval.resolved':
      return event.decision;
    default:
      return event.type;
  }
}

function eventBody(event: SessionEvent) {
  switch (event.type) {
    case 'message.created':
      return event.message.content
        .map((part) => ('text' in part ? part.text : part.toolName))
        .join(' ');
    case 'tool.pending':
      return JSON.stringify(event.toolCall.input, null, 2);
    case 'tool.completed':
      return event.toolCall.result
        ? JSON.stringify(event.toolCall.result, null, 2)
        : 'Completed';
    case 'approval.resolved':
      return `Decision: ${event.decision}`;
    case 'session.failed':
      return event.error;
    default:
      return event.type;
  }
}

export function TimelinePanel({ events }: TimelinePanelProps) {
  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <article
          key={`${event.type}-${index}`}
          className="rounded-2xl border border-sand bg-mist p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-ember">
                {eventLabel(event)}
              </span>
              <span className="text-xs text-slate-500">{event.sessionId}</span>
            </div>
            <span className="text-xs text-slate-500">step {index + 1}</span>
          </div>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
            {eventBody(event)}
          </pre>
        </article>
      ))}
    </div>
  );
}
