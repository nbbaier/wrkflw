import { Workflow } from "./workflow.ts";
import { WorkflowStorage } from "./storage.ts";
import { WorkflowSnapshot } from "./types.ts";

interface ApiWorkflowData {
  id: string;
  description?: string;
  steps: Array<{ id: string; description?: string }>;
  exampleInput?: Record<string, unknown>;
}

interface ApiRunData {
  runId: string;
  workflowId: string;
  status: "running" | "success" | "failed";
  executionPath: number[];
  stepResults: Record<string, unknown>;
  inputData: unknown;
  result?: unknown;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export class ApiServer {
  private workflows: Map<string, { workflow: Workflow<string, unknown, unknown, unknown>; exampleInput?: Record<string, unknown> }> = new Map();
  private storage: WorkflowStorage;

  constructor(storage: WorkflowStorage) {
    this.storage = storage;
  }

  registerWorkflow<TId extends string, TInput, TOutput, TState>(
    workflow: Workflow<TId, TInput, TOutput, TState>,
    exampleInput?: Record<string, unknown>,
  ) {
    this.workflows.set(workflow.id, { workflow: workflow as any, exampleInput });
  }

  private serializeWorkflow(workflowId: string): ApiWorkflowData | null {
    const entry = this.workflows.get(workflowId);
    if (!entry) return null;

    const { workflow, exampleInput } = entry;
    return {
      id: workflow.id,
      description: workflow.description,
      steps: workflow.steps.map((step) => ({
        id: step.id,
        description: step.description,
      })),
      exampleInput,
    };
  }

  private serializeRun(snapshot: WorkflowSnapshot): ApiRunData {
    return {
      runId: snapshot.runId,
      workflowId: snapshot.workflowId,
      status: snapshot.status,
      executionPath: snapshot.executionPath,
      stepResults: snapshot.stepResults,
      inputData: snapshot.inputData,
      result: snapshot.result,
      error: snapshot.error,
      createdAt: snapshot.timestamp,
      updatedAt: snapshot.timestamp,
    };
  }

  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle preflight requests
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /api/workflows - List all workflows
      if (path === "/api/workflows" && method === "GET") {
        const workflows = Array.from(this.workflows.keys()).map((id) =>
          this.serializeWorkflow(id)
        ).filter((w): w is ApiWorkflowData => w !== null);

        return new Response(JSON.stringify(workflows), { headers: corsHeaders });
      }

      // GET /api/workflows/:id - Get workflow details
      const workflowMatch = path.match(/^\/api\/workflows\/([^\/]+)$/);
      if (workflowMatch && method === "GET") {
        const workflowId = workflowMatch[1];
        const workflow = this.serializeWorkflow(workflowId);

        if (!workflow) {
          return new Response(JSON.stringify({ error: "Workflow not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify(workflow), { headers: corsHeaders });
      }

      // GET /api/workflows/:id/runs - List runs for a workflow
      const runsMatch = path.match(/^\/api\/workflows\/([^\/]+)\/runs$/);
      if (runsMatch && method === "GET") {
        const workflowId = runsMatch[1];
        const snapshots = await this.storage.listRuns(workflowId);
        const runs = snapshots.map((s) => this.serializeRun(s));

        return new Response(JSON.stringify(runs), { headers: corsHeaders });
      }

      // POST /api/workflows/:id/runs - Create a new run
      if (runsMatch && method === "POST") {
        const workflowId = runsMatch[1];
        const entry = this.workflows.get(workflowId);

        if (!entry) {
          return new Response(JSON.stringify({ error: "Workflow not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        const body = await request.json();
        const { inputData } = body;

        // Create and start the run in the background
        const run = await entry.workflow.createRun();

        // Start execution (don't await - let it run in background)
        run.start({ inputData }).catch((error) => {
          console.error(`Run ${run.runId} failed:`, error);
        });

        // Return the initial run state
        const snapshot = await this.storage.loadSnapshot(run.runId);
        if (!snapshot) {
          return new Response(JSON.stringify({ error: "Failed to create run" }), {
            status: 500,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify(this.serializeRun(snapshot)), {
          status: 201,
          headers: corsHeaders,
        });
      }

      // GET /api/runs/:runId - Get run details
      const runMatch = path.match(/^\/api\/runs\/([^\/]+)$/);
      if (runMatch && method === "GET") {
        const runId = runMatch[1];
        const snapshot = await this.storage.loadSnapshot(runId);

        if (!snapshot) {
          return new Response(JSON.stringify({ error: "Run not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        return new Response(JSON.stringify(this.serializeRun(snapshot)), {
          headers: corsHeaders,
        });
      }

      // 404 for unmatched routes
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    } catch (error) {
      console.error("API Error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }
  }

  async serve(port = 8000) {
    console.log(`API server starting on http://localhost:${port}`);

    const server = Deno.serve({ port }, (request) => this.handleRequest(request));

    return server;
  }
}

// Helper function to create and configure an API server
export function createApiServer(storage: WorkflowStorage): ApiServer {
  return new ApiServer(storage);
}
