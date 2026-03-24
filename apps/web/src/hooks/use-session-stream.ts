export function useSessionStream() {
  return {
    status: 'disconnected'
  } as const;
}
