# Project Discussion: AI-Powered Flow Visualizer

## 1. Vision & Goal
The goal is to build a web application that transforms natural language descriptions of "any open idea" into an interactive, editable, and savable workflow diagram. 

**Target User Experience:**
1. User enters a text description (e.g., "A customer orders pizza, the kitchen prepares it, and a driver delivers it").
2. The app uses Claude to parse this into a structured flow.
3. The app renders a visual diagram using a standard library.
4. The user can manually tweak the nodes/edges and save the final version.

## 2. Technical Requirements
- **Frontend:** React (Vite) for a fast, component-based UI.
- **Diagramming Library:** [React Flow](https://reactflow.dev) (Chosen for its native support for dragging, updating, and interactivity).
- **LLM Integration:** Claude API (to convert text to JSON-structured nodes and edges).
- **Storage:** LocalStorage (MVP) or Supabase (Future) to save the flow data.

## 3. Working Flow Logic
- **Step A: Input** - A simple text area for the user's "open idea."
- **Step B: Processing** - A prompt sent to Claude requesting a specific JSON schema:
  ```json
  {
    "nodes": [{ "id": "1", "data": { "label": "Order Pizza" }, "position": { "x": 0, "y": 0 } }],
    "edges": [{ "id": "e1-2", "source": "1", "target": "2" }]
  }

- Step C: Rendering - Pass the JSON directly into the <ReactFlow /> component.
- Step D: Edit/Save - Implement onNodesChange and onEdgesChange handlers to capture user updates.

## 4. Immediate Tasks for Claude Code
Initialize Project: Set up a Vite + React + Tailwind CSS environment.
Install Dependencies: npm install reactflow.
Build Flow Component: Create a FlowCanvas.jsx that renders a basic hardcoded diagram.
Implement Generator: Create a function to take text input and (mock) the transformation into React Flow objects.
Add Persistence: Use useEffect to sync the flow state to LocalStorage.

## 5. Future Enhancements
Exporting diagrams as PNG/SVG.
Collaborative editing (multi-user).
Support for complex logic (branching, loops, and conditions).
