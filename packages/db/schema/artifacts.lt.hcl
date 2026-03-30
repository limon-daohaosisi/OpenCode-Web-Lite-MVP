table "artifacts" {
  schema = schema.main

  column "id" {
    type = text
    null = false
  }

  column "session_id" {
    type = text
    null = false
  }

  column "task_id" {
    type = text
    null = true
  }

  column "tool_call_id" {
    type = text
    null = true
  }

  column "kind" {
    type = text
    null = false
  }

  column "title" {
    type = text
    null = false
  }

  column "mime_type" {
    type    = text
    null    = false
    default = sql("'text/plain'")
  }

  column "body_text" {
    type = text
    null = true
  }

  column "payload_json" {
    type = text
    null = true
  }

  column "created_at" {
    type = text
    null = false
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "artifacts_session_id_fkey" {
    columns     = [column.session_id]
    ref_columns = [table.sessions.column.id]
    on_delete   = CASCADE
  }

  foreign_key "artifacts_task_id_fkey" {
    columns     = [column.task_id]
    ref_columns = [table.tasks.column.id]
    on_delete   = SET_NULL
  }

  foreign_key "artifacts_tool_call_id_fkey" {
    columns     = [column.tool_call_id]
    ref_columns = [table.tool_calls.column.id]
    on_delete   = SET_NULL
  }

  check "artifacts_valid_kind" {
    expr = "kind IN ('diff', 'stdout', 'stderr', 'error', 'file_snapshot', 'plan_summary', 'task_summary', 'final_result')"
  }

  check "artifacts_has_body_or_payload" {
    expr = "body_text IS NOT NULL OR payload_json IS NOT NULL"
  }

  index "idx_artifacts_task_created_at" {
    columns = [column.task_id, column.created_at]
  }
}
