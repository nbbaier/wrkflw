import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import './StepNode.css'

interface StepNodeData {
  label: string
  description?: string
  status: 'pending' | 'running' | 'success' | 'failed'
  output?: unknown
  error?: string
  index: number
}

function StepNode({ data }: NodeProps<StepNodeData>) {
  const { label, description, status, output, error, index } = data

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return '✓'
      case 'failed': return '✗'
      case 'running': return '●'
      default: return '○'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#4CAF50'
      case 'failed': return '#F44336'
      case 'running': return '#2196F3'
      default: return '#999'
    }
  }

  return (
    <div className={`step-node ${status}`}>
      <Handle type="target" position={Position.Top} />

      <div className="step-header">
        <div className="step-index">#{index}</div>
        <div
          className="step-status-icon"
          style={{ color: getStatusColor() }}
        >
          {getStatusIcon()}
        </div>
      </div>

      <div className="step-label">{label}</div>

      {description && (
        <div className="step-description">{description}</div>
      )}

      {status !== 'pending' && (
        <div className="step-details">
          {status === 'running' && (
            <div className="step-running">
              <div className="spinner"></div>
              Executing...
            </div>
          )}

          {status === 'success' && output && (
            <div className="step-output">
              <div className="output-label">Output:</div>
              <pre>{JSON.stringify(output, null, 2)}</pre>
            </div>
          )}

          {status === 'failed' && error && (
            <div className="step-error">
              <div className="error-label">Error:</div>
              <div className="error-message">{error}</div>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export default memo(StepNode)
