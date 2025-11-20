# wrkflw - Codebase Overview

**Last Updated:** November 20, 2025

## Project Summary

wrkflw is a TypeScript-first workflow engine for Val Town, inspired by Mastra. It enables building strongly-typed, composable workflows that run on Val Town's serverless platform with SQLite-backed persistence.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Workflow      │    │   Execution     │    │   SQLite        │
│   Builder       │───▶│   Engine        │───▶│   Storage       │
│   (workflow.ts) │    │   (engine.ts)   │    │   (storage.ts)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Step          │    │   Workflow      │    │   API Server    │
│   Definition    │    │   Run           │    │   (Optional)    │
│   (step.ts)     │    │   (run.ts)      │    │   (api-server)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Core Components

### 1. **Step System** (`backend/step.ts`)
- Define reusable workflow steps with Zod schemas
- Strong typing for inputs/outputs
- Access to workflow context (previous results, state)

### 2. **Workflow Builder** (`backend/workflow.ts`)
- Fluent API: `.then(step).then(step).commit()`
- Automatic type inference through step chains
- Compile-time type checking

### 3. **Execution Engine** (`backend/engine.ts`)
- Sequential step execution
- State persistence after each step
- Error handling and result capture

### 4. **Storage Layer** (`backend/storage.ts`)
- SQLite-backed workflow snapshots
- Track execution path and step results
- Query runs by workflow ID or status

### 5. **Prebuilt Steps** (`backend/prebuilt-steps.ts`)
- HTTP requests (GET, POST)
- Data transformation (map, filter, pick)
- Utilities (delay, logger, template)

## Key Features

- **Type Safety**: Full TypeScript inference across workflows
- **Val Town Native**: Works with HTTP, Cron, Email triggers
- **Visualization**: Mermaid diagrams + React canvas visualizer
- **Persistence**: ACID-compliant SQLite storage
- **Composability**: Steps and workflows as reusable modules

## Quick Start Tasks

When resuming development, start here:

1. **Run Examples**: `deno run --allow-all examples/simple-workflow.ts`
2. **Test Types**: `deno check backend/index.ts`
3. **Visualize**: `deno run --allow-all examples/api-server-example-local.ts`
4. **Frontend Dev**: `cd frontend && npm run dev`

## Development Commands

```bash
# Backend (Deno)
deno lint                    # Lint backend code
deno fmt                     # Format backend code
deno check backend/index.ts  # Type check

# Frontend (Node)
cd frontend && npm run dev   # Start visualizer
cd frontend && npm run build # Build for production

# Code Quality
npx @biomejs/biome check --write  # Fix all issues
```

## Project Structure

```
backend/          # Core workflow engine (Deno)
  ├── index.ts    # Main exports
  ├── types.ts    # TypeScript definitions
  ├── step.ts     # Step creation
  ├── workflow.ts # Workflow builder
  ├── engine.ts   # Execution engine
  ├── storage.ts  # SQLite persistence
  └── prebuilt-steps.ts # Ready-to-use steps

examples/         # Usage examples
  ├── simple-workflow.ts
  ├── http-trigger.ts
  └── api-server-example-local.ts

frontend/         # React visualizer (Vite)
  └── src/components/ # Canvas workflow viewer
```

## Common Patterns

### Creating a Workflow
```typescript
const workflow = createWorkflow({
  id: 'my-workflow',
  inputSchema: z.object({ data: z.string() }),
  outputSchema: z.object({ result: z.string() }),
})
  .then(step1)
  .then(step2)
  .commit();
```

### Running a Workflow
```typescript
const run = await workflow.createRun();
const result = await run.start({ inputData: { data: "hello" } });
```

### Accessing Previous Results
```typescript
execute: async ({ inputData, getStepResult }) => {
  const previousResult = getStepResult(step1);
  return { result: previousResult.value + 1 };
}
```

## Next Steps for Development

1. **Add New Prebuilt Steps**: Extend `backend/prebuilt-steps.ts`
2. **Enhance Visualization**: Improve React canvas in `frontend/`
3. **Advanced Control Flow**: Parallel execution, branching
4. **Error Recovery**: Retry logic, fallback steps
5. **Performance**: Optimize SQLite queries, add indexes

## Key Files to Understand

- `backend/types.ts` - Core type definitions
- `backend/workflow.ts` - Workflow builder implementation
- `backend/engine.ts` - Execution logic
- `examples/simple-workflow.ts` - Basic usage pattern
- `AGENTS.md` - Development guidelines and commands