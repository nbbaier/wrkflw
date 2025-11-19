import { useState, useEffect } from 'react'
import WorkflowVisualizer from './components/WorkflowVisualizer'
import { WorkflowData, WorkflowRunData } from './types'
import './App.css'

function App() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null)
  const [runs, setRuns] = useState<WorkflowRunData[]>([])
  const [selectedRun, setSelectedRun] = useState<WorkflowRunData | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Fetch available workflows
  useEffect(() => {
    fetchWorkflows()
  }, [])

  // Fetch runs for selected workflow
  useEffect(() => {
    if (selectedWorkflow) {
      fetchRuns(selectedWorkflow.id)
    }
  }, [selectedWorkflow])

  // Auto-refresh selected run
  useEffect(() => {
    if (!autoRefresh || !selectedRun) return

    const interval = setInterval(() => {
      fetchRunDetails(selectedRun.runId)
    }, 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, selectedRun])

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows')
      const data = await response.json()
      setWorkflows(data)
      if (data.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
    }
  }

  const fetchRuns = async (workflowId: string) => {
    try {
      const response = await fetch(`/api/workflows/${workflowId}/runs`)
      const data = await response.json()
      setRuns(data)
      if (data.length > 0) {
        setSelectedRun(data[0])
      }
    } catch (error) {
      console.error('Failed to fetch runs:', error)
    }
  }

  const fetchRunDetails = async (runId: string) => {
    try {
      const response = await fetch(`/api/runs/${runId}`)
      const data = await response.json()
      setSelectedRun(data)

      // Update in the runs list too
      setRuns(prev => prev.map(run =>
        run.runId === runId ? data : run
      ))
    } catch (error) {
      console.error('Failed to fetch run details:', error)
    }
  }

  const createNewRun = async () => {
    if (!selectedWorkflow) return

    try {
      const response = await fetch(`/api/workflows/${selectedWorkflow.id}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputData: selectedWorkflow.exampleInput || {}
        })
      })
      const newRun = await response.json()
      setRuns(prev => [newRun, ...prev])
      setSelectedRun(newRun)
      setAutoRefresh(true)
    } catch (error) {
      console.error('Failed to create run:', error)
    }
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-section">
          <h2>Workflows</h2>
          <div className="workflow-list">
            {workflows.map(workflow => (
              <div
                key={workflow.id}
                className={`workflow-item ${selectedWorkflow?.id === workflow.id ? 'active' : ''}`}
                onClick={() => setSelectedWorkflow(workflow)}
              >
                <div className="workflow-name">{workflow.id}</div>
                {workflow.description && (
                  <div className="workflow-description">{workflow.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {selectedWorkflow && (
          <div className="sidebar-section">
            <div className="section-header">
              <h2>Runs</h2>
              <button onClick={createNewRun} className="btn-create">+ New Run</button>
            </div>
            <div className="runs-list">
              {runs.map(run => (
                <div
                  key={run.runId}
                  className={`run-item ${selectedRun?.runId === run.runId ? 'active' : ''}`}
                  onClick={() => setSelectedRun(run)}
                >
                  <div className="run-header">
                    <span className={`status-badge ${run.status}`}>{run.status}</span>
                    <span className="run-time">
                      {new Date(run.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="run-id">{run.runId.slice(0, 8)}...</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRun && (
          <div className="sidebar-section">
            <label className="auto-refresh">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh
            </label>
          </div>
        )}
      </div>

      <div className="main-content">
        {selectedWorkflow && (
          <WorkflowVisualizer
            workflow={selectedWorkflow}
            run={selectedRun}
          />
        )}
      </div>
    </div>
  )
}

export default App
