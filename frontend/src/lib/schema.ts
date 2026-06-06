import { z } from 'zod'

const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

const NodeDataSchema = z.object({
  label: z.string().min(1),
})

export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().optional(),
  data: NodeDataSchema,
  position: NodePositionSchema,
})

export const FlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
})

export const FlowSchema = z.object({
  title: z.string().min(1),
  nodes: z.array(FlowNodeSchema).min(1),
  edges: z.array(FlowEdgeSchema),
})

export type FlowData = z.infer<typeof FlowSchema>
export type FlowNode = z.infer<typeof FlowNodeSchema>
export type FlowEdge = z.infer<typeof FlowEdgeSchema>

export function validateFlow(raw: unknown): FlowData {
  const result = FlowSchema.safeParse(raw)
  if (!result.success) {
    throw new Error(`Invalid flow schema: ${result.error.issues[0]?.message}`)
  }
  // Validate all edge references point to existing nodes
  const nodeIds = new Set(result.data.nodes.map(n => n.id))
  for (const edge of result.data.edges) {
    if (!nodeIds.has(edge.source)) throw new Error(`Edge ${edge.id} has unknown source: ${edge.source}`)
    if (!nodeIds.has(edge.target)) throw new Error(`Edge ${edge.id} has unknown target: ${edge.target}`)
  }
  return result.data
}
