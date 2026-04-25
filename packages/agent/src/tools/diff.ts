export function createUnifiedDiff(
  previousContent: string,
  nextContent: string
) {
  if (previousContent === nextContent) {
    return 'No changes';
  }

  const previousLines = previousContent.split('\n');
  const nextLines = nextContent.split('\n');
  const removed = previousLines
    .filter((line) => !nextLines.includes(line))
    .map((line) => `- ${line}`);
  const added = nextLines
    .filter((line) => !previousLines.includes(line))
    .map((line) => `+ ${line}`);

  return ['--- before', '+++ after', ...removed, ...added].join('\n');
}
