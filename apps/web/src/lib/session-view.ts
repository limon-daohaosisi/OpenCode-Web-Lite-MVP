import type {
  ResumeSessionDto,
  SessionDto,
  WorkspaceDto
} from '@opencode/shared';
import type { WorkspaceTreeNodeDto } from './api';
import type {
  MockDetailPane,
  MockFileNode,
  MockSessionView
} from './mock-data';
import { sampleSessions } from './mock-data';

function joinTreePath(parentPath: string, name: string) {
  return parentPath.endsWith('/')
    ? `${parentPath}${name}`
    : `${parentPath}/${name}`;
}

function truncateText(value: string, maxLength: number) {
  const normalizedValue = value.trim().replace(/\s+/gu, ' ');

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit'
  });
}

function getSessionMode(status: SessionDto['status']): MockSessionView['mode'] {
  return status === 'planning' ? 'planning' : 'executing';
}

function getSessionProgressLabel(status: SessionDto['status']) {
  switch (status) {
    case 'planning':
      return '等待规划阶段接入';
    case 'executing':
      return '执行中';
    case 'waiting_approval':
      return '等待审批';
    case 'blocked':
      return '已阻塞';
    case 'failed':
      return '执行失败';
    case 'completed':
      return '已完成';
    case 'archived':
      return '已归档';
    default:
      return status;
  }
}

function getSessionSummary(session: SessionDto) {
  if (session.lastErrorText) {
    return session.lastErrorText;
  }

  switch (session.status) {
    case 'planning':
      return '当前已接通真实 session 元信息，任务拆解与时间线仍使用占位数据。';
    case 'waiting_approval':
      return '当前会话停在待审批状态，后续将由 approval/task 数据替换占位内容。';
    case 'completed':
      return '当前会话已完成，前端已显示真实 session 状态和 workspace 文件树。';
    case 'failed':
      return '当前会话处于失败状态，错误详情已由 session current-state 返回。';
    default:
      return '当前会话已接通真实 workspace/session CRUD，其余执行态内容仍为原型占位。';
  }
}

function getSelectedPath(fileTree: MockFileNode[], rootPath: string) {
  return fileTree[0]?.path ?? rootPath;
}

function getCheckpointPreview(resumeState?: ResumeSessionDto) {
  if (!resumeState?.checkpoint) {
    return 'Day 2 已接通 session CRUD 与 workspace 文件树。执行日志、任务流和审批细节将在后续阶段替换当前占位内容。';
  }

  try {
    return JSON.stringify(JSON.parse(resumeState.checkpoint), null, 2);
  } catch {
    return resumeState.checkpoint;
  }
}

function getCheckpointTitle(resumeState?: ResumeSessionDto) {
  return resumeState?.checkpoint ? 'Resume checkpoint' : 'Session overview';
}

function getDetailPane(
  session: SessionDto,
  fileTree: MockFileNode[],
  resumeState?: ResumeSessionDto
): MockDetailPane {
  return {
    activeTab: '文件',
    content: getCheckpointPreview(resumeState),
    contentTitle: getCheckpointTitle(resumeState),
    fileTree,
    metadata: [
      { label: '当前状态', value: getSessionProgressLabel(session.status) },
      { label: '最近更新', value: formatTimestamp(session.updatedAt) },
      {
        label: '恢复能力',
        value: resumeState?.canResume ? '可恢复' : '不可恢复'
      }
    ],
    selectedPath: getSelectedPath(fileTree, session.workspaceId),
    subtitle:
      '真实 workspace 文件树已接通，执行细节内容后续再由 task/event 数据替换。',
    title: '会话详情'
  };
}

export function buildWorkspaceTree(
  tree: WorkspaceTreeNodeDto[],
  rootPath: string
): MockFileNode[] {
  const mapNode = (
    node: WorkspaceTreeNodeDto,
    currentPath: string
  ): MockFileNode => {
    const nodePath = currentPath || rootPath;

    return {
      children: node.children?.map((child) =>
        mapNode(child, joinTreePath(nodePath, child.name))
      ),
      name: node.name,
      path: nodePath,
      type: node.type
    };
  };

  return tree.map((node) => mapNode(node, rootPath));
}

export function buildWorkspaceDetailPane(
  workspace: WorkspaceDto,
  fileTree: MockFileNode[]
): MockDetailPane {
  return {
    activeTab: '文件',
    content: `rootPath: ${workspace.rootPath}
createdAt: ${workspace.createdAt}
updatedAt: ${workspace.updatedAt}
lastOpenedAt: ${workspace.lastOpenedAt}`,
    contentTitle: workspace.rootPath,
    fileTree,
    metadata: [
      { label: 'Workspace', value: workspace.name },
      { label: '最近打开', value: formatTimestamp(workspace.lastOpenedAt) },
      { label: '会话数', value: '请选择左侧任务' }
    ],
    selectedPath: getSelectedPath(fileTree, workspace.rootPath),
    subtitle: '先从左侧选择一个已有复杂任务，或者创建一个新的 session。',
    title: '工作区详情'
  };
}

export function buildSessionView(
  session: SessionDto,
  fileTree: MockFileNode[],
  resumeState?: ResumeSessionDto
): MockSessionView {
  const detailPane = getDetailPane(session, fileTree, resumeState);
  const template =
    getSessionMode(session.status) === 'planning'
      ? sampleSessions[0]!
      : sampleSessions[1]!;

  return {
    ...template,
    createdAt: session.createdAt,
    detailPane,
    goal: session.goalText,
    goalText: session.goalText,
    id: session.id,
    mode: getSessionMode(session.status),
    pendingApprovals: session.status === 'waiting_approval' ? 1 : 0,
    progressLabel: getSessionProgressLabel(session.status),
    status: session.status,
    summary: getSessionSummary(session),
    title: session.title,
    updatedAt: formatTimestamp(session.updatedAt),
    workspaceId: session.workspaceId,
    composerHint:
      'Day 2 仅接通 workspace/session CRUD，消息发送将在后续阶段接入。',
    composerValue: ''
  };
}

export function buildSessionExcerpt(goalText: string) {
  return truncateText(goalText, 72);
}

export function formatSessionTimestamp(timestamp: string) {
  return formatTimestamp(timestamp);
}
