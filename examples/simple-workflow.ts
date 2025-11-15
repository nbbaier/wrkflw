/**
 * Simple workflow example demonstrating the core API
 * 
 * This example shows:
 * - Creating strongly-typed steps
 * - Chaining steps with type inference
 * - Accessing previous step results
 * - Running a workflow
 */

import { createWorkflow, createStep } from "../backend/index.ts";
import { z } from "npm:zod@^3.23";

// Step 1: Fetch user data
const fetchUser = createStep({
  id: 'fetch-user',
  description: 'Fetch user information',
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  execute: async ({ inputData }) => {
    // Simulate API call
    console.log(`Fetching user ${inputData.userId}...`);
    
    return {
      userId: inputData.userId,
      name: 'John Doe',
      email: 'john@example.com',
    };
  },
});

// Step 2: Generate personalized message
const generateMessage = createStep({
  id: 'generate-message',
  description: 'Generate personalized greeting',
  inputSchema: z.object({
    userId: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  outputSchema: z.object({
    message: z.string(),
    recipient: z.string(),
  }),
  execute: async ({ inputData }) => {
    console.log(`Generating message for ${inputData.name}...`);
    
    return {
      message: `Hello ${inputData.name}! Welcome to our service.`,
      recipient: inputData.email,
    };
  },
});

// Step 3: Send message (accessing previous step results)
const sendMessage = createStep({
  id: 'send-message',
  description: 'Send the message',
  inputSchema: z.object({
    message: z.string(),
    recipient: z.string(),
  }),
  outputSchema: z.object({
    sent: z.boolean(),
    messageId: z.string(),
  }),
  execute: async ({ inputData, getStepResult }) => {
    // Access previous step result
    const user = getStepResult(fetchUser);
    
    console.log(`Sending message to ${inputData.recipient}...`);
    console.log(`User from previous step: ${user.name}`);
    
    // Simulate sending
    return {
      sent: true,
      messageId: `msg-${Date.now()}`,
    };
  },
});

// Create the workflow with full type inference
export const greetingWorkflow = createWorkflow({
  id: 'greeting-workflow',
  description: 'Send a personalized greeting to a user',
  inputSchema: z.object({ userId: z.string() }),
  outputSchema: z.object({ sent: z.boolean(), messageId: z.string() }),
})
  .then(fetchUser)      // Input: { userId: string }
  .then(generateMessage) // Input: fetchUser's output (type inferred!)
  .then(sendMessage)     // Input: generateMessage's output (type inferred!)
  .commit();

// Example usage (for testing outside Val Town)
if (import.meta.main) {
  console.log("Running greeting workflow example...\n");
  
  const run = await greetingWorkflow.createRun();
  
  try {
    const result = await run.start({
      inputData: { userId: 'user-123' },
    });
    
    console.log("\n✅ Workflow completed successfully!");
    console.log("Result:", result);
    
    // Get the snapshot
    const snapshot = await run.getSnapshot();
    console.log("\nSnapshot:", {
      runId: snapshot?.runId,
      status: snapshot?.status,
      steps: Object.keys(snapshot?.stepResults || {}),
    });
  } catch (error) {
    console.error("\n❌ Workflow failed:");
    console.error(error);
  }
}
