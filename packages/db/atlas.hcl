variable "db_url" {
  type    = string
  default = getenv("DATABASE_URL")
}

env "local" {
  url = var.db_url
  dev = "sqlite://dev?mode=memory"

  src = [
    "file://schema"
  ]

  migration {
    dir = "file://migrations"
  }

  lint {
    destructive {
      error = false
    }

    data_depend {
      error = false
    }
  }

  format {
    migrate {
      diff = "{{ sql . }}"
    }
  }
}
