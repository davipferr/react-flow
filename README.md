# FlowForge

A small n8n-style workflow builder made with React + [React Flow](https://reactflow.dev).
Build a flow by connecting nodes, click **Run**, and each node receives the previous node's output as `input`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Project structure

| Path | What it does |
|---|---|
| `src/nodes/registry.ts` | **All node types** (Manual Trigger, HTTP Request, Code, If, Wait, Log). Add new nodes here. |
| `src/engine/runner.ts` | Executes a flow: starts at triggers and follows the connections. |
| `src/engine/expressions.ts` | `{{ input.x }}` templates and JS evaluation. |
| `src/nodes/FlowNodeView.tsx` | How a node looks on the canvas. |
| `src/components/` | Sidebar (node palette), ConfigPanel (settings + last run), LogPanel. |
| `src/storage.ts` | Saves the flow in localStorage, plus the example flow. |
| `src/App.tsx` | Puts the editor together. |

## Adding a node type

Add an object to `nodeDefinitions` in `src/nodes/registry.ts` with its `fields`, `defaults`
and an `execute({ input, config, log })` function that returns `{ output }`.

## Limitations (phase 1)

- Flows run **in the browser**, so they only run while the page is open, and some APIs block browser requests (CORS).
- Code / expressions run without a sandbox — only run flows you trust.
- Next phase: a Node.js backend to save flows and run them on schedules / webhooks.
