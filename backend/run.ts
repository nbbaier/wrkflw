import type { ExecutionEngine } from "./engine.ts";
import type { WorkflowStorage } from "./storage.ts";
import type { WorkflowSnapshot } from "./types.ts";
import type { Workflow } from "./workflow.ts";

/**
 * A workflow run instance
 */
export class WorkflowRun<TInput, TOutput, TState = unknown> {
	constructor(
		private workflow: Workflow<any, any, TInput, TOutput, TState>,
		public readonly runId: string,
		private engine: ExecutionEngine,
		private storage: WorkflowStorage,
	) {}

	/**
	 * Start the workflow execution
	 */
	async start(params: {
		inputData: TInput;
		initialState?: TState;
	}): Promise<TOutput> {
		const { inputData, initialState } = params;

		return await this.engine.execute({
			workflow: this.workflow,
			runId: this.runId,
			inputData,
			initialState,
		});
	}

	/**
	 * Get the current snapshot of this run
	 */
	async getSnapshot(): Promise<WorkflowSnapshot<TState> | null> {
		return await this.storage.loadSnapshot(this.runId) as WorkflowSnapshot<TState> | null;
	}

	/**
	 * Get the workflow ID
	 */
	get workflowId(): string {
		return this.workflow.id;
	}
}
