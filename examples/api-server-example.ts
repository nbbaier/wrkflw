/**
 * Example: API Server for Workflow Visualization
 *
 * This example demonstrates how to:
 * 1. Set up workflows with the API server
 * 2. Serve workflow data to the React visualizer
 * 3. Create and monitor workflow runs
 *
 * Run this example:
 *   deno run --allow-all examples/api-server-example.ts
 *
 * Then start the React app:
 *   cd frontend && npm install && npm run dev
 *
 * Open http://localhost:3000 to see the visualizer
 */

import { createStep, createWorkflow } from "../backend/workflow.ts";
import { WorkflowStorage } from "../backend/storage.ts";
import { createApiServer } from "../backend/api-server.ts";
import { z } from "npm:zod@^3.23";

// Initialize storage
const storage = new WorkflowStorage();
await storage.init();

// Create API server
const apiServer = createApiServer(storage);

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

apiServer.registerWorkflow(dataProcessingWorkflow, {
  url: "https://api.example.com/data",
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

apiServer.registerWorkflow(emailCampaignWorkflow, {
  segment: "premium-users",
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

apiServer.registerWorkflow(reportWorkflow, {
  period: "2024-11",
});

// ============================================================================
// Start the API server
// ============================================================================

console.log("\n=======================================================");
console.log("Workflow API Server");
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
console.log("Starting server on http://localhost:8000");
console.log("\nTo use the visualizer:");
console.log("  1. cd frontend");
console.log("  2. npm install");
console.log("  3. npm run dev");
console.log("  4. Open http://localhost:3000\n");
console.log("=======================================================\n");

await apiServer.serve(8000);
