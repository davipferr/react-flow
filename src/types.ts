import type { Edge, Node } from '@xyflow/react';

/** Data stored on every node of the canvas. */
export type FlowNodeData = {
  /** Which node definition this node uses (e.g. "httpRequest"). */
  kind: string;
  /** Display name, editable by the user. */
  name: string;
  /** Values of the node's settings fields. */
  config: Record<string, string>;
};

export type FlowNode = Node<FlowNodeData, 'flow'>;

export type Flow = { nodes: FlowNode[]; edges: Edge[] };

export type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'code' | 'select';
  options?: string[];
  placeholder?: string;
  help?: string;
};

export type ExecContext = {
  /** Output of the previous node (undefined for triggers). */
  input: unknown;
  config: Record<string, string>;
  log: (message: string) => void;
};

export type ExecResult = {
  output: unknown;
  /** For nodes with several outputs: the output handle to continue from. */
  branch?: string;
};

export type NodeCategory = 'trigger' | 'action' | 'logic';

/** Describes a type of node: how it looks, its settings and what it does. */
export type NodeDefinition = {
  kind: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  category: NodeCategory;
  hasInput: boolean;
  /** Output handle ids. Most nodes have one ("out"); If has "true" and "false". */
  outputs: string[];
  fields: FieldDef[];
  defaults: Record<string, string>;
  summary?: (config: Record<string, string>) => string;
  execute: (ctx: ExecContext) => Promise<ExecResult>;
};

export type NodeRunStatus = 'running' | 'success' | 'error';

export type NodeRunResult = {
  status: NodeRunStatus;
  input?: unknown;
  output?: unknown;
  error?: string;
  logs: string[];
  durationMs?: number;
};

export type LogEntry = {
  time: number;
  nodeId?: string;
  nodeName?: string;
  level: 'info' | 'success' | 'error';
  text: string;
};
