/**
 * Database migration utilities for wrkflw
 *
 * This module provides SQL migration functionality to help users
 * migrate their existing tables to the new naming scheme with wrkflw_ prefix.
 */

/**
 * Migrates the old workflow_runs table to wrkflw_workflow_runs
 *
 * This function:
 * 1. Checks if the old table exists
 * 2. Creates the new table with wrkflw_ prefix
 * 3. Copies all data from the old table to the new table
 * 4. Optionally drops the old table (if dropOldTable is true)
 *
 * @param dropOldTable - Whether to drop the old table after migration (default: false for safety)
 * @returns Migration summary with row count and status
 */
export async function migrateWorkflowRunsTable(
	dropOldTable = false,
): Promise<{ migrated: boolean; rowCount: number; message: string }> {
	const { sqlite } = await import("https://esm.town/v/std/sqlite");

	// Check both tables in a single query for efficiency
	const tableCheck = await sqlite.execute({
		sql: `
      SELECT name FROM sqlite_master
      WHERE type='table' AND name IN ('workflow_runs', 'wrkflw_workflow_runs')
    `,
		args: [],
	});

	const existingTables = tableCheck.rows.map((row) => row[0] as string);
	const oldTableExists = existingTables.includes("workflow_runs");
	const newTableExists = existingTables.includes("wrkflw_workflow_runs");

	// If new table exists and old table doesn't, migration already completed
	if (newTableExists && !oldTableExists) {
		return {
			migrated: false,
			rowCount: 0,
			message:
				"Migration already completed - using 'wrkflw_workflow_runs' table",
		};
	}

	// If old table doesn't exist, nothing to migrate
	if (!oldTableExists) {
		return {
			migrated: false,
			rowCount: 0,
			message: "No migration needed - old table 'workflow_runs' does not exist",
		};
	}

	// Create new table if it doesn't exist
	if (!newTableExists) {
		await sqlite.execute(`
      CREATE TABLE wrkflw_workflow_runs (
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
      )
    `);

		// Create indexes
		await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_workflow_id
      ON wrkflw_workflow_runs(workflow_id)
    `);

		await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_status
      ON wrkflw_workflow_runs(status)
    `);
	}

	// Get row count from old table
	const countResult = await sqlite.execute({
		sql: "SELECT COUNT(*) as count FROM workflow_runs",
		args: [],
	});
	const rowCount = countResult.rows[0][0] as number;

	// Copy data from old table to new table
	if (rowCount > 0) {
		await sqlite.execute(`
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
    `);
	}

	// Optionally drop old table
	if (dropOldTable) {
		await sqlite.execute("DROP TABLE workflow_runs");
		// Also drop old indexes if they exist
		await sqlite.execute("DROP INDEX IF EXISTS idx_workflow_runs_workflow_id");
		await sqlite.execute("DROP INDEX IF EXISTS idx_workflow_runs_status");

		return {
			migrated: true,
			rowCount,
			message: `Successfully migrated ${rowCount} rows from 'workflow_runs' to 'wrkflw_workflow_runs' and dropped old table`,
		};
	}

	return {
		migrated: true,
		rowCount,
		message: `Successfully migrated ${rowCount} rows from 'workflow_runs' to 'wrkflw_workflow_runs'. Old table preserved for safety.`,
	};
}

/**
 * Runs all pending migrations
 *
 * This function should be called during application initialization
 * to ensure all tables are up to date with the latest schema.
 *
 * @param options - Migration options
 * @param options.dropOldTables - Whether to drop old tables after migration
 * @returns Array of migration results
 */
export async function runMigrations(
	options: { dropOldTables?: boolean } = {},
): Promise<Array<{ migrated: boolean; rowCount: number; message: string }>> {
	const results = [];

	// Run workflow_runs migration
	const workflowRunsResult = await migrateWorkflowRunsTable(
		options.dropOldTables ?? false,
	);
	results.push(workflowRunsResult);

	return results;
}

/**
 * Export SQL script for manual migration
 *
 * Generates SQL statements that can be run manually to migrate tables.
 * Useful for users who want to review migration steps before running them.
 *
 * @param dropOldTable - Whether to include DROP TABLE statements
 * @returns SQL migration script as a string
 */
export function generateMigrationSQL(dropOldTable = false): string {
	const sql = `
-- Migration Script: Normalize table naming to wrkflw_ prefix
-- Generated: ${new Date().toISOString()}

-- Step 1: Create new table with wrkflw_ prefix
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

-- Step 2: Create indexes for new table
CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_workflow_id
ON wrkflw_workflow_runs(workflow_id);

CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_status
ON wrkflw_workflow_runs(status);

-- Step 3: Copy data from old table to new table (if old table exists)
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
${
	dropOldTable
		? `
-- Step 4: Drop old table and indexes (CAUTION: This is irreversible!)
DROP TABLE IF EXISTS workflow_runs;
DROP INDEX IF EXISTS idx_workflow_runs_workflow_id;
DROP INDEX IF EXISTS idx_workflow_runs_status;
`
		: `
-- Step 4: Old table preserved for safety
-- To drop the old table manually, run:
-- DROP TABLE workflow_runs;
-- DROP INDEX IF EXISTS idx_workflow_runs_workflow_id;
-- DROP INDEX IF EXISTS idx_workflow_runs_status;
`
}
-- Migration complete!
`.trim();

	return sql;
}
