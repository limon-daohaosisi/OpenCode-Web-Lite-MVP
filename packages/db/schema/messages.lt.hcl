table "messages" {
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

  column "role" {
    type = text
    null = false
  }

  column "kind" {
    type    = text
    null    = false
    default = sql("'message'")
  }

  column "content_json" {
    type = text
    null = false
  }

  column "created_at" {
    type = text
    null = false
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "messages_session_id_fkey" {
    columns     = [column.session_id]
    ref_columns = [table.sessions.column.id]
    on_delete   = CASCADE
  }

  foreign_key "messages_task_id_fkey" {
    columns     = [column.task_id]
    ref_columns = [table.tasks.column.id]
    on_delete   = SET_NULL
  }

  check "messages_valid_role" {
    expr = "role IN ('system', 'user', 'assistant', 'tool')"
  }

  index "idx_messages_session_created_at" {
    columns = [column.session_id, column.created_at]
  }

  index "idx_messages_task_created_at" {
    columns = [column.task_id, column.created_at]
  }
}
