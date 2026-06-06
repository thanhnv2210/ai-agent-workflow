import type { Node, Edge } from '@xyflow/react'

export interface FlowTemplate {
  id: string
  title: string
  description: string
  nodes: Omit<Node, 'position'>[]
  edges: Edge[]
}

export const TEMPLATES: FlowTemplate[] = [
  {
    id: '4d-framework',
    title: '4D Framework — AI Fluency',
    description: 'Delegation → Description → Discernment loop → Diligence',
    nodes: [
      { id: 'n1', type: 'default', data: { label: 'Your Task' } },
      { id: 'n2', type: 'default', data: { label: 'D1 — Delegation' } },
      { id: 'n3', type: 'default', data: { label: 'D2 — Description' } },
      { id: 'n4', type: 'default', data: { label: 'D3 — Discernment' } },
      { id: 'n5', type: 'default', data: { label: 'Output acceptable?' } },
      { id: 'n6', type: 'default', data: { label: 'D4 — Diligence' } },
      { id: 'n7', type: 'default', data: { label: 'Deploy / Share' } },
    ],
    edges: [
      { id: 'en1-n2', source: 'n1', target: 'n2', label: 'start' },
      { id: 'en2-n3', source: 'n2', target: 'n3', label: 'plan agreed' },
      { id: 'en3-n4', source: 'n3', target: 'n4', label: 'Claude executes' },
      { id: 'en4-n5', source: 'n4', target: 'n5', label: 'review output' },
      { id: 'en5-n3', source: 'n5', target: 'n3', label: 'no — refine' },
      { id: 'en5-n6', source: 'n5', target: 'n6', label: 'yes' },
      { id: 'en6-n7', source: 'n6', target: 'n7', label: 'diligence done' },
    ],
  },
  {
    id: 'cicd',
    title: 'CI/CD Pipeline',
    description: 'Push code → test → build → deploy',
    nodes: [
      { id: '1', type: 'default', data: { label: 'Push Code' } },
      { id: '2', type: 'default', data: { label: 'Run Tests' } },
      { id: '3', type: 'default', data: { label: 'Build Image' } },
      { id: '4', type: 'default', data: { label: 'Deploy to Staging' } },
      { id: '5', type: 'default', data: { label: 'Deploy to Production' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: '' },
      { id: 'e2-3', source: '2', target: '3', label: 'on pass' },
      { id: 'e3-4', source: '3', target: '4', label: '' },
      { id: 'e4-5', source: '4', target: '5', label: 'approved' },
    ],
  },
  {
    id: 'onboarding',
    title: 'Customer Onboarding',
    description: 'Sign up → verify → setup → activate',
    nodes: [
      { id: '1', type: 'default', data: { label: 'Sign Up' } },
      { id: '2', type: 'default', data: { label: 'Verify Email' } },
      { id: '3', type: 'default', data: { label: 'Complete Profile' } },
      { id: '4', type: 'default', data: { label: 'Intro Tour' } },
      { id: '5', type: 'default', data: { label: 'Account Active' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: '' },
      { id: 'e2-3', source: '2', target: '3', label: 'verified' },
      { id: 'e3-4', source: '3', target: '4', label: '' },
      { id: 'e4-5', source: '4', target: '5', label: 'completed' },
    ],
  },
  {
    id: 'incident',
    title: 'Incident Response',
    description: 'Alert → triage → fix → post-mortem',
    nodes: [
      { id: '1', type: 'default', data: { label: 'Alert Triggered' } },
      { id: '2', type: 'default', data: { label: 'Triage Severity' } },
      { id: '3', type: 'default', data: { label: 'Assign On-Call' } },
      { id: '4', type: 'default', data: { label: 'Investigate' } },
      { id: '5', type: 'default', data: { label: 'Apply Fix' } },
      { id: '6', type: 'default', data: { label: 'Post-Mortem' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: '' },
      { id: 'e2-3', source: '2', target: '3', label: 'P1/P2' },
      { id: 'e3-4', source: '3', target: '4', label: '' },
      { id: 'e4-5', source: '4', target: '5', label: 'root cause found' },
      { id: 'e5-6', source: '5', target: '6', label: 'resolved' },
    ],
  },
  {
    id: 'approval',
    title: 'Leave Approval',
    description: 'Request → manager → HR → notify',
    nodes: [
      { id: '1', type: 'default', data: { label: 'Submit Request' } },
      { id: '2', type: 'default', data: { label: 'Manager Review' } },
      { id: '3', type: 'default', data: { label: 'HR Review' } },
      { id: '4', type: 'default', data: { label: 'Approved' } },
      { id: '5', type: 'default', data: { label: 'Rejected' } },
      { id: '6', type: 'default', data: { label: 'Notify Employee' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: '' },
      { id: 'e2-3', source: '2', target: '3', label: 'approved' },
      { id: 'e2-5', source: '2', target: '5', label: 'rejected' },
      { id: 'e3-4', source: '3', target: '4', label: 'approved' },
      { id: 'e3-5', source: '3', target: '5', label: 'rejected' },
      { id: 'e4-6', source: '4', target: '6', label: '' },
      { id: 'e5-6', source: '5', target: '6', label: '' },
    ],
  },
  {
    id: 'feature',
    title: 'Feature Development',
    description: 'Idea → design → build → release',
    nodes: [
      { id: '1', type: 'default', data: { label: 'Idea / PRD' } },
      { id: '2', type: 'default', data: { label: 'Design Review' } },
      { id: '3', type: 'default', data: { label: 'Development' } },
      { id: '4', type: 'default', data: { label: 'Code Review' } },
      { id: '5', type: 'default', data: { label: 'QA Testing' } },
      { id: '6', type: 'default', data: { label: 'Release' } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', label: '' },
      { id: 'e2-3', source: '2', target: '3', label: 'approved' },
      { id: 'e3-4', source: '3', target: '4', label: '' },
      { id: 'e4-3', source: '4', target: '3', label: 'changes requested' },
      { id: 'e4-5', source: '4', target: '5', label: 'approved' },
      { id: 'e5-6', source: '5', target: '6', label: 'passed' },
    ],
  },
]
