import type { Workflow } from "./workflow.ts";
import type { WorkflowSnapshot } from "./types.ts";

/**
 * Visualization format types
 */
export type VisualizationFormat = "mermaid" | "json" | "ascii" | "dot";

/**
 * Options for visualization
 */
export interface VisualizationOptions {
	/** Include schema information in visualization */
	includeSchemas?: boolean;
	/** Include step descriptions */
	includeDescriptions?: boolean;
}

/**
 * Options for execution visualization
 */
export interface ExecutionVisualizationOptions extends VisualizationOptions {
	/** Highlight the current/last executed step */
	highlightCurrentStep?: boolean;
	/** Show step execution status */
	showStatus?: boolean;
	/** Show step results */
	showResults?: boolean;
}

/**
 * Visualize a workflow's structure
 *
 * @param workflow - The workflow to visualize
 * @param format - The output format (default: "mermaid")
 * @param options - Visualization options
 * @returns Visualization string in the specified format
 *
 * @example
 * ```typescript
 * const diagram = visualizeWorkflow(workflow, "mermaid");
 * console.log(diagram);
 * ```
 */
export function visualizeWorkflow(
	workflow: Workflow<any, any, any, any, any>,
	format: VisualizationFormat = "mermaid",
	options: VisualizationOptions = {},
): string {
	switch (format) {
		case "mermaid":
			return generateMermaidWorkflow(workflow, options);
		case "json":
			throw new Error("JSON format not yet implemented");
		case "ascii":
			throw new Error("ASCII format not yet implemented");
		case "dot":
			throw new Error("DOT format not yet implemented");
		default:
			throw new Error(`Unknown visualization format: ${format}`);
	}
}

/**
 * Visualize a workflow execution with state information
 *
 * @param workflow - The workflow being executed
 * @param snapshot - The execution snapshot
 * @param format - The output format (default: "mermaid")
 * @param options - Visualization options
 * @returns Visualization string in the specified format
 *
 * @example
 * ```typescript
 * const snapshot = await run.getSnapshot();
 * if (snapshot) {
 *   const diagram = visualizeExecution(workflow, snapshot, "mermaid", {
 *     highlightCurrentStep: true,
 *     showStatus: true
 *   });
 *   console.log(diagram);
 * }
 * ```
 */
export function visualizeExecution(
	workflow: Workflow<any, any, any, any, any>,
	snapshot: WorkflowSnapshot,
	format: VisualizationFormat = "mermaid",
	options: ExecutionVisualizationOptions = {},
): string {
	switch (format) {
		case "mermaid":
			return generateMermaidExecution(workflow, snapshot, options);
		case "json":
			throw new Error("JSON format not yet implemented");
		case "ascii":
			throw new Error("ASCII format not yet implemented");
		case "dot":
			throw new Error("DOT format not yet implemented");
		default:
			throw new Error(`Unknown visualization format: ${format}`);
	}
}

/**
 * Generate Mermaid diagram for workflow structure
 */
function generateMermaidWorkflow(
	workflow: Workflow<any, any, any, any, any>,
	options: VisualizationOptions,
): string {
	const lines: string[] = [];
	const { includeDescriptions = true } = options;

	// Start with graph definition
	lines.push("graph TD");

	// Add workflow title/description as comment
	if (workflow.config.description) {
		lines.push(`  %% ${workflow.config.description}`);
	}

	// Start node
	const startLabel = workflow.config.id;
	lines.push(`  Start([${startLabel}])`);

	// Generate step nodes
	const stepIds = workflow.stepFlow.map((entry) => entry.step.id);

	stepIds.forEach((stepId, index) => {
		const step = workflow.steps[stepId];
		if (!step) return;

		const nodeId = sanitizeNodeId(stepId);
		let label = stepId;

		if (includeDescriptions && step.description) {
			label = `${stepId}<br/><small>${step.description}</small>`;
		}

		// Create step node
		lines.push(`  ${nodeId}[${label}]`);

		// Connect from Start to first step, or from previous step
		if (index === 0) {
			lines.push(`  Start --> ${nodeId}`);
		} else {
			const prevNodeId = sanitizeNodeId(stepIds[index - 1]);
			lines.push(`  ${prevNodeId} --> ${nodeId}`);
		}
	});

	// End node
	lines.push("  End([End])");
	if (stepIds.length > 0) {
		const lastNodeId = sanitizeNodeId(stepIds[stepIds.length - 1]);
		lines.push(`  ${lastNodeId} --> End`);
	} else {
		lines.push("  Start --> End");
	}

	// Add styling
	lines.push("");
	lines.push("  classDef default fill:#e1f5ff,stroke:#01579b,stroke-width:2px");
	lines.push("  classDef startEnd fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px");
	lines.push("  class Start,End startEnd");

	return lines.join("\n");
}

/**
 * Generate Mermaid diagram for workflow execution with state
 */
function generateMermaidExecution(
	workflow: Workflow<any, any, any, any, any>,
	snapshot: WorkflowSnapshot,
	options: ExecutionVisualizationOptions,
): string {
	const lines: string[] = [];
	const {
		includeDescriptions = true,
		highlightCurrentStep = true,
		showStatus = true,
		showResults = false,
	} = options;

	// Start with graph definition
	lines.push("graph TD");

	// Add execution info as comment
	lines.push(`  %% Workflow: ${workflow.config.id}`);
	lines.push(`  %% Run ID: ${snapshot.runId}`);
	lines.push(`  %% Status: ${snapshot.status}`);
	if (snapshot.error) {
		lines.push(`  %% Error: ${snapshot.error}`);
	}

	// Start node
	const startLabel = workflow.config.id;
	const startStatus = snapshot.status !== "running" || snapshot.executionPath.length > 0
		? "✓"
		: "●";
	lines.push(`  Start([${startStatus} ${startLabel}])`);

	// Generate step nodes with execution state
	const stepIds = workflow.stepFlow.map((entry) => entry.step.id);
	const executedStepIndices = new Set(snapshot.executionPath);
	const lastExecutedIndex = snapshot.executionPath.length > 0
		? snapshot.executionPath[snapshot.executionPath.length - 1]
		: -1;

	stepIds.forEach((stepId, index) => {
		const step = workflow.steps[stepId];
		if (!step) return;

		const nodeId = sanitizeNodeId(stepId);
		const stepResult = snapshot.stepResults[stepId];
		const isExecuted = executedStepIndices.has(index);
		const isCurrent = highlightCurrentStep && index === lastExecutedIndex &&
			snapshot.status === "running";

		// Build label
		let label = stepId;
		let statusIcon = "";

		if (showStatus && stepResult) {
			switch (stepResult.status) {
				case "success":
					statusIcon = "✓ ";
					break;
				case "failed":
					statusIcon = "✗ ";
					break;
				case "running":
					statusIcon = "● ";
					break;
			}
		} else if (isExecuted) {
			statusIcon = "✓ ";
		} else if (isCurrent) {
			statusIcon = "● ";
		}

		label = `${statusIcon}${stepId}`;

		if (includeDescriptions && step.description) {
			label += `<br/><small>${step.description}</small>`;
		}

		if (showResults && stepResult && stepResult.status === "failed") {
			const errorMsg = stepResult.error.message.substring(0, 50);
			label += `<br/><small style='color:red'>${errorMsg}</small>`;
		}

		// Create step node
		lines.push(`  ${nodeId}[${label}]`);

		// Connect from Start to first step, or from previous step
		if (index === 0) {
			lines.push(`  Start --> ${nodeId}`);
		} else {
			const prevNodeId = sanitizeNodeId(stepIds[index - 1]);
			lines.push(`  ${prevNodeId} --> ${nodeId}`);
		}
	});

	// End node
	const endStatus = snapshot.status === "success"
		? "✓"
		: snapshot.status === "failed"
		? "✗"
		: "○";
	lines.push(`  End([${endStatus} End])`);
	if (stepIds.length > 0) {
		const lastNodeId = sanitizeNodeId(stepIds[stepIds.length - 1]);
		lines.push(`  ${lastNodeId} --> End`);
	} else {
		lines.push("  Start --> End");
	}

	// Add styling based on execution state
	lines.push("");
	lines.push("  classDef default fill:#e1f5ff,stroke:#01579b,stroke-width:2px");
	lines.push("  classDef startEnd fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px");
	lines.push("  classDef success fill:#c8e6c9,stroke:#2e7d32,stroke-width:2px");
	lines.push("  classDef failed fill:#ffcdd2,stroke:#c62828,stroke-width:2px");
	lines.push("  classDef running fill:#fff9c4,stroke:#f57f17,stroke-width:3px");
	lines.push("  classDef pending fill:#f5f5f5,stroke:#9e9e9e,stroke-width:1px");

	// Apply classes
	lines.push("  class Start,End startEnd");

	stepIds.forEach((stepId, index) => {
		const nodeId = sanitizeNodeId(stepId);
		const stepResult = snapshot.stepResults[stepId];
		const isExecuted = executedStepIndices.has(index);
		const isCurrent = highlightCurrentStep && index === lastExecutedIndex &&
			snapshot.status === "running";

		if (isCurrent) {
			lines.push(`  class ${nodeId} running`);
		} else if (stepResult) {
			if (stepResult.status === "success") {
				lines.push(`  class ${nodeId} success`);
			} else if (stepResult.status === "failed") {
				lines.push(`  class ${nodeId} failed`);
			}
		} else if (!isExecuted) {
			lines.push(`  class ${nodeId} pending`);
		}
	});

	return lines.join("\n");
}

/**
 * Sanitize step ID to be a valid Mermaid node ID
 */
function sanitizeNodeId(id: string): string {
	// Replace hyphens and special characters with underscores
	return id.replace(/[^a-zA-Z0-9_]/g, "_");
}
