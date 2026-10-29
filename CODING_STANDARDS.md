# Coding standards

## TypeScript
- Prefer `interface` over `type`. Give public APIs explicit types even though `deno.json` leaves
  `strict` off.
- Export every public API from `backend/index.ts`.
- Naming: PascalCase types, camelCase functions and variables, kebab-case file names.

## Imports
Pin a version on every remote import. Match the existing specifiers (`npm:zod@^3.23`,
`https://esm.sh/hono@4`) and let Biome order imports.

## Errors
Let errors bubble up with full context. Catch only to resolve locally, as the engine does when it
records a failed `StepResult`, saves the snapshot, then rethrows. Retries are absent by design.

## Run state
- Every engine state transition saves a snapshot: at start, after each step, on success, and on
  failure before rethrowing. A new transition saves one too.
- Snapshots upsert with `ON CONFLICT(run_id) DO UPDATE`. JSON goes into TEXT columns.
- Run IDs come from `crypto.randomUUID()`.

## Prebuilt steps
Steps in `backend/prebuilt-steps.ts` take a kebab-case `id`, use generic Zod schemas
(`z.unknown()`, `z.record()`), carry a JSDoc block with an `@example`, and are exported from
`backend/index.ts`.

## React
`frontend/` uses npm React from `frontend/package.json`. TSX served by Val Town pins React 18.2.0
and starts with `/** @jsxImportSource https://esm.sh/react@18.2.0 */`.
