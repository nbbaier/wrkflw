/**
 * Simple examples demonstrating prebuilt workflow steps
 *
 * Each example shows a practical use case for the prebuilt steps
 */

import { z } from "npm:zod@^3.23";
import {
	createStep,
	createWorkflow,
	delay,
	filterArray,
	httpGet,
	logger,
	mapArray,
	pickFields,
	template,
} from "../backend/index.ts";

// ============================================================================
// Example 1: API Data Processing
// ============================================================================

/**
 * Fetch data from JSONPlaceholder API and process it
 */
const apiDataWorkflow = createWorkflow({
	id: "api-data-processing",
	description: "Fetch and process posts from JSONPlaceholder API",
	inputSchema: z.object({
		url: z.string().url(),
	}),
	outputSchema: z.object({
		status: z.number(),
		data: z.unknown(),
		headers: z.record(z.string()),
	}),
})
	.then(httpGet)
	.commit();

// ============================================================================
// Example 2: Template String Generation
// ============================================================================

const templateWorkflow = createWorkflow({
	id: "template-generation",
	description: "Generate personalized message from template",
	inputSchema: z.object({
		template: z.string(),
		variables: z.record(z.union([z.string(), z.number(), z.boolean()])),
	}),
	outputSchema: z.object({
		result: z.string(),
	}),
})
	.then(template)
	.commit();

// ============================================================================
// Example 3: Array Filtering
// ============================================================================

const filterWorkflow = createWorkflow({
	id: "filter-workflow",
	description: "Filter array of numbers",
	inputSchema: z.object({
		array: z.array(z.unknown()),
		filterFn: z.string(),
	}),
	outputSchema: z.object({
		filtered: z.array(z.unknown()),
		originalCount: z.number(),
		filteredCount: z.number(),
	}),
})
	.then(filterArray)
	.commit();

// ============================================================================
// Example 4: Multi-step workflow with custom steps
// ============================================================================

// Custom step to prepare API request
const prepareRequest = createStep({
	id: "prepare-request",
	inputSchema: z.object({
		userId: z.number(),
	}),
	outputSchema: z.object({
		url: z.string().url(),
		headers: z.record(z.string()).optional(),
		queryParams: z.record(z.string()).optional(),
	}),
	execute: async ({ inputData }) => {
		return {
			url: `https://jsonplaceholder.typicode.com/posts`,
			queryParams: {
				userId: String(inputData.userId),
			},
		};
	},
});

// Custom step to extract titles
const extractTitles = createStep({
	id: "extract-titles",
	inputSchema: z.object({
		status: z.number(),
		data: z.unknown(),
		headers: z.record(z.string()),
	}),
	outputSchema: z.object({
		array: z.array(z.unknown()),
		mapFn: z.string(),
	}),
	execute: async ({ inputData }) => {
		const posts = inputData.data as any[];
		return {
			array: posts,
			mapFn: "(post) => post.title",
		};
	},
});

// Custom step to format final output
const formatTitles = createStep({
	id: "format-titles",
	inputSchema: z.object({
		mapped: z.array(z.unknown()),
		count: z.number(),
	}),
	outputSchema: z.object({
		titles: z.array(z.string()),
		count: z.number(),
	}),
	execute: async ({ inputData }) => {
		return {
			titles: inputData.mapped as string[],
			count: inputData.count,
		};
	},
});

// Build the workflow
const userPostsWorkflow = createWorkflow({
	id: "user-posts-workflow",
	description: "Fetch posts for a user and extract titles",
	inputSchema: z.object({
		userId: z.number(),
	}),
	outputSchema: z.object({
		titles: z.array(z.string()),
		count: z.number(),
	}),
})
	.then(prepareRequest) // Convert userId to API request
	.then(httpGet) // Fetch from API
	.then(extractTitles) // Prepare for mapping
	.then(mapArray) // Extract titles
	.then(formatTitles) // Format output
	.commit();

// ============================================================================
// Example 5: Logging and Delays
// ============================================================================

// Custom step to prepare log data
const prepareLog = createStep({
	id: "prepare-log",
	inputSchema: z.object({
		message: z.string(),
	}),
	outputSchema: z.object({
		level: z.enum(["debug", "info", "warn", "error"]),
		message: z.string(),
		data: z.unknown().optional(),
	}),
	execute: async ({ inputData }) => {
		return {
			level: "info" as const,
			message: inputData.message,
			data: { timestamp: Date.now() },
		};
	},
});

// Custom step to prepare delay
const prepareDelay = createStep({
	id: "prepare-delay",
	inputSchema: z.object({
		level: z.enum(["debug", "info", "warn", "error"]),
		message: z.string(),
		data: z.unknown().optional(),
		timestamp: z.string(),
	}),
	outputSchema: z.object({
		durationMs: z.number(),
	}),
	execute: async ({ inputData }) => {
		return {
			durationMs: 2000, // 2 second delay
		};
	},
});

// Custom step for final message
const finalMessage = createStep({
	id: "final-message",
	inputSchema: z.object({
		durationMs: z.number(),
		completedAt: z.string(),
	}),
	outputSchema: z.object({
		message: z.string(),
		completedAt: z.string(),
	}),
	execute: async ({ inputData }) => {
		return {
			message: `Completed after ${inputData.durationMs}ms delay`,
			completedAt: inputData.completedAt,
		};
	},
});

const logDelayWorkflow = createWorkflow({
	id: "log-delay-workflow",
	description: "Log a message, wait, then complete",
	inputSchema: z.object({
		message: z.string(),
	}),
	outputSchema: z.object({
		message: z.string(),
		completedAt: z.string(),
	}),
})
	.then(prepareLog)
	.then(logger)
	.then(prepareDelay)
	.then(delay)
	.then(finalMessage)
	.commit();

// ============================================================================
// Run Examples
// ============================================================================

if (import.meta.main) {
	console.log("=".repeat(60));
	console.log("Prebuilt Steps Examples");
	console.log("=".repeat(60));

	// Example 1: Simple HTTP GET
	console.log("\n[Example 1] Simple HTTP GET");
	console.log("-".repeat(60));
	try {
		const run1 = await apiDataWorkflow.createRun();
		const result1 = await run1.start({
			inputData: {
				url: "https://jsonplaceholder.typicode.com/posts/1",
			},
		});
		console.log("Status:", result1.status);
		console.log("Data:", result1.data);
	} catch (error) {
		console.error("Error:", error);
	}

	// Example 2: Template String
	console.log("\n[Example 2] Template String");
	console.log("-".repeat(60));
	try {
		const run2 = await templateWorkflow.createRun();
		const result2 = await run2.start({
			inputData: {
				template: "Hello {{name}}! You have {{count}} new messages.",
				variables: {
					name: "Alice",
					count: 5,
				},
			},
		});
		console.log("Result:", result2.result);
	} catch (error) {
		console.error("Error:", error);
	}

	// Example 3: Array Filtering
	console.log("\n[Example 3] Array Filtering");
	console.log("-".repeat(60));
	try {
		const run3 = await filterWorkflow.createRun();
		const result3 = await run3.start({
			inputData: {
				array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
				filterFn: "(n) => n % 2 === 0", // Even numbers only
			},
		});
		console.log("Original count:", result3.originalCount);
		console.log("Filtered count:", result3.filteredCount);
		console.log("Filtered values:", result3.filtered);
	} catch (error) {
		console.error("Error:", error);
	}

	// Example 4: Multi-step Workflow
	console.log("\n[Example 4] Multi-step User Posts Workflow");
	console.log("-".repeat(60));
	try {
		const run4 = await userPostsWorkflow.createRun();
		const result4 = await run4.start({
			inputData: {
				userId: 1,
			},
		});
		console.log("Post count:", result4.count);
		console.log("First 3 titles:", result4.titles.slice(0, 3));
	} catch (error) {
		console.error("Error:", error);
	}

	// Example 5: Logging and Delays
	console.log("\n[Example 5] Logging and Delays");
	console.log("-".repeat(60));
	try {
		const run5 = await logDelayWorkflow.createRun();
		const result5 = await run5.start({
			inputData: {
				message: "Starting workflow with delay...",
			},
		});
		console.log("Result:", result5.message);
		console.log("Completed at:", result5.completedAt);
	} catch (error) {
		console.error("Error:", error);
	}

	console.log("\n" + "=".repeat(60));
	console.log("All examples completed!");
	console.log("=".repeat(60));
}
