import type { NodeCategory, NodeDefinition } from '../types';
import { evaluate, renderTemplate, runCode } from '../engine/expressions';

// To add a new node type, add a definition to this list. The editor, sidebar,
// settings panel and runner all read from here.
export const nodeDefinitions: NodeDefinition[] = [
  {
    kind: 'manualTrigger',
    label: 'Manual Trigger',
    description: 'Starts the flow when you click Run',
    icon: '▶',
    color: '#f97316',
    category: 'trigger',
    hasInput: false,
    outputs: ['out'],
    fields: [
      {
        key: 'payload',
        label: 'Starting data (JSON)',
        type: 'code',
        help: 'Sent as input to the next node.',
      },
    ],
    defaults: { payload: '{}' },
    summary: () => 'When clicking Run',
    async execute({ config }) {
      const text = config.payload.trim();
      return { output: text ? JSON.parse(text) : {} };
    },
  },
  {
    kind: 'httpRequest',
    label: 'HTTP Request',
    description: 'Calls a URL / API',
    icon: '🌐',
    color: '#3b82f6',
    category: 'action',
    hasInput: true,
    outputs: ['out'],
    fields: [
      {
        key: 'method',
        label: 'Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      },
      {
        key: 'url',
        label: 'URL',
        type: 'text',
        placeholder: 'https://api.example.com/items/{{ input.id }}',
      },
      { key: 'headers', label: 'Headers (JSON)', type: 'code', placeholder: '{ "Authorization": "Bearer ..." }' },
      {
        key: 'body',
        label: 'Body',
        type: 'code',
        help: 'Ignored for GET and DELETE.',
      },
    ],
    defaults: { method: 'GET', url: '', headers: '', body: '' },
    summary: (c) => `${c.method} ${c.url || '(no URL)'}`,
    async execute({ input, config }) {
      const url = renderTemplate(config.url, input).trim();
      if (!url) throw new Error('URL is required');

      const headers: Record<string, string> = config.headers.trim()
        ? JSON.parse(renderTemplate(config.headers, input))
        : {};
      const init: RequestInit = { method: config.method, headers };
      if (config.method !== 'GET' && config.method !== 'DELETE' && config.body.trim()) {
        init.body = renderTemplate(config.body, input);
        if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
          headers['Content-Type'] = 'application/json';
        }
      }

      let res: Response;
      try {
        res = await fetch(url, init);
      } catch {
        throw new Error(
          'Request failed. The server may be down or may block requests from browsers (CORS).',
        );
      }
      const text = await res.text();
      let data: unknown = text;
      try {
        data = JSON.parse(text);
      } catch {
        // Not JSON, keep the raw text
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return { output: { status: res.status, data } };
    },
  },
  {
    kind: 'code',
    label: 'Code',
    description: 'Transforms data with JavaScript',
    icon: '{ }',
    color: '#a855f7',
    category: 'action',
    hasInput: true,
    outputs: ['out'],
    fields: [
      {
        key: 'code',
        label: 'JavaScript',
        type: 'code',
        help: '`input` is the previous node output. Whatever you return goes to the next node. `await` works.',
      },
    ],
    defaults: {
      code: '// "input" is the previous node\'s output\nreturn { ...input, processedAt: new Date().toISOString() };',
    },
    summary: () => 'Run JavaScript',
    async execute({ input, config }) {
      return { output: await runCode(config.code, input) };
    },
  },
  {
    kind: 'if',
    label: 'If',
    description: 'Splits the flow in true / false',
    icon: '⑂',
    color: '#10b981',
    category: 'logic',
    hasInput: true,
    outputs: ['true', 'false'],
    fields: [
      {
        key: 'condition',
        label: 'Condition (JS expression)',
        type: 'text',
        placeholder: 'input.price > 100',
        help: 'The input is passed through unchanged to the chosen branch.',
      },
    ],
    defaults: { condition: 'input.status === 200' },
    summary: (c) => c.condition || '(no condition)',
    async execute({ input, config, log }) {
      const result = Boolean(evaluate(config.condition, input));
      log(`Condition is ${result}`);
      return { output: input, branch: result ? 'true' : 'false' };
    },
  },
  {
    kind: 'wait',
    label: 'Wait',
    description: 'Pauses for some seconds',
    icon: '⏱',
    color: '#eab308',
    category: 'logic',
    hasInput: true,
    outputs: ['out'],
    fields: [{ key: 'seconds', label: 'Seconds', type: 'text' }],
    defaults: { seconds: '1' },
    summary: (c) => `Wait ${c.seconds}s`,
    async execute({ input, config }) {
      const seconds = Number(config.seconds);
      if (!Number.isFinite(seconds) || seconds < 0) throw new Error('Seconds must be a positive number');
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      return { output: input };
    },
  },
  {
    kind: 'log',
    label: 'Log',
    description: 'Writes a message to the run log',
    icon: '📝',
    color: '#64748b',
    category: 'action',
    hasInput: true,
    outputs: ['out'],
    fields: [
      {
        key: 'message',
        label: 'Message',
        type: 'textarea',
        help: 'Use {{ input.field }} to insert data.',
      },
    ],
    defaults: { message: 'Received: {{ input }}' },
    summary: (c) => c.message,
    async execute({ input, config, log }) {
      log(renderTemplate(config.message, input));
      return { output: input };
    },
  },
];

const byKind = new Map(nodeDefinitions.map((d) => [d.kind, d]));

export function getDefinition(kind: string): NodeDefinition | undefined {
  return byKind.get(kind);
}

export const categoryLabels: Record<NodeCategory, string> = {
  trigger: 'Triggers',
  action: 'Actions',
  logic: 'Logic',
};
