import type { Edge } from '@xyflow/react';
import type { FlowNode, LogEntry, NodeRunResult } from '../types';
import { getDefinition } from '../nodes/registry';
import { errorMessage } from './expressions';

const MAX_STEPS = 1000;

export type RunCallbacks = {
  onNodeUpdate: (nodeId: string, result: NodeRunResult) => void;
  onLog: (entry: Omit<LogEntry, 'time'>) => void;
};

/**
 * Runs a flow: starts at every trigger node, runs it, then sends its output
 * to the nodes connected after it, and so on. Stops at the first error.
 * Returns true if every node succeeded.
 */
export async function runFlow(nodes: FlowNode[], edges: Edge[], cb: RunCallbacks): Promise<boolean> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const triggers = nodes.filter((n) => getDefinition(n.data.kind)?.category === 'trigger');
  if (triggers.length === 0) throw new Error('Add a trigger node to start the flow.');

  const queue: { node: FlowNode; input: unknown }[] = triggers.map((node) => ({ node, input: undefined }));
  let steps = 0;

  while (queue.length > 0) {
    if (++steps > MAX_STEPS) throw new Error(`Stopped after ${MAX_STEPS} steps. Is there a loop?`);

    const { node, input } = queue.shift()!;
    const def = getDefinition(node.data.kind);
    if (!def) throw new Error(`Unknown node type "${node.data.kind}"`);

    const nodeName = node.data.name;
    const logs: string[] = [];
    const started = performance.now();
    cb.onNodeUpdate(node.id, { status: 'running', input, logs });

    try {
      const result = await def.execute({
        input,
        config: node.data.config,
        log: (text) => {
          logs.push(text);
          cb.onLog({ level: 'info', nodeId: node.id, nodeName, text });
        },
      });
      const durationMs = Math.round(performance.now() - started);
      cb.onNodeUpdate(node.id, { status: 'success', input, output: result.output, logs, durationMs });
      cb.onLog({ level: 'success', nodeId: node.id, nodeName, text: `Done in ${durationMs} ms` });

      // Follow the outgoing connections (only the chosen branch, for If nodes)
      for (const edge of edges) {
        if (edge.source !== node.id) continue;
        if (result.branch && edge.sourceHandle !== result.branch) continue;
        const target = byId.get(edge.target);
        if (target) queue.push({ node: target, input: result.output });
      }
    } catch (err) {
      const error = errorMessage(err);
      const durationMs = Math.round(performance.now() - started);
      cb.onNodeUpdate(node.id, { status: 'error', input, error, logs, durationMs });
      cb.onLog({ level: 'error', nodeId: node.id, nodeName, text: error });
      return false;
    }
  }
  return true;
}
