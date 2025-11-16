import { runMigrations } from "./migrations.ts";
import type { WorkflowSnapshot } from "./types.ts";

/**
 * SQLite-backed storage for workflow state
 */
export class WorkflowStorage {
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	/**
	 * Initialize the storage (create tables)
	 */
	async init(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// If initialization is already in progress, wait for it to complete
		if (this.initPromise) {
			return this.initPromise;
		}

		// Start initialization and store the promise
		this.initPromise = (async () => {
			// Note: In Val Town, import sqlite dynamically to avoid errors outside Val Town
			const { sqlite } = await import("https://esm.town/v/std/sqlite");

			// Run migrations to ensure tables are up to date
			await runMigrations({ dropOldTables: false });

			await sqlite.execute(`
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
      )
    `);

			// Create index for querying by workflow_id
			await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_workflow_id
      ON wrkflw_workflow_runs(workflow_id)
    `);

			// Create index for querying by status
			await sqlite.execute(`
      CREATE INDEX IF NOT EXISTS idx_wrkflw_workflow_runs_status
      ON wrkflw_workflow_runs(status)
    `);

			this.initialized = true;
		})();

		return this.initPromise;
	}

	/**
	 * Save a workflow snapshot
	 */
	async saveSnapshot(snapshot: WorkflowSnapshot): Promise<void> {
		const { sqlite } = await import("https://esm.town/v/std/sqlite");

		await sqlite.execute({
			sql: `
        INSERT INTO wrkflw_workflow_runs (
          run_id, workflow_id, status, execution_path,
          step_results, state, input_data, result, error, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
        ON CONFLICT(run_id) DO UPDATE SET
          status = excluded.status,
          execution_path = excluded.execution_path,
          step_results = excluded.step_results,
          state = excluded.state,
          result = excluded.result,
          error = excluded.error,
          updated_at = unixepoch()
      `,
			args: [
				snapshot.runId,
				snapshot.workflowId,
				snapshot.status,
				JSON.stringify(snapshot.executionPath),
				JSON.stringify(snapshot.stepResults),
				JSON.stringify(snapshot.state),
				JSON.stringify(snapshot.inputData),
				snapshot.result ? JSON.stringify(snapshot.result) : null,
				snapshot.error ?? null,
			],
		});
	}

	/**
	 * Load a workflow snapshot by run ID
	 */
	async loadSnapshot(runId: string): Promise<WorkflowSnapshot | null> {
		const { sqlite } = await import("https://esm.town/v/std/sqlite");

		const result = await sqlite.execute({
			sql: `
        SELECT
          run_id, workflow_id, status, execution_path,
          step_results, state, input_data, result, error, updated_at
        FROM wrkflw_workflow_runs
        WHERE run_id = ?
      `,
			args: [runId],
		});

		if (result.rows.length === 0) {
			return null;
		}

		const row = result.rows[0];

		return {
			runId: row[0] as string,
			workflowId: row[1] as string,
			status: row[2] as "running" | "success" | "failed",
			executionPath: JSON.parse(row[3] as string),
			stepResults: JSON.parse(row[4] as string),
			state: JSON.parse(row[5] as string),
			inputData: JSON.parse(row[6] as string),
			result: row[7] ? JSON.parse(row[7] as string) : undefined,
			error: row[8] as string | undefined,
			timestamp: row[9] as number,
		};
	}

	/**
	 * List workflow runs, optionally filtered by workflow ID
	 */
	async listRuns(workflowId?: string): Promise<WorkflowSnapshot[]> {
		const { sqlite } = await import("https://esm.town/v/std/sqlite");

		const result = workflowId
			? await sqlite.execute({
					sql: `
            SELECT
              run_id, workflow_id, status, execution_path,
              step_results, state, input_data, result, error, updated_at
            FROM wrkflw_workflow_runs
            WHERE workflow_id = ?
            ORDER BY updated_at DESC
          `,
					args: [workflowId],
				})
			: await sqlite.execute(`
          SELECT
            run_id, workflow_id, status, execution_path,
            step_results, state, input_data, result, error, updated_at
          FROM wrkflw_workflow_runs
          ORDER BY updated_at DESC
        `);

		return result.rows.map((row) => ({
			runId: row[0] as string,
			workflowId: row[1] as string,
			status: row[2] as "running" | "success" | "failed",
			executionPath: JSON.parse(row[3] as string),
			stepResults: JSON.parse(row[4] as string),
			state: JSON.parse(row[5] as string),
			inputData: JSON.parse(row[6] as string),
			result: row[7] ? JSON.parse(row[7] as string) : undefined,
			error: row[8] as string | undefined,
			timestamp: row[9] as number,
		}));
	}

	/**
	 * Delete a workflow run
	 */
	async deleteRun(runId: string): Promise<void> {
		const { sqlite } = await import("https://esm.town/v/std/sqlite");

		await sqlite.execute({
			sql: `DELETE FROM wrkflw_workflow_runs WHERE run_id = ?`,
			args: [runId],
		});
	}

	/**
	 * Get workflow runs by status
	 */
	async getRunsByStatus(
		status: "running" | "success" | "failed",
		workflowId?: string,
	): Promise<WorkflowSnapshot[]> {
		const { sqlite } = await import("https://esm.town/v/std/sqlite");

		const result = workflowId
			? await sqlite.execute({
					sql: `
            SELECT
              run_id, workflow_id, status, execution_path,
              step_results, state, input_data, result, error, updated_at
            FROM wrkflw_workflow_runs
            WHERE status = ? AND workflow_id = ?
            ORDER BY updated_at DESC
          `,
					args: [status, workflowId],
				})
			: await sqlite.execute({
					sql: `
            SELECT
              run_id, workflow_id, status, execution_path,
              step_results, state, input_data, result, error, updated_at
            FROM wrkflw_workflow_runs
            WHERE status = ?
            ORDER BY updated_at DESC
          `,
					args: [status],
				});

		return result.rows.map((row) => ({
			runId: row[0] as string,
			workflowId: row[1] as string,
			status: row[2] as "running" | "success" | "failed",
			executionPath: JSON.parse(row[3] as string),
			stepResults: JSON.parse(row[4] as string),
			state: JSON.parse(row[5] as string),
			inputData: JSON.parse(row[6] as string),
			result: row[7] ? JSON.parse(row[7] as string) : undefined,
			error: row[8] as string | undefined,
			timestamp: row[9] as number,
		}));
	}
}
