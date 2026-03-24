import type { PropsWithChildren } from 'react';

export function AppShell({ children }: PropsWithChildren) {
  return <div className="min-h-screen text-ink">{children}</div>;
}
