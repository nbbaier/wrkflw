/**
 * Workflow Visualization Example
 *
 * This example demonstrates how to visualize workflows using the built-in
 * visualization features. It shows both static workflow structure visualization
 * and dynamic execution state visualization.
 */

import { z } from "npm:zod@^3.23";
import { createStep, createWorkflow } from "../backend/index.ts";

// Define steps for a simple data processing workflow
const fetchData = createStep({
	id: "fetch-data",
	description: "Fetch data from API",
	inputSchema: z.object({ url: z.string() }),
	outputSchema: z.object({ data: z.array(z.any()) }),
	execute: async ({ inputData }) => {
		console.log(`Fetching from ${inputData.url}...`);
		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 100));
		return {
			data: [
				{ id: 1, name: "Item 1", value: 100 },
				{ id: 2, name: "Item 2", value: 200 },
				{ id: 3, name: "Item 3", value: 50 },
			],
		};
	},
});

const filterData = createStep({
	id: "filter-data",
	description: "Filter items by threshold",
	inputSchema: z.object({ data: z.array(z.any()) }),
	outputSchema: z.object({ filtered: z.array(z.any()) }),
	execute: async ({ inputData }) => {
		console.log(`Filtering ${inputData.data.length} items...`);
		const threshold = 75;
		const filtered = inputData.data.filter((item) => item.value > threshold);
		return { filtered };
	},
});

const transformData = createStep({
	id: "transform-data",
	description: "Transform data to summary format",
	inputSchema: z.object({ filtered: z.array(z.any()) }),
	outputSchema: z.object({
		total: z.number(),
		count: z.number(),
		items: z.array(z.string()),
	}),
	execute: async ({ inputData }) => {
		console.log(`Transforming ${inputData.filtered.length} items...`);
		const total = inputData.filtered.reduce(
			(sum, item) => sum + item.value,
			0,
		);
		const count = inputData.filtered.length;
		const items = inputData.filtered.map((item) => item.name);
		return { total, count, items };
	},
});

const saveResults = createStep({
	id: "save-results",
	description: "Save results to database",
	inputSchema: z.object({
		total: z.number(),
		count: z.number(),
		items: z.array(z.string()),
	}),
	outputSchema: z.object({ saved: z.boolean(), recordId: z.string() }),
	execute: async ({ inputData }) => {
		console.log(`Saving ${inputData.count} results...`);
		// Simulate database save
		await new Promise((resolve) => setTimeout(resolve, 100));
		return {
			saved: true,
			recordId: crypto.randomUUID(),
		};
	},
});

// Create workflow
const dataProcessingWorkflow = createWorkflow({
	id: "data-processing",
	description: "Fetch, filter, transform, and save data",
	inputSchema: z.object({ url: z.string() }),
	outputSchema: z.object({ saved: z.boolean(), recordId: z.string() }),
})
	.then(fetchData)
	.then(filterData)
	.then(transformData)
	.then(saveResults)
	.commit();

// Example 1: Visualize static workflow structure
console.log("=".repeat(60));
console.log("STATIC WORKFLOW VISUALIZATION");
console.log("=".repeat(60));
console.log();

const staticDiagram = dataProcessingWorkflow.visualize("mermaid", {
	includeDescriptions: true,
});
console.log(staticDiagram);
console.log();

// Example 2: Execute workflow and visualize execution state
console.log("=".repeat(60));
console.log("EXECUTING WORKFLOW");
console.log("=".repeat(60));
console.log();

const run = await dataProcessingWorkflow.createRun();

// You could visualize during execution in a real scenario
// For this example, we'll execute and then visualize the final state
const result = await run.start({
	inputData: { url: "https://api.example.com/data" },
});

console.log("Workflow completed!");
console.log("Result:", result);
console.log();

// Example 3: Visualize execution state
console.log("=".repeat(60));
console.log("EXECUTION STATE VISUALIZATION");
console.log("=".repeat(60));
console.log();

const executionDiagram = await run.visualize("mermaid", {
	includeDescriptions: true,
	highlightCurrentStep: true,
	showStatus: true,
});

if (executionDiagram) {
	console.log(executionDiagram);
} else {
	console.log("No execution snapshot available");
}
console.log();

// Example 4: Compact visualization without descriptions
console.log("=".repeat(60));
console.log("COMPACT VISUALIZATION");
console.log("=".repeat(60));
console.log();

const compactDiagram = dataProcessingWorkflow.visualize("mermaid", {
	includeDescriptions: false,
});
console.log(compactDiagram);
console.log();

console.log("=".repeat(60));
console.log("To render these diagrams:");
console.log("1. Copy the Mermaid code");
console.log("2. Paste into https://mermaid.live");
console.log("3. Or use a Markdown renderer that supports Mermaid");
console.log("=".repeat(60));
