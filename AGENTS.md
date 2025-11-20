# wrkflw - Agent Development Guide

## Commands

**Backend (Deno):**
- `deno lint` - Run linter on all backend files
- `deno fmt` - Format backend code  
- `deno check backend/index.ts` - Type check backend entry point
- `deno run --allow-all test_migration.ts` - Test migration logic

**Frontend (Node/Vite):**
- `cd frontend && npm run dev` - Start development server
- `cd frontend && npm run build` - Build for production
- `cd frontend && npm run preview` - Preview production build

**Biome (Code Quality):**
- `npx @biomejs/biome check` - Run all checks (lint + format)
- `npx @biomejs/biome check --write` - Auto-fix issues
- `npx @biomejs/biome format --write` - Format only

## Code Standards

**TypeScript:** Use strict types, prefer interfaces over types, export all public APIs from `backend/index.ts`

**Imports:** Use `https://esm.sh` for npm packages, version pin all dependencies, organize imports with Biome

**Naming:** PascalCase for types/interfaces, camelCase for functions/variables, kebab-case for file names

**Error Handling:** Let errors bubble up with full context, use try-catch only for local resolution

**Val Town Specifics:**
- HTTP triggers: `*.http.ts`, export default async function(req: Request)
- Cron triggers: `*.cron.ts`, export default async function()
- Email triggers: `*.email.ts`, export default async function(email: Email)
- Use Val Town std libraries: `blob`, `sqlite`, `openai`, `email`
- Never use Deno KV, avoid external images, use Tailwind via CDN

**React:** Pin to 18.2.0, include `@jsxImportSource https://esm.sh/react@18.2.0` at top of files

**Database:** Use `wrkflw_` prefix for all table names, create new tables when modifying schemas

**Testing:** No test framework configured - test manually with example files in `/examples` directory