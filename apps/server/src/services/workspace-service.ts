import path from 'node:path';
import type { WorkspaceDto } from '@opencode/shared';

const workspaces = new Map<string, WorkspaceDto>([
  [
    'local-demo',
    {
      id: 'local-demo',
      lastOpenedAt: '2026-03-23T23:30:00.000Z',
      name: 'OpenCode Web Lite MVP',
      rootPath: '/Users/demo/opencode-lite',
      updatedAt: '2026-03-23T23:30:00.000Z'
    }
  ]
]);

const sampleTree = [
  {
    children: [
      { name: 'src', type: 'directory' },
      { name: 'package.json', type: 'file' }
    ],
    name: 'apps',
    type: 'directory'
  }
];

export const workspaceService = {
  createWorkspace(rootPath: string): WorkspaceDto {
    const now = new Date().toISOString();
    const id = path.basename(rootPath) || `workspace-${workspaces.size + 1}`;

    const workspace: WorkspaceDto = {
      id,
      lastOpenedAt: now,
      name: path.basename(rootPath) || rootPath,
      rootPath,
      updatedAt: now
    };

    workspaces.set(id, workspace);
    return workspace;
  },

  getTree(_workspaceId?: string) {
    return sampleTree;
  },

  listWorkspaces() {
    return Array.from(workspaces.values());
  }
};
