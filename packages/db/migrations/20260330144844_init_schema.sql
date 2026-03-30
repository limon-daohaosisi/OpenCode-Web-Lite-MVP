-- Create "approvals" table
CREATE TABLE `approvals` (`id` text NOT NULL, `session_id` text NOT NULL, `task_id` text NULL, `tool_call_id` text NOT NULL, `kind` text NOT NULL, `status` text NOT NULL DEFAULT ('pending'), `decision_scope` text NOT NULL DEFAULT ('once'), `payload_json` text NOT NULL, `suggested_rule_json` text NULL, `decided_by` text NULL, `decision_reason_text` text NULL, `created_at` text NOT NULL, `decided_at` text NULL, PRIMARY KEY (`id`), CONSTRAINT `approvals_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `approvals_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL, CONSTRAINT `approvals_tool_call_id_fkey` FOREIGN KEY (`tool_call_id`) REFERENCES `tool_calls` (`id`) ON DELETE CASCADE, CONSTRAINT `approvals_valid_kind` CHECK (kind IN ('write_file', 'run_command')), CONSTRAINT `approvals_valid_status` CHECK (status IN ('pending', 'approved', 'rejected')), CONSTRAINT `approvals_valid_decision_scope` CHECK (decision_scope IN ('once', 'session_rule')));
-- Create index "idx_approvals_session_status_created_at" to table: "approvals"
CREATE INDEX `idx_approvals_session_status_created_at` ON `approvals` (`session_id`, `status`, `created_at`);
-- Create index "idx_approvals_tool_call_id" to table: "approvals"
CREATE INDEX `idx_approvals_tool_call_id` ON `approvals` (`tool_call_id`);
-- Create "artifacts" table
CREATE TABLE `artifacts` (`id` text NOT NULL, `session_id` text NOT NULL, `task_id` text NULL, `tool_call_id` text NULL, `kind` text NOT NULL, `title` text NOT NULL, `mime_type` text NOT NULL DEFAULT ('text/plain'), `body_text` text NULL, `payload_json` text NULL, `created_at` text NOT NULL, PRIMARY KEY (`id`), CONSTRAINT `artifacts_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `artifacts_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL, CONSTRAINT `artifacts_tool_call_id_fkey` FOREIGN KEY (`tool_call_id`) REFERENCES `tool_calls` (`id`) ON DELETE SET NULL, CONSTRAINT `artifacts_valid_kind` CHECK (kind IN ('diff', 'stdout', 'stderr', 'error', 'file_snapshot', 'plan_summary', 'task_summary', 'final_result')), CONSTRAINT `artifacts_has_body_or_payload` CHECK (body_text IS NOT NULL OR payload_json IS NOT NULL));
-- Create index "idx_artifacts_task_created_at" to table: "artifacts"
CREATE INDEX `idx_artifacts_task_created_at` ON `artifacts` (`task_id`, `created_at`);
-- Create "messages" table
CREATE TABLE `messages` (`id` text NOT NULL, `session_id` text NOT NULL, `task_id` text NULL, `role` text NOT NULL, `kind` text NOT NULL DEFAULT ('message'), `content_json` text NOT NULL, `created_at` text NOT NULL, PRIMARY KEY (`id`), CONSTRAINT `messages_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `messages_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL, CONSTRAINT `messages_valid_role` CHECK (role IN ('system', 'user', 'assistant', 'tool')));
-- Create index "idx_messages_session_created_at" to table: "messages"
CREATE INDEX `idx_messages_session_created_at` ON `messages` (`session_id`, `created_at`);
-- Create index "idx_messages_task_created_at" to table: "messages"
CREATE INDEX `idx_messages_task_created_at` ON `messages` (`task_id`, `created_at`);
-- Create "plans" table
CREATE TABLE `plans` (`id` text NOT NULL, `session_id` text NOT NULL, `version` integer NOT NULL, `status` text NOT NULL DEFAULT ('draft'), `summary_text` text NULL, `source` text NOT NULL DEFAULT ('model'), `created_at` text NOT NULL, `confirmed_at` text NULL, `superseded_at` text NULL, PRIMARY KEY (`id`), CONSTRAINT `plans_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `plans_valid_status` CHECK (status IN ('draft', 'confirmed', 'superseded')));
-- Create index "plans_session_version_idx" to table: "plans"
CREATE UNIQUE INDEX `plans_session_version_idx` ON `plans` (`session_id`, `version`);
-- Create "session_events" table
CREATE TABLE `session_events` (`id` text NOT NULL, `session_id` text NOT NULL, `task_id` text NULL, `sequence_no` integer NOT NULL, `type` text NOT NULL, `level` text NOT NULL DEFAULT ('info'), `entity_type` text NULL, `entity_id` text NULL, `headline` text NULL, `detail_text` text NULL, `payload_json` text NOT NULL DEFAULT ('{}'), `created_at` text NOT NULL, PRIMARY KEY (`id`), CONSTRAINT `session_events_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `session_events_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL, CONSTRAINT `session_events_valid_level` CHECK (level IN ('debug', 'info', 'warning', 'error')));
-- Create index "session_events_session_sequence_idx" to table: "session_events"
CREATE UNIQUE INDEX `session_events_session_sequence_idx` ON `session_events` (`session_id`, `sequence_no`);
-- Create index "idx_session_events_session_sequence" to table: "session_events"
CREATE INDEX `idx_session_events_session_sequence` ON `session_events` (`session_id`, `sequence_no`);
-- Create index "idx_session_events_task_sequence" to table: "session_events"
CREATE INDEX `idx_session_events_task_sequence` ON `session_events` (`task_id`, `sequence_no`);
-- Create "sessions" table
CREATE TABLE `sessions` (`id` text NOT NULL, `workspace_id` text NOT NULL, `title` text NOT NULL, `goal_text` text NOT NULL, `status` text NOT NULL DEFAULT ('planning'), `current_plan_id` text NULL, `current_task_id` text NULL, `last_error_text` text NULL, `last_checkpoint_json` text NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, `archived_at` text NULL, PRIMARY KEY (`id`), CONSTRAINT `sessions_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces` (`id`) ON DELETE CASCADE, CONSTRAINT `sessions_valid_status` CHECK (status IN ('planning', 'executing', 'waiting_approval', 'blocked', 'failed', 'completed', 'archived')));
-- Create index "idx_sessions_workspace_updated_at" to table: "sessions"
CREATE INDEX `idx_sessions_workspace_updated_at` ON `sessions` (`workspace_id`, `updated_at`);
-- Create index "idx_sessions_status" to table: "sessions"
CREATE INDEX `idx_sessions_status` ON `sessions` (`status`);
-- Create "tasks" table
CREATE TABLE `tasks` (`id` text NOT NULL, `session_id` text NOT NULL, `plan_id` text NOT NULL, `parent_task_id` text NULL, `position` integer NOT NULL, `title` text NOT NULL, `description` text NULL, `acceptance_criteria_json` text NOT NULL DEFAULT ('[]'), `status` text NOT NULL DEFAULT ('todo'), `summary_text` text NULL, `last_error_text` text NULL, `started_at` text NULL, `completed_at` text NULL, `updated_at` text NOT NULL, PRIMARY KEY (`id`), CONSTRAINT `tasks_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `tasks_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE, CONSTRAINT `tasks_parent_task_id_fkey` FOREIGN KEY (`parent_task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE, CONSTRAINT `tasks_valid_status` CHECK (status IN ('todo', 'ready', 'running', 'blocked', 'waiting_approval', 'done', 'failed')));
-- Create index "tasks_plan_position_idx" to table: "tasks"
CREATE UNIQUE INDEX `tasks_plan_position_idx` ON `tasks` (`plan_id`, `position`);
-- Create index "idx_tasks_session_position" to table: "tasks"
CREATE INDEX `idx_tasks_session_position` ON `tasks` (`session_id`, `position`);
-- Create index "idx_tasks_session_status" to table: "tasks"
CREATE INDEX `idx_tasks_session_status` ON `tasks` (`session_id`, `status`);
-- Create "tool_calls" table
CREATE TABLE `tool_calls` (`id` text NOT NULL, `session_id` text NOT NULL, `task_id` text NULL, `message_id` text NULL, `tool_name` text NOT NULL, `input_json` text NOT NULL, `status` text NOT NULL, `requires_approval` integer NOT NULL DEFAULT 0, `result_json` text NULL, `error_text` text NULL, `started_at` text NULL, `completed_at` text NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, PRIMARY KEY (`id`), CONSTRAINT `tool_calls_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sessions` (`id`) ON DELETE CASCADE, CONSTRAINT `tool_calls_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL, CONSTRAINT `tool_calls_message_id_fkey` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE SET NULL, CONSTRAINT `tool_calls_valid_tool_name` CHECK (tool_name IN ('read_file', 'write_file', 'run_command')), CONSTRAINT `tool_calls_valid_status` CHECK (status IN ('pending_approval', 'approved', 'rejected', 'running', 'completed', 'failed')), CONSTRAINT `tool_calls_valid_requires_approval` CHECK (requires_approval IN (0, 1)));
-- Create index "idx_tool_calls_session_created_at" to table: "tool_calls"
CREATE INDEX `idx_tool_calls_session_created_at` ON `tool_calls` (`session_id`, `created_at`);
-- Create index "idx_tool_calls_task_status" to table: "tool_calls"
CREATE INDEX `idx_tool_calls_task_status` ON `tool_calls` (`task_id`, `status`);
-- Create "workspaces" table
CREATE TABLE `workspaces` (`id` text NOT NULL, `name` text NOT NULL, `root_path` text NOT NULL, `created_at` text NOT NULL, `updated_at` text NOT NULL, `last_opened_at` text NOT NULL, PRIMARY KEY (`id`));
-- Create index "workspaces_root_path_idx" to table: "workspaces"
CREATE UNIQUE INDEX `workspaces_root_path_idx` ON `workspaces` (`root_path`);
-- Create index "idx_workspaces_last_opened_at" to table: "workspaces"
CREATE INDEX `idx_workspaces_last_opened_at` ON `workspaces` (`last_opened_at`);
