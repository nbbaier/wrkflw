import type { z } from "npm:zod@^3.23";
import type { Step, StepConfig } from "./types.ts";

/**
 * Create a workflow step with strong typing
 * 
 * @example
 * ```typescript
 * const fetchUser = createStep({
 *   id: 'fetch-user',
 *   inputSchema: z.object({ userId: z.string() }),
 *   outputSchema: z.object({ name: z.string(), email: z.string() }),
 *   execute: async ({ inputData }) => {
 *     const user = await db.getUser(inputData.userId);
 *     return { name: user.name, email: user.email };
 *   }
 * });
 * ```
 */
export function createStep<
  TId extends string,
  TInput,
  TOutput,
  TState = never
>(
  config: StepConfig<TId, TInput, TOutput, TState>
): Step<TId, TInput, TOutput, TState> {
  return {
    id: config.id,
    description: config.description,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    stateSchema: config.stateSchema,
    execute: config.execute,
  };
}
