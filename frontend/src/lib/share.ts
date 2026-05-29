import type { Node, Edge } from '@xyflow/react'

interface SharedFlow {
  title: string
  nodes: Node[]
  edges: Edge[]
}

export function encodeFlow(title: string, nodes: Node[], edges: Edge[]): string {
  const json = JSON.stringify({ title, nodes, edges })
  return btoa(encodeURIComponent(json))
}

export function decodeFlow(encoded: string): SharedFlow | null {
  try {
    const json = decodeURIComponent(atob(encoded))
    return JSON.parse(json) as SharedFlow
  } catch {
    return null
  }
}

export function getSharedFlow(): SharedFlow | null {
  try {
    const param = new URLSearchParams(window.location.search).get('flow')
    if (!param) return null
    return decodeFlow(param)
  } catch {
    return null
  }
}

export function clearShareParam() {
  const url = new URL(window.location.href)
  url.searchParams.delete('flow')
  window.history.replaceState({}, '', url.toString())
}
