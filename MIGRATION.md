# Database Migration Guide

## Table Naming Normalization

All tables in the wrkflw library now use the `wrkflw_` prefix for consistency and namespace clarity. This guide explains how to migrate existing data.

## Affected Tables

- `workflow_runs` → `wrkflw_workflow_runs`

## Automatic Migration

The library includes automatic migration functionality that runs during initialization. When you call `WorkflowStorage.init()`, the migration will:

1. Check if the old `workflow_runs` table exists
2. Create the new `wrkflw_workflow_runs` table if it doesn't exist
3. Copy all data from the old table to the new table
4. Preserve the old table for safety (no data loss)

### How It Works

The migration is **automatic and safe**:

```typescript
import { WorkflowStorage } from "./backend/storage.ts";

const storage = new WorkflowStorage();
await storage.init(); // Migration happens automatically here
```

By default, the old table is **not deleted** to ensure data safety. Both tables will exist after migration.

## Manual Migration Options

### Option 1: Using the Migration API

If you want more control over the migration process:

```typescript
import { runMigrations, migrateWorkflowRunsTable } from "./backend/migrations.ts";

// Migrate with old table preserved (recommended)
const result = await migrateWorkflowRunsTable(false);
console.log(result.message);
console.log(`Migrated ${result.rowCount} rows`);

// Migrate and drop old table (use with caution)
const result = await migrateWorkflowRunsTable(true);
```

### Option 2: Using SQL Directly

Generate a SQL migration script for manual execution:

```typescript
import { generateMigrationSQL } from "./backend/migrations.ts";

// Generate SQL without dropping old table
const sql = generateMigrationSQL(false);
console.log(sql);

// Or generate SQL with old table cleanup
const sql = generateMigrationSQL(true);
console.log(sql);
```

You can then execute this SQL manually in your SQLite database.

### Example SQL Migration Script

```sql
-- Create new table with wrkflw_ prefix
CREATE TABLE IF NOT EXISTS wrkflw_workflow_runs (
  run_id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  status TEXT NOT NULL,
  execution_path TEXT,
  step_results TEXT,
  state TEXT,
  input_data TEXT,
  result TEXT,
  error TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_workflow_id
ON wrkflw_workflow_runs(workflow_id);

CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_status
ON wrkflw_workflow_runs(status);

-- Copy data from old table
INSERT OR IGNORE INTO wrkflw_workflow_runs (
  run_id, workflow_id, status, execution_path,
  step_results, state, input_data, result, error,
  created_at, updated_at
)
SELECT
  run_id, workflow_id, status, execution_path,
  step_results, state, input_data, result, error,
  created_at, updated_at
FROM workflow_runs
WHERE EXISTS (
  SELECT 1 FROM sqlite_master
  WHERE type='table' AND name='workflow_runs'
);

-- Optional: Drop old table (only after verifying migration succeeded)
-- DROP TABLE workflow_runs;
-- DROP INDEX IF EXISTS idx_workflow_runs_workflow_id;
-- DROP INDEX IF EXISTS idx_workflow_runs_status;
```

## Migration Safety

The migration process is designed to be **safe and non-destructive**:

1. **No data loss**: Old table is preserved by default
2. **Idempotent**: Can be run multiple times safely
3. **Uses INSERT OR IGNORE**: Won't overwrite existing data in new table
4. **Atomic operations**: Each step is a complete SQL transaction

## Cleaning Up Old Tables

After verifying that your application works correctly with the new table:

1. Check that all data was migrated successfully
2. Verify your application is using the new table
3. Optionally, drop the old table manually:

```typescript
import { sqlite } from "https://esm.town/v/std/sqlite";

// Only do this after thorough verification!
await sqlite.execute("DROP TABLE IF EXISTS workflow_runs");
await sqlite.execute("DROP INDEX IF EXISTS idx_workflow_runs_workflow_id");
await sqlite.execute("DROP INDEX IF EXISTS idx_workflow_runs_status");
```

Or using the migration API:

```typescript
import { migrateWorkflowRunsTable } from "./backend/migrations.ts";

// This will drop the old table
await migrateWorkflowRunsTable(true);
```

## Troubleshooting

### Migration doesn't run

- Ensure you're calling `WorkflowStorage.init()` before using storage
- Check that you have the latest version with migration support

### Data appears missing

- Check if data is in the old table: `SELECT COUNT(*) FROM workflow_runs;`
- Check if data is in the new table: `SELECT COUNT(*) FROM wrkflw_workflow_runs;`
- The migration uses `INSERT OR IGNORE`, so existing records won't be duplicated

### Performance concerns

- The migration runs only once during initialization
- For very large datasets (10,000+ rows), consider running migration during off-peak hours
- The migration is fast for typical workflow run counts

## Questions?

If you encounter any issues during migration, please open an issue on the GitHub repository.
