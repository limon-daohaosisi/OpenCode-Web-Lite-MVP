# Database Schema Package

This package is the database source of truth for OpenCode Web Lite MVP.

Responsibilities:

- Define SQLite schema with Atlas HCL
- Manage versioned migrations
- Keep schema review separate from ORM usage

Workflow:

1. Edit `schema/*.lt.hcl`
2. Run `atlas migrate diff <name> --env local`
3. Review the generated SQL in `migrations/`
4. Run `atlas migrate apply --env local`
5. Run `pnpm db:sync`
