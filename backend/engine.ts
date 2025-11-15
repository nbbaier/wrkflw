import type { WorkflowStorage } from "./storage.ts";
import type {
	ExecutionContext,
	Step,
	StepExecutionContext,
	StepResult,
} from "./types.ts";
import type { Workflow } from "./workflow.ts";

/**
 * Execution engine that runs workflows step by step
 */
export class ExecutionEngine {
	constructor(private storage: WorkflowStorage) {}

	/**
	 * Execute a workflow from start to finish
	 */
	async execute<TInput, TOutput, TState>(params: {
		workflow: Workflow<any, any, TInput, TOutput, TState>;
		runId: string;
		inputData: TInput;
		initialState?: TState;
	}): Promise<TOutput> {
		const { workflow, runId, inputData, initialState } = params;

		// Validate input data at runtime
		const validatedInput = workflow.inputSchema.parse(inputData);

		// Initialize execution context
		const context: ExecutionContext<TState> = {
			workflowId: workflow.id,
			runId,
			executionPath: [],
			stepResults: {},
			state:
				initialState ??
				(workflow.stateSchema ? ({} as TState) : undefined as unknown as TState),
			inputData: validatedInput,
		};

		// Save initial snapshot
		await this.storage.saveSnapshot({
			runId,
			workflowId: workflow.id,
			status: "running",
			executionPath: context.executionPath,
			stepResults: context.stepResults,
			state: context.state,
			inputData: validatedInput,
			timestamp: Date.now(),
		});

		try {
			// Execute all steps sequentially
			let currentOutput: unknown = validatedInput;

			for (let i = 0; i < workflow.stepFlow.length; i++) {
				context.executionPath.push(i);

				const entry = workflow.stepFlow[i];

				if (entry.type === "step") {
					const result = await this.executeStep(
						entry.step,
						context,
						currentOutput,
					);

					context.stepResults[entry.step.id] = result;

					if (result.status === "failed") {
						// Save failed state
						await this.storage.saveSnapshot({
							runId,
							workflowId: workflow.id,
							status: "failed",
							executionPath: context.executionPath,
							stepResults: context.stepResults,
							state: context.state,
							inputData: validatedInput,
							error: result.error.message,
							timestamp: Date.now(),
						});

						throw result.error;
					}

					if (result.status === "success") {
						currentOutput = result.output;
					}

					// Save progress after each step
					await this.storage.saveSnapshot({
						runId,
						workflowId: workflow.id,
						status: "running",
						executionPath: context.executionPath,
						stepResults: context.stepResults,
						state: context.state,
						inputData: validatedInput,
						timestamp: Date.now(),
					});
				}
			}

			// Validate output
			const validatedOutput = workflow.outputSchema.parse(currentOutput);

			// Save success state
			await this.storage.saveSnapshot({
				runId,
				workflowId: workflow.id,
				status: "success",
				executionPath: context.executionPath,
				stepResults: context.stepResults,
				state: context.state,
				inputData: validatedInput,
				result: validatedOutput,
				timestamp: Date.now(),
			});

			return validatedOutput;
		} catch (error) {
			// If error wasn't already saved (e.g., validation error)
			await this.storage.saveSnapshot({
				runId,
				workflowId: workflow.id,
				status: "failed",
				executionPath: context.executionPath,
				stepResults: context.stepResults,
				state: context.state,
				inputData: validatedInput,
				error: error instanceof Error ? error.message : String(error),
				timestamp: Date.now(),
			});

			throw error;
		}
	}

	/**
	 * Execute a single step
	 */
	private async executeStep<TInput, TOutput, TState>(
		step: Step<string, TInput, TOutput, TState>,
		context: ExecutionContext<TState>,
		inputData: unknown,
	): Promise<StepResult<TOutput>> {
		const timestamp = Date.now();

		try {
			// Validate input data at runtime
			const validatedInput = step.inputSchema.parse(inputData);

			// Build step execution context
			const stepContext: StepExecutionContext<TInput, TState> = {
				inputData: validatedInput,
				state: context.state,
				setState: (newState: TState) => {
					context.state = newState;
				},
				getStepResult: <T extends Step<string, unknown, unknown, unknown>>(targetStep: T) => {
					const result = context.stepResults[targetStep.id];
					if (!result) {
						throw new Error(`Step ${targetStep.id} has not been executed yet`);
					}
					if (result.status !== "success") {
						throw new Error(
							`Step ${targetStep.id} did not complete successfully`,
						);
					}
					return result.output;
				},
				getInitData: () => context.inputData as any,
				runId: context.runId,
				workflowId: context.workflowId,
			};

			// Execute the step
			const output = await step.execute(stepContext);

			// Validate output at runtime
			const validatedOutput = step.outputSchema.parse(output);

			return {
				status: "success",
				output: validatedOutput,
				timestamp,
			};
		} catch (error) {
			return {
				status: "failed",
				error: error instanceof Error ? error : new Error(String(error)),
				timestamp,
			};
		}
	}
}
