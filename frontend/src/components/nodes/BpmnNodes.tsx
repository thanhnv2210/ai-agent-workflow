import { Handle, Position, type NodeProps } from '@xyflow/react'

export function BpmnStartNode({ data }: NodeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '2px solid #16a34a',
        background: '#dcfce7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        color: '#14532d',
        textAlign: 'center',
        padding: '0 4px',
      }}>
        {String(data.label)}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export function BpmnEndNode({ data }: NodeProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Handle type="target" position={Position.Top} />
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '4px solid #dc2626',
        background: '#fee2e2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        color: '#7f1d1d',
        textAlign: 'center',
        padding: '0 4px',
      }}>
        {String(data.label)}
      </div>
    </div>
  )
}

export function BpmnTaskNode({ data }: NodeProps) {
  return (
    <div style={{
      minWidth: 140,
      minHeight: 52,
      padding: '8px 12px',
      borderRadius: 8,
      border: '2px solid #60a5fa',
      background: '#eff6ff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 11,
      fontWeight: 500,
      color: '#1e3a8a',
      textAlign: 'center',
      lineHeight: 1.3,
    }}>
      <Handle type="target" position={Position.Top} />
      {String(data.label)}
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

export function BpmnGatewayNode({ data }: NodeProps) {
  return (
    <div style={{ width: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <Handle type="target" position={Position.Top} style={{ top: 2 }} />
      <div style={{ position: 'relative', width: 48, height: 48, marginTop: 4 }}>
        <div style={{
          position: 'absolute',
          width: 40,
          height: 40,
          top: 4,
          left: 4,
          transform: 'rotate(45deg)',
          border: '2px solid #d97706',
          background: '#fef3c7',
        }} />
      </div>
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#92400e',
        textAlign: 'center',
        lineHeight: 1.2,
        maxWidth: 90,
      }}>
        {String(data.label)}
      </span>
      <Handle type="source" position={Position.Bottom} style={{ bottom: 2 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ top: 30, right: 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ top: 30, left: 0 }} />
    </div>
  )
}

export const BPMN_NODE_TYPES = {
  'bpmn-start': BpmnStartNode,
  'bpmn-end': BpmnEndNode,
  'bpmn-task': BpmnTaskNode,
  'bpmn-gateway': BpmnGatewayNode,
}
