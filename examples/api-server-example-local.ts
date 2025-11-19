/**
 * Example: API Server for Workflow Visualization (Local Deno Server)
 *
 * This example demonstrates how to run a local API server that:
 * 1. Sets up workflows with an API server using Hono
 * 2. Serves workflow data via REST API
 * 3. Creates and monitors workflow runs
 * 4. Serves a React-based frontend visualizer
 *
 * Run this example locally:
 *   deno run --allow-all examples/api-server-example-local.ts
 *
 * Then open http://localhost:8000 to see the visualizer
 *
 * Note: For Val Town deployment, use api-server-example.http.ts instead
 */

import { Hono } from "https://esm.sh/hono@4";
import { createStep, createWorkflow } from "../backend/workflow.ts";
import { WorkflowStorage } from "../backend/storage.ts";
import { z } from "npm:zod@^3.23";

// Initialize storage
const storage = new WorkflowStorage();
await storage.init();

// Create Hono app
const app = new Hono();

// Unwrap Hono errors to see original error details
app.onError((err, c) => {
  throw err;
});

// In-memory workflow registry
const workflows = new Map<string, { workflow: any; exampleInput?: any }>();

// ============================================================================
// Example Workflow 1: Data Processing Pipeline
// ============================================================================

const fetchData = createStep({
  id: "fetch-data",
  description: "Fetch data from external API",
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({ data: z.array(z.record(z.unknown())) }),
  execute: async ({ inputData }) => {
    console.log(`Fetching data from ${inputData.url}...`);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      data: [
        { id: 1, name: "Alice", score: 95 },
        { id: 2, name: "Bob", score: 87 },
        { id: 3, name: "Charlie", score: 92 },
      ],
    };
  },
});

const processData = createStep({
  id: "process-data",
  description: "Transform and filter data",
  inputSchema: z.object({ data: z.array(z.record(z.unknown())) }),
  outputSchema: z.object({ processed: z.array(z.record(z.unknown())) }),
  execute: async ({ inputData }) => {
    console.log("Processing data...");

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 800));

    const processed = inputData.data
      .filter((item: any) => item.score >= 90)
      .map((item: any) => ({
        ...item,
        grade: "A",
        timestamp: Date.now(),
      }));

    return { processed };
  },
});

const saveResults = createStep({
  id: "save-results",
  description: "Save processed data to database",
  inputSchema: z.object({ processed: z.array(z.record(z.unknown())) }),
  outputSchema: z.object({ saved: z.number(), success: z.boolean() }),
  execute: async ({ inputData }) => {
    console.log("Saving results...");

    // Simulate database save
    await new Promise(resolve => setTimeout(resolve, 600));

    return {
      saved: inputData.processed.length,
      success: true,
    };
  },
});

const dataProcessingWorkflow = createWorkflow({
  id: "data-processing",
  description: "Fetch, process, and save data pipeline",
  inputSchema: z.object({ url: z.string() }),
  outputSchema: z.object({ saved: z.number(), success: z.boolean() }),
})
  .then(fetchData)
  .then(processData)
  .then(saveResults)
  .commit();

workflows.set(dataProcessingWorkflow.id, {
  workflow: dataProcessingWorkflow,
  exampleInput: { url: "https://api.example.com/data" },
});

// ============================================================================
// Example Workflow 2: Email Campaign
// ============================================================================

const fetchUsers = createStep({
  id: "fetch-users",
  description: "Fetch users from database",
  inputSchema: z.object({ segment: z.string() }),
  outputSchema: z.object({ users: z.array(z.object({ id: z.string(), email: z.string(), name: z.string() })) }),
  execute: async ({ inputData }) => {
    console.log(`Fetching users in segment: ${inputData.segment}`);
    await new Promise(resolve => setTimeout(resolve, 700));

    return {
      users: [
        { id: "1", email: "alice@example.com", name: "Alice" },
        { id: "2", email: "bob@example.com", name: "Bob" },
        { id: "3", email: "charlie@example.com", name: "Charlie" },
      ],
    };
  },
});

const generateEmails = createStep({
  id: "generate-emails",
  description: "Generate personalized email content",
  inputSchema: z.object({ users: z.array(z.object({ id: z.string(), email: z.string(), name: z.string() })) }),
  outputSchema: z.object({ emails: z.array(z.object({ to: z.string(), subject: z.string(), body: z.string() })) }),
  execute: async ({ inputData }) => {
    console.log("Generating personalized emails...");
    await new Promise(resolve => setTimeout(resolve, 900));

    const emails = inputData.users.map(user => ({
      to: user.email,
      subject: `Hello ${user.name}!`,
      body: `Hi ${user.name}, we have exciting news for you...`,
    }));

    return { emails };
  },
});

const sendEmails = createStep({
  id: "send-emails",
  description: "Send emails via email service",
  inputSchema: z.object({ emails: z.array(z.object({ to: z.string(), subject: z.string(), body: z.string() })) }),
  outputSchema: z.object({ sent: z.number(), failed: z.number() }),
  execute: async ({ inputData }) => {
    console.log("Sending emails...");
    await new Promise(resolve => setTimeout(resolve, 1200));

    return {
      sent: inputData.emails.length,
      failed: 0,
    };
  },
});

const emailCampaignWorkflow = createWorkflow({
  id: "email-campaign",
  description: "Automated email campaign workflow",
  inputSchema: z.object({ segment: z.string() }),
  outputSchema: z.object({ sent: z.number(), failed: z.number() }),
})
  .then(fetchUsers)
  .then(generateEmails)
  .then(sendEmails)
  .commit();

workflows.set(emailCampaignWorkflow.id, {
  workflow: emailCampaignWorkflow,
  exampleInput: { segment: "premium-users" },
});

// ============================================================================
// Example Workflow 3: Report Generation (with potential failure)
// ============================================================================

const collectMetrics = createStep({
  id: "collect-metrics",
  description: "Collect performance metrics",
  inputSchema: z.object({ period: z.string() }),
  outputSchema: z.object({ metrics: z.record(z.number()) }),
  execute: async ({ inputData }) => {
    console.log(`Collecting metrics for period: ${inputData.period}`);
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      metrics: {
        users: 1250,
        revenue: 45600,
        conversions: 234,
      },
    };
  },
});

const analyzeMetrics = createStep({
  id: "analyze-metrics",
  description: "Analyze metrics and generate insights",
  inputSchema: z.object({ metrics: z.record(z.number()) }),
  outputSchema: z.object({ insights: z.array(z.string()), trends: z.record(z.string()) }),
  execute: async ({ inputData }) => {
    console.log("Analyzing metrics...");
    await new Promise(resolve => setTimeout(resolve, 800));

    // Randomly fail sometimes to demonstrate error handling
    if (Math.random() < 0.3) {
      throw new Error("Analysis service temporarily unavailable");
    }

    return {
      insights: [
        "User growth increased by 15%",
        "Revenue trending upward",
        "Conversion rate improved",
      ],
      trends: {
        users: "increasing",
        revenue: "increasing",
        conversions: "stable",
      },
    };
  },
});

const generateReport = createStep({
  id: "generate-report",
  description: "Generate PDF report",
  inputSchema: z.object({ insights: z.array(z.string()), trends: z.record(z.string()) }),
  outputSchema: z.object({ reportUrl: z.string(), pages: z.number() }),
  execute: async ({ inputData }) => {
    console.log("Generating report...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      reportUrl: `https://reports.example.com/report-${Date.now()}.pdf`,
      pages: 12,
    };
  },
});

const reportWorkflow = createWorkflow({
  id: "report-generation",
  description: "Monthly performance report generation",
  inputSchema: z.object({ period: z.string() }),
  outputSchema: z.object({ reportUrl: z.string(), pages: z.number() }),
})
  .then(collectMetrics)
  .then(analyzeMetrics)
  .then(generateReport)
  .commit();

workflows.set(reportWorkflow.id, {
  workflow: reportWorkflow,
  exampleInput: { period: "2024-11" },
});

// ============================================================================
// API Routes
// ============================================================================

// GET /api/workflows - List all workflows
app.get("/api/workflows", (c) => {
  const workflowList = Array.from(workflows.entries()).map(([id, { workflow, exampleInput }]) => ({
    id: workflow.id,
    description: workflow.config.description,
    steps: workflow.stepFlow.map((entry: any) => ({
      id: entry.step.id,
      description: entry.step.description,
    })),
    exampleInput,
  }));
  return c.json(workflowList);
});

// GET /api/workflows/:id - Get workflow details
app.get("/api/workflows/:id", (c) => {
  const workflowId = c.req.param("id");
  const entry = workflows.get(workflowId);

  if (!entry) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const { workflow, exampleInput } = entry;
  return c.json({
    id: workflow.id,
    description: workflow.config.description,
    steps: workflow.stepFlow.map((entry: any) => ({
      id: entry.step.id,
      description: entry.step.description,
    })),
    exampleInput,
  });
});

// GET /api/workflows/:id/runs - List runs for a workflow
app.get("/api/workflows/:id/runs", async (c) => {
  const workflowId = c.req.param("id");
  const snapshots = await storage.listRuns(workflowId);
  const runs = snapshots.map((snapshot) => ({
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
  }));
  return c.json(runs);
});

// POST /api/workflows/:id/runs - Create a new run
app.post("/api/workflows/:id/runs", async (c) => {
  const workflowId = c.req.param("id");
  const entry = workflows.get(workflowId);

  if (!entry) {
    return c.json({ error: "Workflow not found" }, 404);
  }

  const body = await c.req.json();
  const { inputData } = body;

  // Create and start the run
  const run = await entry.workflow.createRun();

  // Start execution in the background
  run.start({ inputData }).catch((error: Error) => {
    console.error(`Run ${run.runId} failed:`, error);
  });

  // Return the initial run state
  const snapshot = await storage.loadSnapshot(run.runId);
  if (!snapshot) {
    return c.json({ error: "Failed to create run" }, 500);
  }

  return c.json({
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
  }, 201);
});

// GET /api/runs/:runId - Get run details
app.get("/api/runs/:runId", async (c) => {
  const runId = c.req.param("runId");
  const snapshot = await storage.loadSnapshot(runId);

  if (!snapshot) {
    return c.json({ error: "Run not found" }, 404);
  }

  return c.json({
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
  });
});

// ============================================================================
// Frontend
// ============================================================================

app.get("/", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workflow Visualizer</title>
  <script src="https://cdn.twind.style" crossorigin></script>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #0a0a0a;
      color: #e0e0e0;
    }
    .app {
      display: flex;
      height: 100vh;
    }
    .sidebar {
      width: 320px;
      background: #1a1a1a;
      border-right: 1px solid #333;
      overflow-y: auto;
      padding: 20px;
    }
    .main-content {
      flex: 1;
      padding: 20px;
      overflow-y: auto;
    }
    .workflow-item, .run-item {
      padding: 12px;
      margin: 8px 0;
      background: #252525;
      border-radius: 6px;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s;
    }
    .workflow-item:hover, .run-item:hover {
      background: #2a2a2a;
    }
    .workflow-item.active, .run-item.active {
      border-color: #4a9eff;
      background: #1e3a5f;
    }
    .workflow-name {
      font-weight: 600;
      color: #fff;
    }
    .workflow-description {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status-badge.running {
      background: #ffa500;
      color: #000;
    }
    .status-badge.success {
      background: #4caf50;
      color: #000;
    }
    .status-badge.failed {
      background: #f44336;
      color: #fff;
    }
    .btn-create {
      background: #4a9eff;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      margin-left: 10px;
    }
    .btn-create:hover {
      background: #3a8eef;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 20px 0 10px 0;
    }
    h2 {
      margin: 0 0 10px 0;
      color: #fff;
    }
    .workflow-view {
      background: #1a1a1a;
      border-radius: 8px;
      padding: 24px;
    }
    .step-list {
      margin-top: 20px;
    }
    .step-item {
      background: #252525;
      padding: 16px;
      margin: 12px 0;
      border-radius: 6px;
      border-left: 4px solid #4a9eff;
    }
    .step-item.completed {
      border-left-color: #4caf50;
    }
    .step-item.failed {
      border-left-color: #f44336;
    }
    .step-name {
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }
    .step-description {
      font-size: 13px;
      color: #999;
    }
    .run-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .run-time {
      font-size: 11px;
      color: #666;
    }
    .run-id {
      font-size: 11px;
      color: #666;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.2.0",
      "react-dom/client": "https://esm.sh/react-dom@18.2.0/client"
    }
  }
  </script>

  <script type="module">
    import React from 'react';
    import ReactDOM from 'react-dom/client';

    const { useState, useEffect } = React;

    function App() {
      const [workflows, setWorkflows] = useState([]);
      const [selectedWorkflow, setSelectedWorkflow] = useState(null);
      const [runs, setRuns] = useState([]);
      const [selectedRun, setSelectedRun] = useState(null);
      const [autoRefresh, setAutoRefresh] = useState(false);

      useEffect(() => {
        fetchWorkflows();
      }, []);

      useEffect(() => {
        if (selectedWorkflow) {
          fetchRuns(selectedWorkflow.id);
        }
      }, [selectedWorkflow]);

      useEffect(() => {
        if (!autoRefresh || !selectedRun) return;
        const interval = setInterval(() => {
          fetchRunDetails(selectedRun.runId);
        }, 1000);
        return () => clearInterval(interval);
      }, [autoRefresh, selectedRun]);

      const fetchWorkflows = async () => {
        try {
          const response = await fetch('/api/workflows');
          const data = await response.json();
          setWorkflows(data);
          if (data.length > 0 && !selectedWorkflow) {
            setSelectedWorkflow(data[0]);
          }
        } catch (error) {
          console.error('Failed to fetch workflows:', error);
        }
      };

      const fetchRuns = async (workflowId) => {
        try {
          const response = await fetch(\`/api/workflows/\${workflowId}/runs\`);
          const data = await response.json();
          setRuns(data);
          if (data.length > 0) {
            setSelectedRun(data[0]);
          }
        } catch (error) {
          console.error('Failed to fetch runs:', error);
        }
      };

      const fetchRunDetails = async (runId) => {
        try {
          const response = await fetch(\`/api/runs/\${runId}\`);
          const data = await response.json();
          setSelectedRun(data);
          setRuns(prev => prev.map(run =>
            run.runId === runId ? data : run
          ));
        } catch (error) {
          console.error('Failed to fetch run details:', error);
        }
      };

      const createNewRun = async () => {
        if (!selectedWorkflow) return;
        try {
          const response = await fetch(\`/api/workflows/\${selectedWorkflow.id}/runs\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputData: selectedWorkflow.exampleInput || {}
            })
          });
          const newRun = await response.json();
          setRuns(prev => [newRun, ...prev]);
          setSelectedRun(newRun);
          setAutoRefresh(true);
        } catch (error) {
          console.error('Failed to create run:', error);
        }
      };

      return React.createElement('div', { className: 'app' },
        React.createElement('div', { className: 'sidebar' },
          React.createElement('div', null,
            React.createElement('h2', null, 'Workflows'),
            React.createElement('div', null,
              workflows.map(workflow =>
                React.createElement('div', {
                  key: workflow.id,
                  className: \`workflow-item \${selectedWorkflow?.id === workflow.id ? 'active' : ''}\`,
                  onClick: () => setSelectedWorkflow(workflow)
                },
                  React.createElement('div', { className: 'workflow-name' }, workflow.id),
                  workflow.description && React.createElement('div', { className: 'workflow-description' }, workflow.description)
                )
              )
            )
          ),
          selectedWorkflow && React.createElement('div', null,
            React.createElement('div', { className: 'section-header' },
              React.createElement('h2', null, 'Runs'),
              React.createElement('button', { onClick: createNewRun, className: 'btn-create' }, '+ New Run')
            ),
            React.createElement('div', null,
              runs.map(run =>
                React.createElement('div', {
                  key: run.runId,
                  className: \`run-item \${selectedRun?.runId === run.runId ? 'active' : ''}\`,
                  onClick: () => setSelectedRun(run)
                },
                  React.createElement('div', { className: 'run-header' },
                    React.createElement('span', { className: \`status-badge \${run.status}\` }, run.status),
                    React.createElement('span', { className: 'run-time' }, new Date(run.createdAt).toLocaleTimeString())
                  ),
                  React.createElement('div', { className: 'run-id' }, run.runId.slice(0, 8) + '...')
                )
              )
            )
          ),
          selectedRun && React.createElement('div', { style: { marginTop: '20px' } },
            React.createElement('label', null,
              React.createElement('input', {
                type: 'checkbox',
                checked: autoRefresh,
                onChange: (e) => setAutoRefresh(e.target.checked)
              }),
              ' Auto-refresh'
            )
          )
        ),
        React.createElement('div', { className: 'main-content' },
          selectedWorkflow && React.createElement('div', { className: 'workflow-view' },
            React.createElement('h1', null, selectedWorkflow.id),
            selectedWorkflow.description && React.createElement('p', { style: { color: '#999' } }, selectedWorkflow.description),
            React.createElement('div', { className: 'step-list' },
              selectedWorkflow.steps.map((step, index) => {
                const executionPath = selectedRun?.executionPath || [];
                const isExecuted = executionPath.includes(index);
                const stepResult = selectedRun?.stepResults?.[step.id];
                const status = stepResult?.status || (isExecuted ? 'completed' : '');

                return React.createElement('div', {
                  key: step.id,
                  className: \`step-item \${status}\`
                },
                  React.createElement('div', { className: 'step-name' }, step.id),
                  step.description && React.createElement('div', { className: 'step-description' }, step.description),
                  stepResult && React.createElement('div', { style: { marginTop: '8px', fontSize: '12px' } },
                    React.createElement('div', null, 'Status: ', stepResult.status),
                    stepResult.error && React.createElement('div', { style: { color: '#f44336' } }, 'Error: ', stepResult.error)
                  )
                );
              })
            ),
            selectedRun && React.createElement('div', { style: { marginTop: '24px', padding: '16px', background: '#252525', borderRadius: '6px' } },
              React.createElement('h3', null, 'Run Details'),
              React.createElement('div', { style: { fontSize: '13px', lineHeight: '1.6' } },
                React.createElement('div', null, React.createElement('strong', null, 'Run ID:'), ' ', selectedRun.runId),
                React.createElement('div', null, React.createElement('strong', null, 'Status:'), ' ', selectedRun.status),
                React.createElement('div', null, React.createElement('strong', null, 'Created:'), ' ', new Date(selectedRun.createdAt).toLocaleString()),
                selectedRun.error && React.createElement('div', { style: { color: '#f44336', marginTop: '8px' } },
                  React.createElement('strong', null, 'Error:'), ' ', selectedRun.error
                )
              )
            )
          )
        )
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
  <script src="https://esm.town/v/std/catch"></script>
</body>
</html>
  `;
  return c.html(html);
});

// ============================================================================
// Start Local Server
// ============================================================================

const PORT = 8000;

console.log("\n=======================================================");
console.log("Workflow API Server with Embedded Visualizer");
console.log("=======================================================\n");
console.log("Registered workflows:");
console.log("  - data-processing: Fetch, process, and save data");
console.log("  - email-campaign: Automated email campaign");
console.log("  - report-generation: Monthly report generation\n");
console.log("API Endpoints:");
console.log("  GET  /api/workflows           - List all workflows");
console.log("  GET  /api/workflows/:id       - Get workflow details");
console.log("  GET  /api/workflows/:id/runs  - List runs for workflow");
console.log("  POST /api/workflows/:id/runs  - Create new run");
console.log("  GET  /api/runs/:runId         - Get run details\n");
console.log(`Server starting on http://localhost:${PORT}`);
console.log(`Open http://localhost:${PORT} to view the visualizer\n`);
console.log("=======================================================\n");

Deno.serve({ port: PORT }, app.fetch);
