table "plans" {
  schema = schema.main

  column "id" {
    type = text
    null = false
  }

  column "session_id" {
    type = text
    null = false
  }

  column "version" {
    type = integer
    null = false
  }

  column "status" {
    type    = text
    null    = false
    default = sql("'draft'")
  }

  column "summary_text" {
    type = text
    null = true
  }

  column "source" {
    type    = text
    null    = false
    default = sql("'model'")
  }

  column "created_at" {
    type = text
    null = false
  }

  column "confirmed_at" {
    type = text
    null = true
  }

  column "superseded_at" {
    type = text
    null = true
  }

  primary_key {
    columns = [column.id]
  }

  foreign_key "plans_session_id_fkey" {
    columns     = [column.session_id]
    ref_columns = [table.sessions.column.id]
    on_delete   = CASCADE
  }

  check "plans_valid_status" {
    expr = "status IN ('draft', 'confirmed', 'superseded')"
  }

  index "plans_session_version_idx" {
    columns = [column.session_id, column.version]
    unique  = true
  }
}
