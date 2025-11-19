export interface WorkflowStep {
  id: string
  description?: string
}

export interface WorkflowData {
  id: string
  description?: string
  steps: WorkflowStep[]
  exampleInput?: Record<string, unknown>
}

export interface StepResult {
  status: 'success' | 'failed' | 'running'
  output?: unknown
  error?: string
  timestamp: number
}

export interface WorkflowRunData {
  runId: string
  workflowId: string
  status: 'running' | 'success' | 'failed'
  executionPath: number[]
  stepResults: Record<string, StepResult>
  inputData: unknown
  result?: unknown
  error?: string
  createdAt: number
  updatedAt: number
}
