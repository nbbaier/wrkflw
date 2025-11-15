import type { z } from "npm:zod@^3.23";
import { ExecutionEngine } from "./engine.ts";
import { WorkflowRun } from "./run.ts";
import { WorkflowStorage } from "./storage.ts";
import type { Step, StepFlowEntry, WorkflowConfig } from "./types.ts";

/**
 * Workflow builder with fluent API and type inference
 */
export class WorkflowBuilder<
	TSteps extends Record<string, Step<string, unknown, unknown, unknown>>,
	TWorkflowId extends string,
	TInput,
	TPrevOutput,
	TState = unknown,
> {
	constructor(
		private config: WorkflowConfig<TWorkflowId, TInput, any, TState>,
		private steps: TSteps,
		private stepFlow: StepFlowEntry[],
	) {}

	/**
	 * Add a sequential step to the workflow
	 * The step's input must match the previous step's output
	 */
	then<TStep extends Step<string, TPrevOutput, unknown, unknown>>(
		step: TStep,
	): WorkflowBuilder<
		TSteps & Record<TStep["id"], TStep>,
		TWorkflowId,
		TInput,
		z.infer<TStep["outputSchema"]>,
		TState
	> {
		const newSteps = { ...this.steps, [step.id]: step } as TSteps &
			Record<TStep["id"], TStep>;
		const newStepFlow = [...this.stepFlow, { type: "step" as const, step }];

		return new WorkflowBuilder(this.config, newSteps, newStepFlow);
	}

	/**
	 * Finalize the workflow and make it executable
	 */
	commit(): Workflow<TSteps, TWorkflowId, TInput, TPrevOutput, TState> {
		return new Workflow(this.config, this.steps, this.stepFlow);
	}
}

/**
 * Executable workflow instance
 */
export class Workflow<
	TSteps extends Record<string, Step<string, unknown, unknown, unknown>>,
	TWorkflowId extends string,
	TInput,
	TOutput,
	TState = unknown,
> {
	private engine: ExecutionEngine;
	private storage: WorkflowStorage;

	constructor(
		public readonly config: WorkflowConfig<
			TWorkflowId,
			TInput,
			TOutput,
			TState
		>,
		public readonly steps: TSteps,
		public readonly stepFlow: StepFlowEntry[],
	) {
		this.storage = new WorkflowStorage();
		this.engine = new ExecutionEngine(this.storage);
	}

	/**
	 * Initialize the workflow (creates database tables)
	 */
	async init(): Promise<void> {
		await this.storage.init();
	}

	/**
	 * Create a new workflow run instance
	 */
	async createRun(
		runId?: string,
	): Promise<WorkflowRun<TInput, TOutput, TState>> {
		// Initialize storage if not already done
		await this.init();

		const id = runId || crypto.randomUUID();
		return new WorkflowRun(this, id, this.engine, this.storage);
	}

	/**
	 * Get the workflow ID
	 */
	get id(): TWorkflowId {
		return this.config.id as TWorkflowId;
	}

	/**
	 * Get the input schema
	 */
	get inputSchema(): z.ZodSchema<TInput> {
		return this.config.inputSchema;
	}

	/**
	 * Get the output schema
	 */
	get outputSchema(): z.ZodSchema<TOutput> {
		return this.config.outputSchema as z.ZodSchema<TOutput>;
	}

	/**
	 * Get the state schema
	 */
	get stateSchema(): z.ZodSchema<TState> | undefined {
		return this.config.stateSchema;
	}
}

/**
 * Create a new workflow with strong typing
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({
 *   id: 'email-campaign',
 *   inputSchema: z.object({ userId: z.string() }),
 *   outputSchema: z.object({ sent: z.boolean() })
 * })
 *   .then(fetchUser)
 *   .then(generateEmail)
 *   .then(sendEmail)
 *   .commit();
 * ```
 */
export function createWorkflow<
	TId extends string,
	TInput,
	TOutput,
	TState = unknown,
>(
	config: WorkflowConfig<TId, TInput, TOutput, TState>,
): WorkflowBuilder<{}, TId, TInput, TInput, TState> {
	return new WorkflowBuilder(config, {}, []);
}
