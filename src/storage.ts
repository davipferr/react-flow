import type { Flow, FlowNode } from './types';
import { getDefinition } from './nodes/registry';

const STORAGE_KEY = 'flowforge.flow.v1';

export function newNodeId(kind: string): string {
  return `${kind}-${crypto.randomUUID().slice(0, 8)}`;
}

export function isFlow(value: unknown): value is Flow {
  const v = value as Flow;
  return !!v && Array.isArray(v.nodes) && Array.isArray(v.edges);
}

export function loadFlow(): Flow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return isFlow(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveFlow(flow: Flow): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flow));
  } catch {
    // Storage unavailable (private mode, full...). The flow just won't persist.
  }
}

function makeNode(id: string, kind: string, x: number, y: number, name: string, config: Record<string, string>): FlowNode {
  const def = getDefinition(kind)!;
  return {
    id,
    type: 'flow',
    position: { x, y },
    data: { kind, name, config: { ...def.defaults, ...config } },
  };
}

/** A small demo: fetch a GitHub repo, pick some fields, branch on the star count. */
export function createExampleFlow(): Flow {
  return {
    nodes: [
      makeNode('trigger', 'manualTrigger', 0, 120, 'Start', { payload: '{\n  "repo": "xyflow/xyflow"\n}' }),
      makeNode('fetch', 'httpRequest', 280, 120, 'Get repo from GitHub', {
        url: 'https://api.github.com/repos/{{ input.repo }}',
      }),
      makeNode('pick', 'code', 580, 120, 'Pick fields', {
        code: 'const repo = input.data;\nreturn {\n  name: repo.full_name,\n  stars: repo.stargazers_count,\n  url: repo.html_url,\n};',
      }),
      makeNode('check', 'if', 860, 120, 'More than 10k stars?', { condition: 'input.stars > 10000' }),
      makeNode('popular', 'log', 1140, 40, 'Popular', {
        message: '⭐ {{ input.name }} is popular: {{ input.stars }} stars',
      }),
      makeNode('small', 'log', 1140, 210, 'Not popular', {
        message: '{{ input.name }} has only {{ input.stars }} stars',
      }),
    ],
    edges: [
      { id: 'e1', source: 'trigger', sourceHandle: 'out', target: 'fetch' },
      { id: 'e2', source: 'fetch', sourceHandle: 'out', target: 'pick' },
      { id: 'e3', source: 'pick', sourceHandle: 'out', target: 'check' },
      { id: 'e4', source: 'check', sourceHandle: 'true', target: 'popular' },
      { id: 'e5', source: 'check', sourceHandle: 'false', target: 'small' },
    ],
  };
}
