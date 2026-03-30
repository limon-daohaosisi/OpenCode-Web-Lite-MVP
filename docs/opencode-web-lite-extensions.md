# OpenCode Web Lite 扩展能力设计

Status: Draft

Owner: 个人简历项目

Related:

- `docs/opencode-web-lite-mvp.md`

> 本文档专门描述两个不进入首版 MVP、但很有产品价值的扩展能力：`Skill Workflow` 与 `代码状态回退`。目标是给后续 1.5 / 2 阶段提供明确的产品定义、数据模型与实现边界。

## 1. 文档目的

原始 MVP 文档已经定义了 Web Lite 的核心方向：

- 本地优先
- 带审批的工具调用
- timeline replay
- session 持久化

但随着能力扩展，系统会出现两个很自然的新需求：

1. 某次成功 run 能否沉淀成可复用的方法论，而不是每次重新提示 agent
2. 某次对话完成后，能否把代码恢复到过去某个时间点，而不是只能继续往前改

这两个功能都很有价值，但都不适合作为首版 MVP 的硬目标。它们依赖首版先把以下基础打稳：

- session / run / event 模型
- tool call 与 approval 流
- 稳定的 agent loop
- workspace 安全边界
- 基础 checkpoint 语义

因此本文档的目的不是把它们压进 MVP，而是明确：

- 它们解决什么问题
- 哪一版先做什么
- 怎么避免一开始设计过重
- 数据和架构要提前预留哪些接口

## 2. 总体判断

推荐优先级：

1. 先把一个“能力不差”的 agent 主链路做稳
2. 再做 `Skill Workflow`
3. 最后做 `代码状态回退`

原因：

- `Skill Workflow` 依赖系统已经有值得沉淀的成功 run
- `代码状态回退` 依赖 checkpoint、事件语义、恢复语义已经清楚
- 如果核心 agent 还不稳定，就过早做附加功能，会把噪音和临时行为固化下来

## 3. 扩展能力 A：Skill Workflow

### 3.1 要解决的问题

用户在真实开发中，经常会重复表达一类流程性要求，例如：

- 先查官方文档，再写 RFC，再实现，再测试
- 改数据库前先列 migration plan
- 改登录和支付相关逻辑时，必须先跑一组指定测试

如果这些要求每次都重新输入，成本高且不稳定。更合理的做法是把一次成功 run 提炼成可复用流程。

### 3.2 不要直接把“整段对话”存成 skill

首要原则：

- 不要把原始聊天记录原样保存成 skill

原因：

- 原对话里有很多一次性上下文
- 会混入当时的文件路径、错误信息、无效尝试
- 它更像历史记录，不像通用模板

因此系统应该区分三个概念：

- `Run Recipe`: 从某次 run 自动提炼出的可复用流程草稿
- `Skill`: 用户审核和编辑后的正式模板
- `Memory / Policy`: 项目长期偏好和硬性规则，不应混进 skill

### 3.3 产品定位

`Skill Workflow` 的本质不是“保存提示词”，而是：

- 从一次成功执行中总结方法
- 让用户以结构化方式修改
- 之后在相似任务中复用

更准确地说，它是“可编辑的工作流模板”。

### 3.4 首版能力边界

首版只做：

- 从单次成功 run 生成 skill draft
- 用户手动编辑 draft
- 保存为 workspace 级 skill
- 新会话中手动选择 skill
- agent 可读取 skill 内容并按其步骤执行

首版不做：

- 全自动无确认发布
- 复杂自动匹配
- 多 skill 编排
- 基于历史大量样本的自动合并
- 复杂冲突解决

### 3.5 核心用户流

#### A. 从 run 沉淀 skill

1. 用户在某个 session / run 页点击“沉淀为 Skill”
2. 后端根据该 run 的事件流与工具记录生成 `Run Recipe`
3. 系统产出一份 `Skill Draft`
4. 用户进入编辑器修改
5. 用户发布为正式 skill

#### B. 在后续任务中复用 skill

1. 用户创建新会话
2. 手动选择某个 skill，或系统建议一个相关 skill
3. agent 在本轮开始前读取该 skill
4. 后续 tool call、审批与 timeline 仍走主系统标准流程

### 3.6 Skill 内容建议

不要只存一段自由文本。建议同时保存：

- 一份 Markdown
- 一份结构化 JSON

结构化字段建议：

```json
{
  "name": "rfc-first-implementation",
  "description": "For non-trivial feature work, read official docs, write RFC, then implement and test.",
  "when_to_use": ["multi-file feature work", "architecture-sensitive changes"],
  "steps": [
    "Read official documentation first",
    "Draft an RFC with scope, tradeoffs, and rollout plan",
    "Ask for approval before implementation",
    "Implement in small checkpoints",
    "Run relevant tests and summarize results"
  ],
  "required_artifacts": ["RFC summary", "test summary"],
  "approval_points": ["after RFC", "before destructive commands"],
  "do_not_apply_when": ["simple typo fixes", "single-file trivial refactors"]
}
```

Markdown 适合给 agent 直接读；结构化 JSON 适合前端编辑和规则判断。

### 3.7 Skill 编辑体验

这个功能是否好用，核心在编辑器，不在自动提炼。

建议编辑页至少支持：

- 名称
- 简介
- 适用场景
- 不适用场景
- 步骤列表，可拖拽排序
- 需要的产物
- 审批点
- 发布状态
- 版本历史

首版不必做复杂富文本。普通 Markdown + 表单即可。

### 3.8 数据模型

建议新增以下表：

#### 3.8.1 skills

```sql
CREATE TABLE skills (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  latest_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### 3.8.2 skill_versions

```sql
CREATE TABLE skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skills(id),
  version INTEGER NOT NULL,
  markdown_text TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  created_from_run_id TEXT,
  created_at TEXT NOT NULL
);
```

#### 3.8.3 skill_sources

```sql
CREATE TABLE skill_sources (
  id TEXT PRIMARY KEY,
  skill_version_id TEXT NOT NULL REFERENCES skill_versions(id),
  session_id TEXT NOT NULL REFERENCES sessions(id),
  run_id TEXT,
  event_range_json TEXT,
  created_at TEXT NOT NULL
);
```

建议状态：

- `draft`
- `published`
- `archived`

### 3.9 事件建议

建议新增：

```ts
type AppEvent =
  | { type: 'skill.draft.created'; sessionId: string; skillId: string }
  | { type: 'skill.updated'; skillId: string; versionId: string }
  | { type: 'skill.published'; skillId: string; versionId: string }
  | { type: 'skill.attached'; sessionId: string; skillId: string };
```

### 3.10 实现建议

不要把 skill 直接做成“神秘 system prompt 黑盒”。更合理的是：

- skill 在 session 开始时加载
- 或在某个 workflow 节点显式读取
- 它的内容进入 agent 可见上下文
- 但最终工具执行、审批、失败恢复仍由主系统控制

这意味着：

- skill 影响“策略”
- 不接管“执行权限”

### 3.11 与 LangGraph 的关系

如果后续引入 LangGraph，最适合先用于 skill 执行器，而不是全局替换主 agent loop。

适合 graph 化的 skill 场景：

- research -> RFC -> approval -> implement -> test
- diagnose -> propose fix -> approval -> patch -> verify

不适合 graph 化的场景：

- 普通单轮问答
- 简单文件读取
- 普通聊天

因此推荐：

- skill 内容由你自己的系统存储和管理
- 某些复杂 skill 可以选择性映射为 graph workflow

## 4. 扩展能力 B：代码状态回退

### 4.1 要解决的问题

真实开发里，用户会频繁遇到这些情况：

- agent 改错方向了，想回到几轮之前
- 某个实验性实现失败了，想恢复到上一个稳定状态
- 想从某一步分叉出新的尝试，而不是覆盖当前结果

因此系统需要回退能力。

### 4.2 必须先定义清楚“回退什么”

本项目首选做的是：

- `代码状态回退`

不是：

- `完整环境状态回退`

也就是说，首版目标是恢复 workspace 内受管代码文件的状态，而不是承诺回滚：

- 外部数据库
- 网络副作用
- 包管理器缓存
- 任意 shell 命令的所有系统影响

这是最重要的产品边界。

### 4.3 为什么不能一开始做完整回退

完整回退意味着：

- 容器或 microVM 快照
- 数据库一致性点
- 文件系统与进程内状态同时恢复
- 恢复后网络、副作用、外部系统状态仍要可解释

这条路工程量很大，明显超出 Web Lite 的 Phase 1 范围。

因此建议分层实现。

### 4.4 分阶段路线

#### Phase 1.5

- 只做“恢复到上一个成功 checkpoint”

#### Phase 2

- 支持恢复到任意 checkpoint
- 支持从旧 checkpoint 分叉新 run

#### 更后续的高级阶段

- 评估 git checkpoint
- 再评估完整 sandbox snapshot

### 4.5 推荐的首版语义

建议定义为：

- 每个关键时点产生一个 checkpoint
- 恢复操作默认创建一个新的 restore run
- 原 timeline 保留
- 不直接覆盖历史

这会比“把当前状态硬切回旧状态”更安全。

即：

- 保留历史
- 从旧点恢复
- 继续形成新的分支

### 4.6 checkpoint 何时产生

建议先在这些时点创建 checkpoint：

- 用户批准一次 `write_file` 并成功写入后
- 用户批准一次 `patch` 并成功应用后
- 一轮 assistant task 成功结束后
- 用户手动点击“保存检查点”时

不要在每个 token、每条消息后都建 checkpoint。

### 4.7 三种实现路线

#### A. 文件快照

每次 checkpoint 保存：

- 本次变更的文件列表
- 文件快照
- 基础元数据

优点：

- 最简单
- 最符合当前 MVP 技术栈
- 不要求 workspace 本身有 git

缺点：

- 存储成本偏高
- 对命令副作用恢复有限
- 随文件数量增长会变重

#### B. Git checkpoint

把 checkpoint 绑定到 git commit 或轻量 branch。

优点：

- diff 与恢复语义天然清晰
- 存储效率更高
- 更利于后续分享和 review

缺点：

- 要处理已有仓库、脏工作区、未追踪文件
- 对新手用户有一定心智成本

#### C. 完整 sandbox snapshot

例如容器或 microVM snapshot。

优点：

- 最接近完整环境恢复

缺点：

- 工程量非常大
- 超出当前项目阶段

### 4.8 当前项目推荐方案

当前推荐顺序：

1. 先做文件级 checkpoint
2. 条件成熟后演进到 git checkpoint
3. 不在近期范围内实现完整 sandbox snapshot

也就是说，不要把“回退功能”一开始就设计成完整运行时快照系统。

### 4.9 数据模型

建议新增：

#### 4.9.1 checkpoints

```sql
CREATE TABLE checkpoints (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  run_id TEXT,
  parent_checkpoint_id TEXT REFERENCES checkpoints(id),
  trigger_event_id TEXT,
  kind TEXT NOT NULL,
  summary_text TEXT,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

字段说明：

- `kind`: `turn_end | write_applied | patch_applied | manual`
- `snapshot_json`: 首版可存文件快照摘要或文件列表

#### 4.9.2 restores

```sql
CREATE TABLE restores (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  source_checkpoint_id TEXT NOT NULL REFERENCES checkpoints(id),
  target_run_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  completed_at TEXT
);
```

建议状态：

- `pending_approval`
- `running`
- `completed`
- `failed`

### 4.10 事件建议

```ts
type AppEvent =
  | { type: 'checkpoint.created'; sessionId: string; checkpointId: string }
  | {
      type: 'restore.requested';
      sessionId: string;
      checkpointId: string;
    }
  | {
      type: 'restore.completed';
      sessionId: string;
      restoreId: string;
      checkpointId: string;
    }
  | {
      type: 'restore.failed';
      sessionId: string;
      restoreId: string;
      error: string;
    };
```

### 4.11 UI 设计建议

#### A. Timeline 上显示 checkpoint

- 在关键步骤旁显示 checkpoint 标记
- 可查看当时的变更摘要
- 可点击“从这里恢复”

#### B. 恢复前审批

恢复是高影响操作，建议进入审批流。审批卡需要展示：

- checkpoint 时间
- 关联步骤
- 受影响文件数
- 是否创建新 run
- 是否覆盖当前工作区

首版建议永远创建新 run，不做覆盖。

#### C. 恢复后标记

恢复成功后，timeline 中应出现明确系统事件：

- `Restored from checkpoint <id>`

这样用户能一眼看懂历史分叉。

### 4.12 风险与边界

回退功能最容易出问题的地方不是恢复本身，而是语义模糊。必须提前写清楚：

- 恢复只对受管文件负责
- 不保证回滚外部副作用
- 恢复默认创建新分支 run
- 用户本地未纳入系统的手工修改需要警告
- 恢复操作本身也应进入事件流

## 5. 两个扩展能力的依赖关系

### 5.1 Skill Workflow 依赖

- 稳定的 run / event 数据
- 成功任务可回放
- agent 有基本可用的工作方式
- 能识别 tool 序列与审批节点

### 5.2 回退依赖

- checkpoint 语义
- 恢复审批流
- 文件快照或 git checkpoint
- timeline 对分支历史的表达能力

### 5.3 它们不应先于核心 agent

如果核心 agent 还不够稳定，过早做这两个功能会有两个问题：

- skill 会把不成熟流程固化下来
- 回退会把不清楚的状态机复杂化

因此推荐开发顺序：

1. 强化核心 agent
2. skill draft / publish / attach
3. checkpoint / restore

## 6. 对当前代码结构的建议

当前项目已经有：

- `apps/web`
- `apps/server`
- `packages/shared`
- `packages/agent-core`

建议演进方向如下。

### 6.1 shared 层

新增 DTO：

- `SkillDto`
- `SkillVersionDto`
- `CheckpointDto`
- `RestoreDto`

新增事件类型：

- `skill.*`
- `checkpoint.*`
- `restore.*`

### 6.2 server 层

新增服务：

- `skill-service.ts`
- `checkpoint-service.ts`
- `restore-service.ts`

新增路由：

- `/skills`
- `/checkpoints`
- `/restores`

### 6.3 web 层

新增页面或面板：

- Skill 列表
- Skill 编辑器
- Run -> Skill Draft 生成入口
- Checkpoint 列表
- Restore 审批卡

## 7. 推荐落地节奏

### 7.1 Phase 1.5

先做：

- skill draft 生成
- skill 编辑与发布
- 手动 attach skill
- 上一个 checkpoint 恢复

### 7.2 Phase 2

再做：

- skill 推荐
- skill workflow graph 化
- 任意 checkpoint 恢复
- restore 分叉展示

### 7.3 暂不做

- 完整沙箱快照
- 多 skill 自动编排
- 自动无确认发布 skill
- 完整外部副作用回滚

## 8. 最终结论

这两个功能都值得做，但顺序和边界非常重要。

`Skill Workflow` 更适合作为“把成功经验沉淀为可编辑模板”的产品能力，应该在核心 agent 稳定后较早引入。

`代码状态回退` 更适合作为“基于 checkpoint 的安全恢复能力”，应该先从受管代码文件回退做起，而不是一上来承诺完整环境回滚。

对当前项目，最稳妥的路线是：

1. 先把 agent 主链路做强
2. 再上 skill draft / skill publish
3. 最后做 checkpoint / restore

这样既不会把系统做成一堆复杂但不稳定的附加功能，也能为后续更强的 agent 工作流留下清晰演进路径。
