table "workspaces" {
  schema = schema.main

  column "id" {
    type = text
    null = false
  }

  column "name" {
    type = text
    null = false
  }

  column "root_path" {
    type = text
    null = false
  }

  column "created_at" {
    type = text
    null = false
  }

  column "updated_at" {
    type = text
    null = false
  }

  column "last_opened_at" {
    type = text
    null = false
  }

  primary_key {
    columns = [column.id]
  }

  index "workspaces_root_path_idx" {
    columns = [column.root_path]
    unique  = true
  }

  index "idx_workspaces_last_opened_at" {
    columns = [column.last_opened_at]
  }
}
