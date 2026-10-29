# wrkflw

TypeScript workflow engine for Val Town: typed, Zod-validated steps chained with `.then()`, run
state persisted to Val Town SQLite. The engine lives in `backend/`; `frontend/` is a Vite canvas
that visualizes runs through `backend/api-server.ts`.

## Commands

- `deno lint`, `deno fmt`, `deno check --allow-import backend/index.ts`.
- `npx @biomejs/biome check` (add `--write` to fix).
- `cd frontend && npm run dev` / `build` / `preview`.
- No test suite: exercise changes with `examples/`. `test_migration.ts` only prints migration SQL.

## Schema changes

Val Town's SQLite has limited `ALTER TABLE` support. To change the `wrkflw_workflow_runs` schema,
create a new `wrkflw_`-prefixed table instead of altering the old one. Add a copy-forward migration
to `backend/migrations.ts` in the style of `migrateWorkflowRunsTable()`, register it in
`runMigrations()` (which `WorkflowStorage.init()` calls on startup), and keep the old table.

## Val Town constraints

- Trigger files: `*.http.ts` default-exports `(req: Request)`, `*.cron.ts` `(interval: Interval)`,
  `*.email.ts` `(email: Email)`.
- Use the Val Town std libraries (`sqlite`, `blob`, `openai`, `email`) in place of Deno KV.
- Load Tailwind via CDN and keep images in the val.

## Gotchas

- Storage has no local fallback. `WorkflowStorage` always imports Val Town's std `sqlite`, so local
  runs, `examples/` included, read and write the real Val Town database and need a token.

## Before editing `backend/`

Read `CODING_STANDARDS.md`.

## Done means

`deno lint` and `deno check --allow-import backend/index.ts` report no errors beyond those already
on `main`. Both fail there today: lint across `backend/` and `examples/`, check in `api-server.ts`.
