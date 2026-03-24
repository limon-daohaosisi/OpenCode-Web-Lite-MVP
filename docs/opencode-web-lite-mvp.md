# OpenCode Web Lite MVP 方案

Status: Draft

Owner: 个人简历项目

> 一个 2 周内可落地的 AI coding agent Web 项目方案。co-authored by GPT-5

## 1. 项目目标

做一个 `OpenCode Web Lite`，核心能力是：

- 在浏览器里连接一个本地 workspace
- 和 AI agent 对话，让 agent 帮你读代码、改代码、执行命令
- 所有写文件和跑命令都经过用户审批
- 支持会话恢复、消息历史、工具结果展示

这个项目的目标不是完整复刻 OpenCode，而是做一个简历上讲得清楚、能现场演示、工程闭环完整的 MVP。

## 2. 简历表述

推荐对外描述：

> 基于 React + Hono + Node.js 实现本地优先的 AI coding agent Web 控制台，支持代码浏览、受控文件编辑、命令执行、会话恢复和 diff 审批。

可展开的技术点：

- 设计并实现带审批机制的 tool-calling 流程
- 使用 SSE 推送流式 agent 事件和工具执行状态
- 实现 workspace 沙箱校验、命令超时和路径越界保护
- 通过 SQLite 持久化 session、message、tool call 和 approval 状态

## 3. 产品特色与差异化

这个项目不应只是“把 agent 放进网页里”，而应明确区别于普通聊天式 coding agent。

### 3.1 核心定位

不是一个会改代码的聊天框，而是一个管理 agent 工作过程的控制台。

这个定位下，产品主对象不是单条消息，而是一次完整的 session / run。用户需要看到的重点是：

- 这次任务做了什么
- 哪些高风险动作等待我决策
- 失败后如何继续
- 完成后如何回放和分享

### 3.2 四个差异化特性

#### A. Timeline Replay

目标：把一次 agent run 结构化为可回放的时间线，而不是散落在聊天里的消息。

基础版需要包含：

- user / assistant / tool / approval 事件按时间排序展示
- 每一步都有状态、时间和关联对象
- 点击某一步可联动查看 diff、命令输出或错误详情

为什么重要：

- 普通聊天产品只能看“说了什么”
- timeline replay 让用户看见“做了什么”

#### B. Approval Center

目标：把审批从聊天气泡里的临时按钮，升级为独立的决策面板。

基础版需要包含：

- 单独的 pending approvals 区域
- 命令审批展示 `command / cwd / reason / risk`
- 写文件审批展示 `file path / diff / summary`
- 审批结果持久化并进入 timeline

为什么重要：

- 它不是按钮换位置，而是把高风险动作变成正式工作流对象
- 用户可以集中处理待审批动作，而不是在消息流里逐条点确认

#### C. Resume From Failure

目标：让 session 在失败或中断后可以继续，而不是重新开聊。

基础版需要包含：

- session 状态持久化
- 显示上次停留步骤和失败原因
- 支持从最后一步继续，或重试失败工具

为什么重要：

- 真正开发里失败是常态
- session-first 产品必须有连续性，而不是一次性对话

#### D. Shareable Run Review

目标：分享的不是纯聊天记录，而是一次 agent run 的可审阅页面。

基础版可以包含：

- session 元信息
- timeline
- approvals
- 最终 diff 或关键产物摘要

为什么重要：

- 它让这类产品从个人助手变成协作工件
- 很适合面试演示和团队 review

## 4. 分阶段规划

这 4 个特性应该写进整体方案，但不适合全部压进 2 周 MVP。

### 4.1 Phase 1: 2 周 MVP

必须保住：

- Timeline Replay 基础版
- Approval Center 基础版
- 单 workspace + session 持久化
- `read_file` / `write_file` / `run_command`

说明：

- 这是产品心智的底座
- 如果没有 timeline 和 approval，这个项目仍然容易看起来像普通 chat + tools demo

### 4.2 Phase 1.5: MVP 后快速补强

建议在 MVP 后第一时间补：

- Resume From Failure 轻量版
- 更清晰的 session 状态标记
- 失败步骤重试

说明：

- 首版不做复杂快照回滚和分叉恢复
- 只做“从最后一步继续”与“重试失败工具”就足够体现价值

### 4.3 Phase 2: 差异化增强

建议放到下一阶段：

- Shareable Run Review
- 只读分享链接
- 更完整的 artifact 展示
- Git diff 面板

说明：

- 分享功能依赖 timeline、approval 和 artifact 数据先稳定建模
- 过早实现容易返工

## 5. MVP 范围

### 5.1 P0 必做

- 单 workspace 接入
- session 列表和新建 session
- Timeline Replay 基础版：
  - 按时间展示消息、tool call、approval、结果
  - 可定位到当前步骤
- Approval Center 基础版：
  - 集中展示 pending approvals
  - 命令审批显示 `command / cwd / risk / reason`
  - 写文件审批显示 diff
- 文件树浏览和文件内容预览
- Chat UI，支持流式输出
- 三个工具：
  - `read_file`
  - `write_file`
  - `run_command`
- 审批流：
  - `write_file` 先看 diff，再确认写入
  - `run_command` 先看命令，再确认执行
- tool result 回写消息流
- session 持久化，刷新后可恢复
- 安全约束：
  - 只允许操作 workspace 内的文件
  - 命令执行超时
  - 禁止交互式命令

### 5.2 P1 应该做

- workspace 最近访问记录
- 会话搜索或按更新时间排序
- stdout / stderr 分开展示
- 文件写入后右侧预览自动刷新
- 工具卡片显示耗时、状态、错误摘要
- Resume From Failure 轻量版：
  - 标记失败步骤
  - 支持从最后一步继续
  - 支持重试失败工具

### 5.3 P2 可砍项

- 分享只读回放链接
- Shareable Run Review 页面
- Git diff 面板
- 多 workspace 切换
- 一键应用补丁
- 并行 agent

## 6. 非目标

以下内容不进入 2 周 MVP：

- 多 agent 并行协作
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

- 聊天页和文件浏览页都适合 React SPA
- TanStack Query 用来缓存 session、文件树、文件内容、审批状态
- 首版用成熟 diff 组件即可，不需要自己画 diff

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
  ├─ Chat Thread
  ├─ Approval Panel
  └─ File Explorer / Preview / Diff
       │
       ▼
Hono API (Node.js)
  ├─ Sessions API
  ├─ Workspace API
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

后端维护一个非常简单的 agent loop：

1. 接收用户消息
2. 读取当前 session 历史
3. 拼接 system prompt 和工具定义
4. 调用模型
5. 如果模型请求工具：
   - 记录 `tool_call`
   - 生成 `approval`
   - 通过 SSE 推送前端
6. 用户批准后执行工具
7. 将工具结果写回上下文
8. 继续调用模型，直到输出最终回答

这个 loop 已经足够体现“agent + tool orchestration + approval gate”的核心价值。

### 8.2 Session-First 架构补充

为了支持 timeline replay、approval center 和后续的 shareable review，后端不应只存 message，而应存完整 run 过程中的结构化事件和审批对象。

最小建模原则：

- message 用于展示对话内容
- tool_call 用于表示 agent 的动作请求和执行状态
- approval 用于表示用户决策
- 后续可追加 event / artifact 以支持更强的 replay 和 review

## 9. 页面设计

## 9.1 页面清单

- `/`
  - 选择或创建 workspace
  - 展示最近工作区
- `/workspace/:workspaceId/session/:sessionId`
  - 主工作台
  - 包含 Timeline + Approval Center + Explorer / Preview

## 9.2 主工作台线框

```text
+--------------------------------------------------------------------------------------------------+
| Top Bar: workspace name | model | reconnect status | new session                                |
+----------------------+--------------------------------------+----------------------------------------+
| Session List         | Chat Thread                          | Explorer / Preview / Diff              |
|                      |                                      |                                        |
| - Fix auth bug       | User: explain this repo              | files                                  |
| - Add tests          | Assistant: ...                       | ├─ src                                 |
| - Refactor API       |                                      | ├─ package.json                        |
|                      | [Tool Card] read_file src/main.ts    | └─ README.md                           |
|                      | [Tool Card] write_file pending       |                                        |
|                      | [Approve] [Reject]                   | preview                                |
|                      |                                      | -------------------------------------- |
|                      | composer...                          | file content / diff view               |
+----------------------+--------------------------------------+----------------------------------------+
```

补充说明：

- 中间列不是普通聊天区，而是 timeline 驱动的 run 视图
- 待审批动作不只出现在消息流里，还会出现在独立的 Approval Center 中

## 9.3 关键交互

### A. 新建 workspace

1. 用户输入本地绝对路径
2. 后端校验目录存在且可访问
3. 建立 workspace 记录
4. 跳转到该 workspace 的首个 session

### B. agent 发起写文件

1. 模型返回 `write_file(path, content)`
2. 后端生成 diff，不立即写入
3. 前端显示审批卡片和 diff
4. 用户点击批准
5. 后端执行写入并推送结果

### C. agent 发起命令执行

1. 模型返回 `run_command(command)`
2. 后端进入 pending approval
3. 前端展示命令内容和风险提示
4. 用户批准后执行
5. 回传 `exitCode/stdout/stderr/durationMs`

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
  status TEXT NOT NULL DEFAULT 'active',
  last_error_text TEXT,
  last_checkpoint_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

字段说明：

- `title`: 可默认用第一条用户消息摘要生成
- `status`: `active | waiting_approval | failed | completed | archived`
- `last_error_text`: Resume From Failure 基础版需要
- `last_checkpoint_json`: 记录最近可恢复步骤的摘要

### 10.3 messages

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'message',
  content_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

字段说明：

- `role`: `system | user | assistant | tool`
- `content_json`: 保留结构化 parts，避免后续重构

### 10.4 tool_calls

```sql
CREATE TABLE tool_calls (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  message_id TEXT NOT NULL REFERENCES messages(id),
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

### 10.5 approvals

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

### 10.6 可选扩展：session_events

如果希望 timeline replay 和后续分享页更清晰，建议在 P1 或 Phase 2 引入事件表：

```sql
CREATE TABLE session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  type TEXT NOT NULL,
  ref_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

用途：

- 把消息、tool、approval、失败、恢复等步骤统一映射到 timeline
- 让 shareable run review 不依赖前端临时拼装

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
│   │       │   ├── chat/
│   │       │   ├── explorer/
│   │       │   ├── approvals/
│   │       │   └── sessions/
│   │       └── lib/
│   └── server/
│       └── src/
│           ├── main.ts
│           ├── agent/
│           │   ├── loop.ts
│           │   ├── prompt.ts
│           │   ├── events.ts
│           │   └── model-client.ts
│           ├── tools/
│           │   ├── read-file.ts
│           │   ├── write-file.ts
│           │   ├── run-command.ts
│           │   ├── guards.ts
│           │   └── diff.ts
│           ├── routes/
│           │   ├── sessions.ts
│           │   ├── workspaces.ts
│           │   ├── files.ts
│           │   ├── agent.ts
│           │   └── approvals.ts
│           ├── db/
│           │   ├── schema.ts
│           │   └── client.ts
│           └── services/
│               ├── workspace-service.ts
│               ├── session-service.ts
│               └── stream-service.ts
├── packages/
│   ├── shared/
│   │   ├── events.ts
│   │   ├── dto.ts
│   │   └── tool-types.ts
│   └── agent-core/
│       ├── prompt.ts
│       ├── tool-registry.ts
│       ├── approval-types.ts
│       └── loop-types.ts
└── README.md
```

目录设计原则：

- `apps/web` 只关心页面和交互
- `apps/server` 只关心 API、本地能力和 agent 调度
- `packages/shared` 放前后端共享类型
- `packages/agent-core` 放 prompt、tool schema、loop 抽象

## 12. API 设计

### 12.1 Workspace

- `POST /api/workspaces`
- `GET /api/workspaces`
- `GET /api/workspaces/:workspaceId/tree`

### 12.2 Files

- `GET /api/files/content?workspaceId=...&path=...`
- `GET /api/files/search?workspaceId=...&q=...`

### 12.3 Sessions

- `POST /api/sessions`
- `GET /api/sessions?workspaceId=...`
- `GET /api/sessions/:sessionId/messages`
- `POST /api/sessions/:sessionId/resume`

### 12.4 Agent

- `POST /api/sessions/:sessionId/messages`
- `GET /api/sessions/:sessionId/stream`

### 12.5 Approvals

- `POST /api/approvals/:approvalId/approve`
- `POST /api/approvals/:approvalId/reject`

### 12.6 Review

- `GET /api/reviews/:sessionId`

说明：

- 这个接口属于 Phase 2，用于分享页或只读 review 页

## 13. SSE 事件模型

前端不直接轮询 message 列表，而是订阅 session 事件流。

### 13.1 建议事件类型

```ts
type SessionEvent =
  | { type: 'message.created'; sessionId: string; message: UiMessage }
  | {
      type: 'message.delta';
      sessionId: string;
      messageId: string;
      delta: string;
    }
  | { type: 'message.completed'; sessionId: string; messageId: string }
  | {
      type: 'tool.pending';
      sessionId: string;
      toolCall: ToolCallDto;
      approval: ApprovalDto;
    }
  | { type: 'approval.created'; sessionId: string; approval: ApprovalDto }
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
  | { type: 'session.failed'; sessionId: string; error: string }
  | { type: 'session.resumable'; sessionId: string; checkpoint: unknown }
  | { type: 'session.updated'; sessionId: string; updatedAt: string };
```

说明：

- `message.delta` 负责流式文本展示
- `approval.created` / `approval.resolved` 负责驱动 Approval Center
- `tool.completed` 负责刷新文件预览或消息状态
- `session.failed` / `session.resumable` 负责 Resume From Failure 基础版

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

Your job is to help the user inspect code, modify files, and run safe development commands.

You have access to these tools:
- read_file
- write_file
- run_command

Rules:
1. Prefer reading relevant files before making changes.
2. Never assume file contents that you have not read.
3. Use write_file only when you are confident about the full replacement content.
4. Use run_command only for non-interactive development commands.
5. Keep answers concise and action-oriented.
6. If a task is ambiguous, ask one focused clarifying question.
7. Do not attempt to access files outside the workspace.
8. Do not use commands that are destructive, interactive, or unrelated to the user's goal.

When you need to inspect code, use tools instead of guessing.
When you finish, summarize what you changed or found.
```

## 14. 服务端安全约束

这是 MVP 的关键卖点之一，必须明确实现。

### 14.1 Workspace Guard

- 所有文件路径先转绝对路径
- 绝对路径必须以 workspace root 为前缀
- 拒绝符号链接越界
- 二进制文件默认不允许写入

### 14.2 Command Guard

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

### 14.3 Approval Gate

- `read_file` 可直接执行
- `write_file` 必须审批
- `run_command` 必须审批
- 审批必须记录到数据库，便于回放和调试

## 15. 2 周排期

### 第 1 周

1. Day 1：初始化 monorepo，建好 web/server/shared/agent-core
2. Day 2：落 SQLite schema，跑通 workspace + session CRUD
3. Day 3：完成文件树和文件预览
4. Day 4：接通模型调用和 SSE 文本流
5. Day 5：实现 `read_file`
6. Day 6：实现 `write_file` + diff 审批
7. Day 7：实现 `run_command` + 结果回显

### 第 2 周

1. Day 8：补会话恢复和最近 workspace
2. Day 9：补路径守卫、命令超时、错误处理
3. Day 10：打磨 UI，包括 tool 卡片和 approval panel
4. Day 11：补核心测试
5. Day 12：写 README、录 demo、整理截图
6. Day 13：修 bug
7. Day 14：整理简历和面试讲稿

## 16. 最小测试清单

### 16.1 后端单测

- workspace path 越界时拒绝访问
- `write_file` 未审批不能执行
- `run_command` 超时会终止
- tool result 会正确落库
- session 历史重放顺序正确

### 16.2 前端测试

- SSE 消息增量渲染正常
- tool pending 卡片能正确展示
- 批准写文件后 diff 消失并刷新预览
- 刷新页面后能恢复当前 session

## 17. Demo 脚本

面试演示建议按这个顺序：

1. 选择本地仓库作为 workspace
2. 新建 session，要求 agent 阅读一个文件
3. 让 agent 修改一处文案或小 bug
4. 展示 diff 审批
5. 让 agent 执行一个测试命令
6. 展示 stdout/stderr 和最终总结
7. 刷新页面，证明 session 可以恢复

## 18. 后续演进方向

MVP 完成后，可以按下面顺序升级：

1. 增加 `list_files` 和 `search_files`
2. 支持补丁级写入而不是整文件替换
3. 增加 Git 变更面板
4. 支持 provider 抽象和模型切换
5. 增加只读分享回放页

## 19. 开工顺序建议

如果明天开始做，建议按这个顺序推进：

1. 先做 SQLite schema 和 session/workspace API
2. 再做文件树和文件内容预览
3. 再接 SSE 聊天流
4. 最后接 tool loop 和 approval gate

原因很简单：

- 先把“工作台骨架”搭起来，后面 agent 只是在现有 UI 里填能力
- 先做 tool loop 容易卡在 prompt 或模型细节，影响整体推进
