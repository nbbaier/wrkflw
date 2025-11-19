import { useCallback, useEffect, useMemo } from 'react'
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { WorkflowData, WorkflowRunData, StepResult } from '../types'
import StepNode from './StepNode'
import './WorkflowVisualizer.css'

interface WorkflowVisualizerProps {
  workflow: WorkflowData
  run?: WorkflowRunData | null
}

const nodeTypes = {
  stepNode: StepNode,
}

function WorkflowVisualizer({ workflow, run }: WorkflowVisualizerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  const getStepStatus = useCallback((stepId: string): StepResult['status'] | 'pending' => {
    if (!run?.stepResults?.[stepId]) return 'pending'
    return run.stepResults[stepId].status
  }, [run])

  const getStepOutput = useCallback((stepId: string): unknown => {
    if (!run?.stepResults?.[stepId]) return undefined
    const result = run.stepResults[stepId]
    return result.status === 'success' ? result.output : undefined
  }, [run])

  const getStepError = useCallback((stepId: string): string | undefined => {
    if (!run?.stepResults?.[stepId]) return undefined
    const result = run.stepResults[stepId]
    return result.status === 'failed' ? result.error : undefined
  }, [run])

  // Build graph layout
  const buildGraph = useCallback(() => {
    const nodeWidth = 220
    const nodeHeight = 100
    const horizontalGap = 100
    const verticalGap = 80

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Start node
    newNodes.push({
      id: 'start',
      type: 'input',
      position: { x: 50, y: 50 },
      data: {
        label: workflow.id,
      },
      style: {
        background: '#C8E6C9',
        border: '2px solid #2E7D32',
        borderRadius: 8,
        padding: 16,
        fontWeight: 600,
      },
    })

    let currentX = 50
    let currentY = 50 + nodeHeight + verticalGap

    // Step nodes
    workflow.steps.forEach((step, index) => {
      const status = getStepStatus(step.id)
      const output = getStepOutput(step.id)
      const error = getStepError(step.id)

      newNodes.push({
        id: step.id,
        type: 'stepNode',
        position: { x: currentX, y: currentY },
        data: {
          label: step.id,
          description: step.description,
          status,
          output,
          error,
          index: index + 1,
        },
      })

      // Edge from previous node
      const sourceId = index === 0 ? 'start' : workflow.steps[index - 1].id
      newEdges.push({
        id: `${sourceId}-${step.id}`,
        source: sourceId,
        target: step.id,
        type: 'smoothstep',
        animated: status === 'running',
        style: {
          stroke: status === 'success' ? '#4CAF50' :
                  status === 'failed' ? '#F44336' :
                  status === 'running' ? '#2196F3' : '#999',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: status === 'success' ? '#4CAF50' :
                 status === 'failed' ? '#F44336' :
                 status === 'running' ? '#2196F3' : '#999',
        },
      })

      currentY += nodeHeight + verticalGap
    })

    // End node
    const lastStep = workflow.steps[workflow.steps.length - 1]
    newNodes.push({
      id: 'end',
      type: 'output',
      position: { x: currentX, y: currentY },
      data: {
        label: run?.status === 'success' ? '✓ Complete' :
               run?.status === 'failed' ? '✗ Failed' :
               run?.status === 'running' ? '● Running' : 'End',
      },
      style: {
        background: run?.status === 'success' ? '#C8E6C9' :
                   run?.status === 'failed' ? '#FFCDD2' :
                   run?.status === 'running' ? '#BBDEFB' : '#E0E0E0',
        border: run?.status === 'success' ? '2px solid #2E7D32' :
               run?.status === 'failed' ? '2px solid #C62828' :
               run?.status === 'running' ? '2px solid #1976D2' : '2px solid #999',
        borderRadius: 8,
        padding: 16,
        fontWeight: 600,
      },
    })

    newEdges.push({
      id: `${lastStep.id}-end`,
      source: lastStep.id,
      target: 'end',
      type: 'smoothstep',
      animated: run?.status === 'running',
      style: {
        stroke: run?.status === 'success' ? '#4CAF50' :
               run?.status === 'failed' ? '#F44336' :
               run?.status === 'running' ? '#2196F3' : '#999',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: run?.status === 'success' ? '#4CAF50' :
              run?.status === 'failed' ? '#F44336' :
              run?.status === 'running' ? '#2196F3' : '#999',
      },
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [workflow, run, getStepStatus, getStepOutput, getStepError, setNodes, setEdges])

  useEffect(() => {
    buildGraph()
  }, [buildGraph])

  return (
    <div className="workflow-visualizer">
      <div className="visualizer-header">
        <div>
          <h1>{workflow.id}</h1>
          {workflow.description && <p>{workflow.description}</p>}
        </div>
        {run && (
          <div className="run-info">
            <div className="run-status">
              <span className={`status-indicator ${run.status}`}></span>
              <span>{run.status}</span>
            </div>
            <div className="run-meta">
              Run ID: <code>{run.runId.slice(0, 12)}...</code>
            </div>
          </div>
        )}
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'input') return '#C8E6C9'
            if (node.type === 'output') return '#E0E0E0'
            const status = node.data.status
            return status === 'success' ? '#C8E6C9' :
                   status === 'failed' ? '#FFCDD2' :
                   status === 'running' ? '#BBDEFB' : '#F5F5F5'
          }}
        />
      </ReactFlow>
    </div>
  )
}

export default WorkflowVisualizer
