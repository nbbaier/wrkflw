import type { z } from "npm:zod@^3.23";

/**
 * Step execution result with status tracking
 */
export type StepResult<T = any> = 
  | { status: 'success'; output: T; timestamp: number }
  | { status: 'failed'; error: Error; timestamp: number }
  | { status: 'running'; timestamp: number };

/**
 * Step execution context provided to execute function
 */
export interface StepExecutionContext<TInput, TState> {
  /** Input data for this step */
  inputData: TInput;
  
  /** Workflow-level state (if defined) */
  state?: TState;
  
  /** Update workflow state */
  setState?: (state: TState) => void;
  
  /** Get the result of a previous step */
  getStepResult: <T extends Step<any, any, any, any>>(
    step: T
  ) => z.infer<T['outputSchema']>;
  
  /** Get the initial workflow input data */
  getInitData: <T = any>() => T;
  
  /** Current run ID */
  runId: string;
  
  /** Current workflow ID */
  workflowId: string;
}

/**
 * Step execute function signature
 */
export interface ExecuteFunction<TInput, TOutput, TState> {
  (context: StepExecutionContext<TInput, TState>): Promise<TOutput> | TOutput;
}

/**
 * Step configuration
 */
export interface StepConfig<TId extends string, TInput, TOutput, TState> {
  id: TId;
  description?: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  stateSchema?: z.ZodSchema<TState>;
  execute: ExecuteFunction<TInput, TOutput, TState>;
}

/**
 * Step instance
 */
export interface Step<TId extends string, TInput, TOutput, TState> {
  id: TId;
  description?: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  stateSchema?: z.ZodSchema<TState>;
  execute: ExecuteFunction<TInput, TOutput, TState>;
}

/**
 * Workflow step entry in execution graph
 */
export interface StepFlowEntry {
  type: 'step';
  step: Step<any, any, any, any>;
}

/**
 * Workflow configuration
 */
export interface WorkflowConfig<TId extends string, TInput, TOutput, TState = any> {
  id: TId;
  description?: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  stateSchema?: z.ZodSchema<TState>;
}

/**
 * Execution context tracking workflow execution state
 */
export interface ExecutionContext<TState = any> {
  workflowId: string;
  runId: string;
  executionPath: number[];
  stepResults: Record<string, StepResult>;
  state: TState;
  inputData: any;
}

/**
 * Workflow snapshot for persistence
 */
export interface WorkflowSnapshot<TState = any> {
  runId: string;
  workflowId: string;
  status: 'running' | 'success' | 'failed';
  executionPath: number[];
  stepResults: Record<string, StepResult>;
  state: TState;
  inputData: any;
  result?: any;
  error?: string;
  timestamp: number;
}
