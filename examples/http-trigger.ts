/**
 * Example: Triggering a workflow from an HTTP val
 *
 * This demonstrates how to use the workflow engine from a Val Town HTTP trigger.
 * Deploy this as an HTTP val to trigger workflows via HTTP requests.
 */

import { greetingWorkflow } from "./simple-workflow.ts";

export default async function (req: Request): Promise<Response> {
	const url = new URL(req.url);

	// Get userId from query params
	const userId = url.searchParams.get("userId");

	if (!userId) {
		return Response.json(
			{ error: "Missing userId parameter" },
			{ status: 400 },
		);
	}

	try {
		// Create and start a workflow run
		const run = await greetingWorkflow.createRun();

		const result = await run.start({
			inputData: { userId },
		});

		// Get the snapshot for debugging info
		const snapshot = await run.getSnapshot();

		return Response.json({
			success: true,
			runId: run.runId,
			result,
			steps: Object.keys(snapshot?.stepResults || {}),
			status: snapshot?.status,
		});
	} catch (error) {
		return Response.json(
			{
				success: false,
				error: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 },
		);
	}
}
