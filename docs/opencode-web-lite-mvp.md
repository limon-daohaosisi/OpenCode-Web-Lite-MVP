# OpenCode Web Lite MVP 方案

Status: Draft

Owner: 个人简历项目

> 一个 2 周内可落地的 plan-and-execute AI agent Web 项目方案。co-authored by GPT-5

## 1. 项目目标

做一个 `OpenCode Web Lite`，核心能力是：

- 在浏览器里连接一个本地 workspace
- 用户输入一个复杂目标后，agent 先生成执行计划，再按子任务推进
- 每个子任务都有状态、证据和可回放的执行轨迹
- 高风险动作需要用户确认，但审批只是执行护栏，不是主界面中心
- 支持会话恢复、失败重试、关键产物查看

这个项目的目标不是完整复刻 OpenCode，也不是做一个泛化项目管理工具，而是做一个简历上讲得清楚、能现场演示、工程闭环完整的 agent work console MVP。

## 2. 简历表述

推荐对外描述：

> 基于 React + Hono + Node.js 实现本地优先的 AI agent 执行控制台，支持复杂目标拆解、子任务状态跟踪、受控文件编辑、命令执行回放与会话恢复。

可展开的技术点：

- 设计并实现 plan-and-execute agent loop，支持复杂目标拆解与顺序执行
- 使用 SSE 推送任务状态、工具结果和结构化运行事件
- 实现 workspace 沙箱校验、命令超时、路径越界保护和风险审批
- 通过 SQLite 持久化 session、plan、task、event、artifact 和 approval 状态

## 3. 产品特色与差异化

这个项目不应只是“把 agent 放进网页里”，而应明确区别于普通聊天式 coding agent。

### 3.1 核心定位

不是一个会改代码的聊天框，也不是一个轻量 Jira，而是一个管理 agent 规划、执行、恢复和回放过程的控制台。

这个定位下，产品主对象不是单条消息，而是一次完整的 `goal -> plan -> task -> event -> artifact` 执行链路。用户真正需要看到的是：

- 这个复杂目标被拆成了什么
- 现在在做哪个子任务，为什么
- 哪些步骤完成了，哪些卡住了
- 当前 run 产出了什么证据
- 失败后如何继续，而不是重新开聊

### 3.2 四个差异化特性

#### A. Goal-to-Plan

目标：用户提交一个复杂目标后，agent 先生成可确认的执行计划，而不是直接开始堆聊天和工具调用。

基础版需要包含：

- 用户输入 `goal`
- agent 生成 3 到 8 个一级子任务
- 每个子任务包含 `title / description / acceptance criteria`
- 用户可确认计划后再进入执行

为什么重要：

- 复杂任务首先要解决“做什么”，其次才是“怎么做”
- 计划先行，能显著提升 agent 行为的可预测性

#### B. Task Execution Board

目标：把复杂任务拆解后的执行状态可视化，而不是让用户在长消息流里自己推断进度。

基础版需要包含：

- 子任务列表
- 每个任务都有状态、顺序和摘要
- 当前执行任务高亮
- 阻塞、等待审批、失败、完成等状态清晰可见

为什么重要：

- Timeline 回答“发生了什么”
- Task Board 回答“现在做到哪了，还剩什么”

#### C. Execution Timeline

目标：把一次 agent run 结构化为可回放的执行时间线，而不是散落在聊天里的消息。

基础版需要包含：

- user / planner / assistant / task / tool / approval / error 事件按时间排序建模
- 时间线默认只展示关键步骤和状态变化
- 点击某一步可联动查看 diff、命令输出、错误详情或关联产物
- 连续低价值事件默认折叠，例如重复 read/search

为什么重要：

- 普通聊天产品只能看“说了什么”
- execution timeline 让用户看见“为什么在做这个，以及具体做了什么”

#### D. Resume and Review

目标：让 session 在失败、中断或刷新后可以继续，并且能回放关键结果。

基础版需要包含：

- session 状态持久化
- 上次停留任务、失败原因和待处理动作
- 支持从最后一个失败任务重试
- 支持查看关键产物摘要

为什么重要：

- 真正开发里失败是常态
- session-first agent 产品必须具备连续性和可审阅性

## 4. 分阶段规划

这个项目的重点不是铺很多页面，而是先把最核心的执行链路跑通。

### 4.1 Phase 1: 2 周 MVP

必须保住：

- Goal-to-Plan 基础版
- Task Execution Board 基础版
- Execution Timeline 基础版
- 单 workspace + session 持久化
- `read_file` / `write_file` / `run_command`
- 轻量 Pending Approvals

说明：

- 这是产品心智的底座
- 如果没有 plan 和 task，这个项目仍然容易看起来像普通 chat + tools demo

### 4.2 Phase 1.5: MVP 后快速补强

建议在 MVP 后第一时间补：

- Resume From Failure 轻量版
- 失败任务重试
- 计划微调或局部重规划
- 更明确的 artifact 关联视图

说明：

- 首版不做复杂分叉历史和多版本计划
- 只做“从失败任务继续”和“局部重试”就足够体现价值

### 4.3 Phase 2: 差异化增强

建议放到下一阶段：

- Shareable Run Review
- Eval Runner
- Benchmark Dashboard
- 更强的 artifact 展示
- Git diff 面板

说明：

- 分享、评测和展示能力都依赖 plan、task、event、artifact 先稳定建模
- 过早实现容易返工

## 5. MVP 范围

### 5.1 P0 必做

- 单 workspace 接入
- session 列表和新建 session
- 复杂目标输入区
- plan 生成与确认：
  - 生成 3 到 8 个一级子任务
  - 显示任务标题、描述、验收标准
- Task Execution Board 基础版：
  - 展示任务列表和当前状态
  - 高亮当前正在执行的任务
- Execution Timeline 基础版：
  - 按时间展示关键事件
  - 可定位到当前步骤
- 文件树浏览和文件内容预览
- 右侧 detail pane：
  - diff
  - stdout / stderr
  - error detail
  - artifact summary
- 三个工具：
  - `read_file`
  - `write_file`
  - `run_command`
- 轻量审批流：
  - `read_file` 自动执行
  - `write_file` 先看 diff，再确认写入
  - `run_command` 先看命令与风险提示，再确认执行
- tool result 和任务状态联动回写
- session 持久化，刷新后可恢复
- 安全约束：
  - 只允许操作 workspace 内的文件
  - 命令执行超时
  - 禁止交互式命令

### 5.2 P1 应该做

- workspace 最近访问记录
- 会话搜索或按更新时间排序
- stdout / stderr 分开展示
- artifact 与任务的关联跳转
- 失败任务重试
- Resume From Failure 轻量版：
  - 标记失败任务
  - 支持从最后一步继续
  - 支持重新规划未完成任务
- task 卡片显示耗时、状态和错误摘要

### 5.3 P2 可砍项

- 分享只读回放链接
- Shareable Run Review 页面
- Eval Runner
- Benchmark Dashboard
- Git diff 面板
- 多 workspace 切换
- 并行 agent

## 6. 非目标

以下内容不进入 2 周 MVP：

- 多 agent 并行协作
- 完整项目管理工具能力
- 复杂依赖图可视编辑
- OAuth provider 管理
- 云端容器沙箱
- LSP 深度集成
- 实时协同编辑
- 完整 IDE 替代

## 7. 技术选型

### 7.1 总体原则

这个项目应该优先选择“本地能力自然支持”的栈，不要为了模仿生产形态而牺牲开发速度。

### 7.2 前端

- React
- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- `react-diff-viewer` 或 Monaco Diff Editor

说明：

- 任务板、时间线和文件预览都适合 React SPA
- TanStack Query 用来缓存 session、plan、task、文件树、文件内容和审批状态
- 首版用成熟 diff 组件即可，不需要自己画复杂变更视图

### 7.3 后端

- Node.js 20+
- Hono
- SSE
- `better-sqlite3` 或 `libsql`

说明：

- 不建议用 Cloudflare Workers 做这个项目
- 核心原因是本地文件系统和命令执行天然属于 Node 场景

### 7.4 模型接入

优先级建议：

1. OpenAI Responses API
2. Anthropic Messages API
3. 统一适配层，后续再扩 provider

MVP 不做 provider 管理，只保留环境变量注入的单一 provider。

## 8. 系统架构

```text
Browser
  ├─ Session List
  ├─ Goal + Plan Board
  ├─ Task Timeline
  └─ Detail Pane (Diff / Output / Error / File Preview)
       │
       ▼
Hono API (Node.js)
  ├─ Sessions API
  ├─ Workspace API
  ├─ Plans API
  ├─ Tasks API
  ├─ Files API
  ├─ Agent API
  ├─ Approvals API
  └─ SSE Event Stream
       │
       ├─ SQLite
       ├─ Local FS
       └─ Child Process Runner
```

### 8.1 Agent Loop

后端维护一个简化但完整的 plan-and-execute loop：

1. 接收用户目标
2. 创建 session / run
3. 调用模型生成初始计划
4. 落库 plan 和 tasks，并推送给前端
5. 用户确认计划后，agent 选择下一个 `ready` 任务执行
6. 如果模型请求工具：
   - 记录 `tool_call`
   - 必要时生成 `approval`
   - 通过 SSE 推送前端
7. 用户批准后执行工具
8. 将工具结果写回上下文，并关联到当前任务
9. 更新任务状态和 artifact
10. 继续执行下一个任务，直到完成、失败或阻塞

这个 loop 已经足够体现“planning + tool orchestration + approval gate + task state machine”的核心价值。

### 8.2 运行时建模原则

为了支持 task board、timeline replay、resume 和后续评测，后端不应只存 message，而应存完整 run 过程中的结构化对象。

最小建模原则：

- session 表示一次复杂目标执行
- plan 表示本轮任务拆解
- task 表示可跟踪、可恢复的子任务单元
- event 用于驱动 timeline 和 replay
- artifact 用于承载 diff、命令输出、错误摘要和最终结果
- approval 只是风险动作的决策对象，不是产品主对象

## 9. 页面设计

### 9.1 页面清单

- `/`
  - 连接或选择 workspace
  - 展示最近工作区
- `/workspace/:workspaceId/session/:sessionId`
  - 主工作台
  - 包含 Plan Board + Timeline + Detail Pane

### 9.2 主工作台线框

```text
+--------------------------------------------------------------------------------------------------+
| Top Bar: workspace name | model | reconnect status | new session                                |
+----------------------+--------------------------------------+----------------------------------------+
| Session List         | Plan + Task Board                    | Detail Pane                            |
|                      |                                      |                                        |
| - Add login          | Goal: add auth flow and tests        | files                                  |
| - Fix build          |                                      | ├─ src                                 |
| - Improve docs       | Plan                                 | ├─ package.json                        |
|                      | 1. Inspect auth entry      done      | └─ README.md                           |
|                      | 2. Implement login UI     running    |                                        |
|                      | 3. Add API handler        todo       | detail                                 |
|                      | 4. Add tests              blocked    | -------------------------------------- |
|                      |                                      | diff / stdout / stderr / error         |
|                      | Timeline                             | file preview / artifact summary        |
|                      | [Task started]                       |                                        |
|                      | [Tool] read_file ...                 |                                        |
|                      | [Approval] write_file pending        |                                        |
+----------------------+--------------------------------------+----------------------------------------+
```

补充说明：

- 中间列上半部分是 Task Board，下半部分是执行时间线
- 聊天仍然存在，但作为任务执行的叙述层，不再是唯一主视图
- 右侧 detail pane 始终服务于当前选中任务或时间线事件

### 9.3 关键交互

#### A. 连接 workspace

1. 用户输入本地绝对路径
2. 后端校验目录存在且可访问
3. 建立 workspace 记录
4. 跳转到该 workspace 的首个 session

#### B. 创建复杂任务

1. 用户输入一个复杂目标
2. 后端调用模型生成计划
3. 前端显示 plan draft 和子任务列表
4. 用户确认计划后进入执行

#### C. agent 执行子任务

1. 系统选中当前 `ready` 任务
2. 模型返回消息或工具调用
3. 工具结果被关联到该任务
4. 任务状态更新为 `running / blocked / completed / failed`
5. Timeline 和 Detail Pane 同步刷新

#### D. agent 发起高风险动作

1. 模型返回 `write_file` 或 `run_command`
2. 后端生成审批对象，不立即执行
3. 前端在任务上下文中展示审批卡片
4. 用户批准后执行
5. 回传结果并继续当前任务

## 10. 数据模型

MVP 直接用 SQLite 即可。

### 10.1 workspaces

```sql
CREATE TABLE workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  root_path TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_opened_at TEXT NOT NULL
);
```

字段说明：

- `root_path`: 本地绝对路径
- `name`: 默认取目录名，可允许用户重命名

### 10.2 sessions

```sql
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  goal_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning',
  current_plan_id TEXT,
  current_task_id TEXT,
  last_error_text TEXT,
  last_checkpoint_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

字段说明：

- `title`: 可默认用 goal 摘要生成
- `status`: `planning | executing | waiting_approval | blocked | failed | completed | archived`
- `current_plan_id`: 当前采用的 plan
- `current_task_id`: 当前正在执行或停留的任务
- `last_checkpoint_json`: 记录最近可恢复步骤摘要

### 10.3 plans

```sql
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL,
  summary_text TEXT,
  created_at TEXT NOT NULL,
  confirmed_at TEXT
);
```

字段说明：

- `status`: `draft | confirmed | superseded`
- 首版只需要单 session 下少量 plan 版本，不需要复杂分叉

### 10.4 tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  parent_task_id TEXT REFERENCES tasks(id),
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  acceptance_criteria_json TEXT,
  summary_text TEXT,
  started_at TEXT,
  completed_at TEXT,
  updated_at TEXT NOT NULL
);
```

状态建议：

- `todo`
- `ready`
- `running`
- `blocked`
- `waiting_approval`
- `done`
- `failed`

### 10.5 messages

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  task_id TEXT REFERENCES tasks(id),
  role TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'message',
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

字段说明：

- `role`: `system | user | assistant | tool`
- `task_id`: 让消息和当前任务建立关联，避免聊天脱离任务语义

### 10.6 tool_calls

```sql
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  task_id TEXT REFERENCES tasks(id),
  message_id TEXT REFERENCES messages(id),
  tool_name TEXT NOT NULL,
  input_json TEXT NOT NULL,
  status TEXT NOT NULL,
  result_json TEXT,
  error_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

状态建议：

- `pending_approval`
- `approved`
- `rejected`
- `running`
- `completed`
- `failed`

### 10.7 approvals

```sql
CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  tool_call_id TEXT NOT NULL REFERENCES tool_calls(id),
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  decided_at TEXT,
  created_at TEXT NOT NULL
);
```

字段说明：

- `kind`: `write_file | run_command`
- `payload_json`: diff、命令文本、风险提示等审批展示数据

### 10.8 artifacts

```sql
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  task_id TEXT REFERENCES tasks(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

用途：

- 存 diff 摘要、命令输出、错误摘要、最终结果等关键产物
- 为 Detail Pane 和后续分享页提供稳定数据源

### 10.9 session_events

Execution Timeline 是核心能力，建议首版就引入事件表：

```sql
CREATE TABLE session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  task_id TEXT REFERENCES tasks(id),
  type TEXT NOT NULL,
  ref_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

用途：

- 把 plan、task、message、tool、approval、失败、恢复统一映射到 timeline
- 让 replay、resume 和 review 不依赖前端临时拼装

## 11. 目录结构建议

```text
opencode-lite/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── routes/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── features/
│   │       │   ├── plans/
│   │       │   ├── tasks/
│   │       │   ├── timeline/
│   │       │   ├── approvals/
│   │       │   ├── explorer/
│   │       │   └── sessions/
│   │       └── lib/
│   └── server/
│       └── src/
│           ├── main.ts
│           ├── app.ts
│           ├── client.ts
│           ├── lib/
│           │   ├── factory.ts
│           │   ├── response.ts
│           │   └── errors.ts
│           ├── agent/
│           │   ├── loop.ts
│           │   ├── planner.ts
│           │   ├── executor.ts
│           │   ├── model-client.ts
│           │   └── events.ts
│           ├── tools/
│           │   ├── read-file.ts
│           │   ├── write-file.ts
│           │   ├── run-command.ts
│           │   ├── guards.ts
│           │   └── diff.ts
│           ├── db/
│           │   ├── schema.ts
│           │   └── client.ts
│           ├── services/
│           │   ├── workspace-service.ts
│           │   ├── session-service.ts
│           │   ├── plan-service.ts
│           │   ├── task-service.ts
│           │   └── stream-service.ts
│           └── routes/
│               ├── index.ts
│               ├── workspaces/
│               │   ├── workspaces.route.ts
│               │   ├── workspaces.handler.ts
│               │   └── workspaces.schema.ts
│               ├── sessions/
│               │   ├── sessions.route.ts
│               │   ├── sessions.handler.ts
│               │   └── sessions.schema.ts
│               ├── plans/
│               │   ├── plans.route.ts
│               │   ├── plans.handler.ts
│               │   └── plans.schema.ts
│               ├── tasks/
│               │   ├── tasks.route.ts
│               │   ├── tasks.handler.ts
│               │   └── tasks.schema.ts
│               ├── files/
│               │   ├── files.route.ts
│               │   ├── files.handler.ts
│               │   └── files.schema.ts
│               ├── agent/
│               │   ├── agent.route.ts
│               │   ├── agent.handler.ts
│               │   └── agent.schema.ts
│               └── approvals/
│                   ├── approvals.route.ts
│                   ├── approvals.handler.ts
│                   └── approvals.schema.ts
├── packages/
│   ├── shared/
│   │   └── src/
│   │       ├── dto.ts
│   │       ├── events.ts
│   │       ├── tool-types.ts
│   │       ├── approval-types.ts
│   │       └── loop-types.ts
│   └── agent-core/
│       └── src/
│           ├── prompt.ts
│           └── tool-registry.ts
└── README.md
```

目录设计原则：

- `apps/web` 只关心页面和交互
- `apps/server` 只关心 API、本地能力和 agent 调度
- `packages/shared` 放前后端共享类型
- `packages/agent-core` 放 prompt、planner、executor、tool schema 和 loop 抽象

## 12. API 设计

### 12.1 Workspace

- `POST /api/workspaces`
- `GET /api/workspaces`
- `GET /api/workspaces/:workspaceId/tree`

### 12.2 Sessions

- `POST /api/sessions`
- `GET /api/sessions?workspaceId=...`
- `GET /api/sessions/:sessionId`
- `POST /api/sessions/:sessionId/resume`

### 12.3 Plans and Tasks

- `POST /api/sessions/:sessionId/plan`
- `POST /api/plans/:planId/confirm`
- `GET /api/sessions/:sessionId/tasks`
- `PATCH /api/tasks/:taskId`
- `POST /api/tasks/:taskId/retry`

### 12.4 Files

- `GET /api/files/content?workspaceId=...&path=...`
- `GET /api/files/search?workspaceId=...&q=...`

### 12.5 Agent

- `POST /api/sessions/:sessionId/messages`
- `GET /api/sessions/:sessionId/stream`

### 12.6 Approvals

- `POST /api/approvals/:approvalId/approve`
- `POST /api/approvals/:approvalId/reject`

### 12.7 Review

- `GET /api/reviews/:sessionId`

说明：

- 这个接口属于 Phase 2，用于分享页或只读 review 页

## 13. SSE 事件模型

前端不直接轮询 message 列表，而是订阅 session 事件流。

### 13.1 建议事件类型

```ts
type SessionEvent =
  | { type: 'session.created'; sessionId: string }
  | { type: 'goal.received'; sessionId: string; goal: string }
  | { type: 'plan.created'; sessionId: string; plan: PlanDto }
  | { type: 'plan.confirmed'; sessionId: string; planId: string }
  | { type: 'task.created'; sessionId: string; task: TaskDto }
  | { type: 'task.updated'; sessionId: string; task: TaskDto }
  | { type: 'task.started'; sessionId: string; taskId: string }
  | { type: 'task.blocked'; sessionId: string; taskId: string; reason: string }
  | { type: 'task.completed'; sessionId: string; taskId: string }
  | { type: 'task.failed'; sessionId: string; taskId: string; error: string }
  | {
      type: 'message.delta';
      sessionId: string;
      messageId: string;
      delta: string;
    }
  | {
      type: 'approval.created';
      sessionId: string;
      taskId?: string;
      approval: ApprovalDto;
    }
  | {
      type: 'approval.resolved';
      sessionId: string;
      approvalId: string;
      decision: 'approved' | 'rejected';
    }
  | { type: 'tool.running'; sessionId: string; toolCallId: string }
  | { type: 'tool.completed'; sessionId: string; toolCall: ToolCallDto }
  | {
      type: 'tool.failed';
      sessionId: string;
      toolCallId: string;
      error: string;
    }
  | { type: 'artifact.created'; sessionId: string; artifact: ArtifactDto }
  | { type: 'session.failed'; sessionId: string; error: string }
  | { type: 'session.resumable'; sessionId: string; checkpoint: unknown }
  | { type: 'session.completed'; sessionId: string };
```

说明：

- `plan.created` / `plan.confirmed` 驱动计划视图
- `task.*` 负责驱动 Task Board
- `message.delta` 负责流式文本展示
- `artifact.created` 负责刷新 Detail Pane
- `approval.*` 是风险动作的补充事件，而不是主时间线唯一重心

## 14. Tool Schema

首版只做三个工具。

### 14.1 `read_file`

```json
{
  "name": "read_file",
  "description": "Read a UTF-8 text file inside the current workspace.",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Relative path from the workspace root."
      }
    },
    "required": ["path"],
    "additionalProperties": false
  }
}
```

### 14.2 `write_file`

```json
{
  "name": "write_file",
  "description": "Replace a UTF-8 text file inside the current workspace. Requires user approval.",
  "input_schema": {
    "type": "object",
    "properties": {
      "path": {
        "type": "string",
        "description": "Relative path from the workspace root."
      },
      "content": {
        "type": "string",
        "description": "Full next content of the file."
      }
    },
    "required": ["path", "content"],
    "additionalProperties": false
  }
}
```

### 14.3 `run_command`

```json
{
  "name": "run_command",
  "description": "Run a non-interactive shell command in the workspace. Requires user approval.",
  "input_schema": {
    "type": "object",
    "properties": {
      "command": {
        "type": "string",
        "description": "A single shell command executed in the workspace root."
      }
    },
    "required": ["command"],
    "additionalProperties": false
  }
}
```

## 15. 首版 System Prompt

下面这版 prompt 足够用于 MVP：

```txt
You are a coding agent working inside a local project workspace.

Your job is to help the user complete a complex goal by planning first, then executing tasks step by step.

You have access to these tools:
- read_file
- write_file
- run_command

Rules:
1. When the user gives a complex goal, first produce a concise task plan before executing.
2. Break the work into 3-8 concrete tasks with clear outcomes.
3. Prefer reading relevant files before making changes.
4. Never assume file contents that you have not read.
5. Use write_file only when you are confident about the full replacement content.
6. Use run_command only for non-interactive development commands.
7. Keep answers concise and action-oriented.
8. If a task is ambiguous, ask one focused clarifying question.
9. Do not attempt to access files outside the workspace.
10. Do not use commands that are destructive, interactive, or unrelated to the user's goal.
11. Mark a task as completed only when there is evidence from tool output or a concrete result.

When you need to inspect code, use tools instead of guessing.
When you finish a task, summarize what changed or what blocked progress.
```

## 16. 服务端安全约束

这是 MVP 的关键卖点之一，必须明确实现。

### 16.1 Workspace Guard

- 所有文件路径先转绝对路径
- 绝对路径必须以 workspace root 为前缀
- 拒绝符号链接越界
- 二进制文件默认不允许写入

### 16.2 Command Guard

- 固定 `cwd = workspaceRoot`
- 超时默认 `15s`
- 最大输出长度限制，例如 `32KB`
- 禁止命令关键词：
  - `sudo`
  - `rm -rf /`
  - `reboot`
  - `shutdown`
  - `vim`
  - `nano`
  - `less`

### 16.3 Approval Gate

- `read_file` 可直接执行
- `write_file` 必须审批
- `run_command` 必须审批
- 审批必须记录到数据库，便于回放和调试

## 17. 2 周排期

### 第 1 周

1. Day 1：初始化 monorepo，建好 web/server/shared/agent-core
2. Day 2：落 SQLite schema，跑通 workspace + session CRUD
3. Day 3：完成 goal 输入、plan draft 和 task list 骨架
4. Day 4：接通模型调用和 SSE 事件流
5. Day 5：实现 `read_file`
6. Day 6：实现 `write_file` + diff 审批
7. Day 7：实现 `run_command` + 结果回显

### 第 2 周

1. Day 8：补 task 状态流转和 timeline
2. Day 9：补路径守卫、命令超时、错误处理
3. Day 10：打磨 UI，包括 task board 和 detail pane
4. Day 11：补核心测试
5. Day 12：写 README、录 demo、整理截图
6. Day 13：修 bug
7. Day 14：整理简历和面试讲稿

## 18. 最小测试清单

### 18.1 后端单测

- workspace path 越界时拒绝访问
- `write_file` 未审批不能执行
- `run_command` 超时会终止
- tool result 会正确关联到当前任务
- task 状态流转正确
- session 历史重放顺序正确

### 18.2 前端测试

- plan 生成后任务列表正常渲染
- task 状态切换能正确高亮当前任务
- SSE 消息增量渲染正常
- 审批写文件后 diff 消失并刷新预览
- 刷新页面后能恢复当前 session、plan 和 task 状态

## 19. Demo 脚本

面试演示建议按这个顺序：

1. 连接本地仓库作为 workspace
2. 新建 session，输入一个复杂目标
3. 展示 agent 自动生成的 plan 和子任务列表
4. 确认计划，展示 agent 开始执行某个任务
5. 展示 diff 审批
6. 让 agent 执行一个测试命令
7. 展示 task board、timeline 和 detail pane 的联动
8. 刷新页面，证明 session 可以恢复

## 20. 后续演进方向

MVP 完成后，可以按下面顺序升级：

1. 增加 `list_files` 和 `search_files`
2. 支持补丁级写入而不是整文件替换
3. 增加 Git 变更面板
4. 支持 provider 抽象和模型切换
5. 增加只读分享回放页
6. 增加 Eval Runner
7. 增加 Benchmark Dashboard

## 21. 开工顺序建议

如果明天开始做，建议按这个顺序推进：

1. 先做 SQLite schema 和 session/workspace API
2. 再做 plan/task 数据模型和页面骨架
3. 再做文件树和文件内容预览
4. 再接 SSE 事件流
5. 最后接 tool loop 和 approval gate

原因很简单：

- 先把“任务工作台骨架”搭起来，后面 agent 只是在现有 UI 里填能力
- 先做 tool loop 容易卡在 prompt 或模型细节，影响整体推进
