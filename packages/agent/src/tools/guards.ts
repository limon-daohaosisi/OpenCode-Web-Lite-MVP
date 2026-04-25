import path from 'node:path';

const blockedCommandFragments = [
  'sudo',
  'rm -rf /',
  'reboot',
  'shutdown',
  'vim',
  'nano',
  'less'
];

export function resolveWorkspacePath(
  workspaceRoot: string,
  relativePath: string
) {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(root, relativePath);

  if (!target.startsWith(root)) {
    throw new Error('Path escapes workspace root.');
  }

  return target;
}

export function assertSafeCommand(command: string) {
  if (blockedCommandFragments.some((fragment) => command.includes(fragment))) {
    throw new Error(`Blocked command: ${command}`);
  }
}
