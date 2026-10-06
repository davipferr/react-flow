import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, XYPosition } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

import type { FlowNode, FlowNodeData, LogEntry, NodeRunResult } from './types';
import { FlowNodeView } from './nodes/FlowNodeView';
import { RunResultsContext } from './nodes/runResultsContext';
import { getDefinition } from './nodes/registry';
import { DRAG_TYPE, Sidebar } from './components/Sidebar';
import { ConfigPanel } from './components/ConfigPanel';
import { LogPanel } from './components/LogPanel';
import { runFlow } from './engine/runner';
import { errorMessage } from './engine/expressions';
import { createExampleFlow, isFlow, loadFlow, newNodeId, saveFlow } from './storage';

const nodeTypes = { flow: FlowNodeView };

function Editor() {
  const [initial] = useState(() => loadFlow() ?? createExampleFlow());
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges);
  const [results, setResults] = useState<Record<string, NodeRunResult>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const selectedNode = nodes.find((n) => n.selected);

  // Autosave in the browser
  useEffect(() => {
    saveFlow({ nodes, edges });
  }, [nodes, edges]);

  // Animate the connections the data went through in the last run
  const displayedEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        animated: results[e.source]?.status === 'success' && results[e.target] !== undefined,
      })),
    [edges, results],
  );

  const onConnect = useCallback((c: Connection) => setEdges((es) => addEdge(c, es)), [setEdges]);

  const addNode = useCallback(
    (kind: string, position: XYPosition) => {
      const def = getDefinition(kind);
      if (!def) return;
      const node: FlowNode = {
        id: newNodeId(kind),
        type: 'flow',
        position,
        selected: true,
        data: { kind, name: def.label, config: { ...def.defaults } },
      };
      setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), node]);
    },
    [setNodes],
  );

  const addNodeAtCenter = (kind: string) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const center = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    addNode(kind, { x: center.x - 100, y: center.y - 30 });
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData(DRAG_TYPE);
    if (kind) addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  const updateNodeData = useCallback(
    (id: string, update: (data: FlowNodeData) => Partial<FlowNodeData>) =>
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...update(n.data) } } : n))),
    [setNodes],
  );

  const deleteNode = (id: string) => {
    setNodes((ns) => ns.filter((n) => n.id !== id));
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  };

  const selectNode = (id: string) => setNodes((ns) => ns.map((n) => ({ ...n, selected: n.id === id })));

  const run = async () => {
    setRunning(true);
    setResults({});
    setLog([]);
    const addLog = (entry: Omit<LogEntry, 'time'>) => setLog((l) => [...l, { ...entry, time: Date.now() }]);
    addLog({ level: 'info', text: 'Flow started' });
    try {
      const ok = await runFlow(nodes, edges, {
        onNodeUpdate: (id, result) => setResults((rs) => ({ ...rs, [id]: result })),
        onLog: addLog,
      });
      addLog(ok ? { level: 'success', text: 'Flow finished' } : { level: 'error', text: 'Flow stopped: a node failed' });
    } catch (err) {
      addLog({ level: 'error', text: errorMessage(err) });
    } finally {
      setRunning(false);
    }
  };

  const loadIntoEditor = (flow: { nodes: FlowNode[]; edges: Edge[] }) => {
    setNodes(flow.nodes);
    setEdges(flow.edges);
    setResults({});
    setLog([]);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  };

  const exportFlow = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flow.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importFlow = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isFlow(parsed)) throw new Error('File is not a flow (missing nodes/edges).');
      loadIntoEditor(parsed);
    } catch (err) {
      alert(`Could not import: ${errorMessage(err)}`);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="logo">⚡</span> FlowForge
        </div>
        <div className="topbar__actions">
          <button className="btn" onClick={() => loadIntoEditor(createExampleFlow())}>
            Load example
          </button>
          <button
            className="btn"
            onClick={() => confirm('Remove every node from the canvas?') && loadIntoEditor({ nodes: [], edges: [] })}
          >
            Clear
          </button>
          <button className="btn" onClick={() => fileInputRef.current?.click()}>
            Import
          </button>
          <input ref={fileInputRef} type="file" accept=".json,application/json" hidden onChange={importFlow} />
          <button className="btn" onClick={exportFlow}>
            Export
          </button>
          <button className="btn btn--primary" onClick={run} disabled={running}>
            {running ? 'Running…' : '▶ Run'}
          </button>
        </div>
      </header>

      <Sidebar onAdd={addNodeAtCenter} />

      <main className="workspace">
        <div className="canvas" ref={canvasRef} onDragOver={onDragOver} onDrop={onDrop}>
          <RunResultsContext.Provider value={results}>
            <ReactFlow
              nodes={nodes}
              edges={displayedEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              deleteKeyCode={['Backspace', 'Delete']}
              colorMode="dark"
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background gap={20} />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </RunResultsContext.Provider>
        </div>
        <LogPanel entries={log} onSelectNode={selectNode} />
      </main>

      {selectedNode ? (
        <ConfigPanel
          key={selectedNode.id}
          node={selectedNode}
          result={results[selectedNode.id]}
          onConfigChange={(key, value) =>
            updateNodeData(selectedNode.id, (d) => ({ config: { ...d.config, [key]: value } }))
          }
          onRename={(name) => updateNodeData(selectedNode.id, () => ({ name }))}
          onDelete={() => deleteNode(selectedNode.id)}
        />
      ) : (
        <aside className="panel panel--empty">
          <h3>How it works</h3>
          <ol>
            <li>Add nodes from the left (drag or click).</li>
            <li>Connect them by dragging from a node's right dot to another node's left dot.</li>
            <li>Click a node to edit its settings here.</li>
            <li>
              Click <strong>Run</strong>. Each node gets the previous node's output as <code>input</code>.
            </li>
          </ol>
          <p className="muted">
            In text fields, <code>{'{{ input.name }}'}</code> inserts data from the previous node.
          </p>
          <p className="muted">Your flow is saved automatically in this browser.</p>
        </aside>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}
