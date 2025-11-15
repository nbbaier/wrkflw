/**
 * Example: Triggering workflows from a Cron val
 * 
 * This demonstrates how to use the workflow engine from a Val Town Cron trigger.
 * Schedule this as a cron val to run workflows periodically.
 */

import { greetingWorkflow } from "./simple-workflow.ts";

export default async function(interval: Interval) {
  console.log(`Cron triggered at ${new Date().toISOString()}`);
  
  // Example: Process a batch of users
  const userIds = ['user-1', 'user-2', 'user-3'];
  
  const results = [];
  
  for (const userId of userIds) {
    try {
      const run = await greetingWorkflow.createRun();
      
      const result = await run.start({
        inputData: { userId },
      });
      
      results.push({
        userId,
        success: true,
        runId: run.runId,
        result,
      });
      
      console.log(`✅ Processed ${userId}: ${result.messageId}`);
    } catch (error) {
      results.push({
        userId,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      
      console.error(`❌ Failed to process ${userId}:`, error);
    }
  }
  
  console.log(`\nProcessed ${results.length} users`);
  console.log(`Success: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  
  return results;
}
