/**
 * Prebuilt workflow steps for common tasks
 *
 * These steps provide ready-to-use functionality for:
 * - HTTP/API requests
 * - String templating
 * - Timing/delays
 * - Logging
 * - Data transformation
 */

import { z } from "npm:zod@^3.23";
import { createStep } from "./step.ts";

// ============================================================================
// HTTP/API Steps
// ============================================================================

/**
 * Make a GET request to a URL
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(httpGet)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     url: 'https://api.example.com/users',
 *     headers: { 'Authorization': 'Bearer token' }
 *   }
 * });
 * ```
 */
export const httpGet = createStep({
	id: "http-get",
	description: "Make a GET request and return the JSON response",
	inputSchema: z.object({
		url: z.string().url(),
		headers: z.record(z.string()).optional(),
		queryParams: z.record(z.string()).optional(),
	}),
	outputSchema: z.object({
		status: z.number(),
		data: z.unknown(),
		headers: z.record(z.string()),
	}),
	execute: async ({ inputData }) => {
		const { url, headers, queryParams } = inputData;

		// Build URL with query parameters
		const urlObj = new URL(url);
		if (queryParams) {
			Object.entries(queryParams).forEach(([key, value]) => {
				urlObj.searchParams.append(key, value);
			});
		}

		const response = await fetch(urlObj.toString(), {
			method: "GET",
			headers: headers || {},
		});

		const data = await response.json();

		// Convert Headers object to plain object
		const responseHeaders: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		return {
			status: response.status,
			data,
			headers: responseHeaders,
		};
	},
});

/**
 * Make a POST request with JSON body
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(httpPost)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     url: 'https://api.example.com/users',
 *     body: { name: 'John', email: 'john@example.com' }
 *   }
 * });
 * ```
 */
export const httpPost = createStep({
	id: "http-post",
	description: "Make a POST request with JSON body and return the response",
	inputSchema: z.object({
		url: z.string().url(),
		body: z.unknown(),
		headers: z.record(z.string()).optional(),
	}),
	outputSchema: z.object({
		status: z.number(),
		data: z.unknown(),
		headers: z.record(z.string()),
	}),
	execute: async ({ inputData }) => {
		const { url, body, headers } = inputData;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers,
			},
			body: JSON.stringify(body),
		});

		const data = await response.json();

		// Convert Headers object to plain object
		const responseHeaders: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			responseHeaders[key] = value;
		});

		return {
			status: response.status,
			data,
			headers: responseHeaders,
		};
	},
});

// ============================================================================
// String/Template Steps
// ============================================================================

/**
 * Template string interpolation with variable substitution
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(template)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     template: 'Hello {{name}}, your order #{{orderId}} is ready!',
 *     variables: { name: 'John', orderId: '12345' }
 *   }
 * });
 * // Output: { result: 'Hello John, your order #12345 is ready!' }
 * ```
 */
export const template = createStep({
	id: "template",
	description: "Interpolate variables into a template string using {{variable}} syntax",
	inputSchema: z.object({
		template: z.string(),
		variables: z.record(z.union([z.string(), z.number(), z.boolean()])),
	}),
	outputSchema: z.object({
		result: z.string(),
	}),
	execute: async ({ inputData }) => {
		const { template: templateStr, variables } = inputData;

		const result = templateStr.replace(/\{\{(\w+)\}\}/g, (match, key) => {
			if (key in variables) {
				return String(variables[key]);
			}
			return match; // Keep original if variable not found
		});

		return { result };
	},
});

// ============================================================================
// Utility Steps
// ============================================================================

/**
 * Delay/sleep for a specified duration
 *
 * Useful for rate limiting, waiting between API calls, or timing-sensitive workflows
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(delay)
 *   .then(apiCall)
 *   .commit();
 *
 * await run.start({
 *   inputData: { durationMs: 2000 } // Wait 2 seconds
 * });
 * ```
 */
export const delay = createStep({
	id: "delay",
	description: "Wait for a specified duration in milliseconds",
	inputSchema: z.object({
		durationMs: z.number().min(0).max(300000), // Max 5 minutes
	}),
	outputSchema: z.object({
		durationMs: z.number(),
		completedAt: z.string(),
	}),
	execute: async ({ inputData }) => {
		const { durationMs } = inputData;

		await new Promise((resolve) => setTimeout(resolve, durationMs));

		return {
			durationMs,
			completedAt: new Date().toISOString(),
		};
	},
});

/**
 * Structured logging step
 *
 * Logs data at different levels and passes input through unchanged.
 * Useful for debugging workflow execution.
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(fetchData)
 *   .then(logger) // Log the data for debugging
 *   .then(processData)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     level: 'info',
 *     message: 'Processing user data',
 *     data: { userId: '123' }
 *   }
 * });
 * ```
 */
export const logger = createStep({
	id: "logger",
	description: "Log data at different levels (debug, info, warn, error) and pass through",
	inputSchema: z.object({
		level: z.enum(["debug", "info", "warn", "error"]).default("info"),
		message: z.string(),
		data: z.unknown().optional(),
	}),
	outputSchema: z.object({
		level: z.enum(["debug", "info", "warn", "error"]),
		message: z.string(),
		data: z.unknown().optional(),
		timestamp: z.string(),
	}),
	execute: async ({ inputData, runId, workflowId }) => {
		const { level, message, data } = inputData;
		const timestamp = new Date().toISOString();

		const logEntry = {
			timestamp,
			level,
			workflowId,
			runId,
			message,
			...(data && { data }),
		};

		// Use appropriate console method
		switch (level) {
			case "debug":
				console.debug(logEntry);
				break;
			case "info":
				console.info(logEntry);
				break;
			case "warn":
				console.warn(logEntry);
				break;
			case "error":
				console.error(logEntry);
				break;
		}

		return {
			level,
			message,
			data,
			timestamp,
		};
	},
});

// ============================================================================
// Data Transformation Steps
// ============================================================================

/**
 * Filter array items based on a condition
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(filterArray)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     array: [
 *       { name: 'Alice', age: 30 },
 *       { name: 'Bob', age: 17 },
 *       { name: 'Charlie', age: 25 }
 *     ],
 *     filterFn: '(item) => item.age >= 18'
 *   }
 * });
 * // Output: { filtered: [{ name: 'Alice', age: 30 }, { name: 'Charlie', age: 25 }] }
 * ```
 */
export const filterArray = createStep({
	id: "filter-array",
	description: "Filter array items using a JavaScript filter function (as string)",
	inputSchema: z.object({
		array: z.array(z.unknown()),
		filterFn: z.string(), // JavaScript function as string: "(item) => condition"
	}),
	outputSchema: z.object({
		filtered: z.array(z.unknown()),
		originalCount: z.number(),
		filteredCount: z.number(),
	}),
	execute: async ({ inputData }) => {
		const { array, filterFn } = inputData;

		// Create function from string
		// Note: In production, consider security implications of eval
		// For Val Town personal automation, this provides flexibility
		const filterFunction = eval(filterFn);

		const filtered = array.filter(filterFunction);

		return {
			filtered,
			originalCount: array.length,
			filteredCount: filtered.length,
		};
	},
});

/**
 * Transform array items using a map function
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(mapArray)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     array: [1, 2, 3, 4],
 *     mapFn: '(item) => item * 2'
 *   }
 * });
 * // Output: { mapped: [2, 4, 6, 8] }
 * ```
 */
export const mapArray = createStep({
	id: "map-array",
	description: "Transform array items using a JavaScript map function (as string)",
	inputSchema: z.object({
		array: z.array(z.unknown()),
		mapFn: z.string(), // JavaScript function as string: "(item) => transformed"
	}),
	outputSchema: z.object({
		mapped: z.array(z.unknown()),
		count: z.number(),
	}),
	execute: async ({ inputData }) => {
		const { array, mapFn } = inputData;

		// Create function from string
		const mapFunction = eval(mapFn);

		const mapped = array.map(mapFunction);

		return {
			mapped,
			count: mapped.length,
		};
	},
});

/**
 * Extract specific fields from an object
 *
 * Useful for simplifying data flow between steps by removing unnecessary fields
 *
 * @example
 * ```typescript
 * const workflow = createWorkflow({ ... })
 *   .then(pickFields)
 *   .commit();
 *
 * await run.start({
 *   inputData: {
 *     object: { id: 1, name: 'Alice', email: 'alice@example.com', password: 'secret' },
 *     fields: ['id', 'name', 'email']
 *   }
 * });
 * // Output: { result: { id: 1, name: 'Alice', email: 'alice@example.com' } }
 * ```
 */
export const pickFields = createStep({
	id: "pick-fields",
	description: "Extract specific fields from an object",
	inputSchema: z.object({
		object: z.record(z.unknown()),
		fields: z.array(z.string()),
	}),
	outputSchema: z.object({
		result: z.record(z.unknown()),
	}),
	execute: async ({ inputData }) => {
		const { object, fields } = inputData;

		const result: Record<string, unknown> = {};

		for (const field of fields) {
			if (field in object) {
				result[field] = object[field];
			}
		}

		return { result };
	},
});
