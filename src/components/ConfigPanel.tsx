import { useState } from 'react';
import type { FieldDef, FlowNode, NodeRunResult } from '../types';
import { getDefinition } from '../nodes/registry';

type Props = {
  node: FlowNode;
  result?: NodeRunResult;
  onConfigChange: (key: string, value: string) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

const MAX_JSON_CHARS = 20000;

function JsonView({ value }: { value: unknown }) {
  if (value === undefined) return <p className="muted">Nothing yet.</p>;
  let text = JSON.stringify(value, null, 2) ?? String(value);
  if (text.length > MAX_JSON_CHARS) text = text.slice(0, MAX_JSON_CHARS) + '\n… (truncated)';
  return <pre className="json">{text}</pre>;
}

function Field({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  const common = { id: field.key, value, placeholder: field.placeholder, spellCheck: false };
  switch (field.type) {
    case 'select':
      return (
        <select {...common} onChange={(e) => onChange(e.target.value)}>
          {field.options?.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    case 'code':
      return <textarea {...common} className="code" rows={7} onChange={(e) => onChange(e.target.value)} />;
    case 'textarea':
      return <textarea {...common} rows={3} onChange={(e) => onChange(e.target.value)} />;
    default:
      return <input {...common} type="text" onChange={(e) => onChange(e.target.value)} />;
  }
}

export function ConfigPanel({ node, result, onConfigChange, onRename, onDelete }: Props) {
  const [tab, setTab] = useState<'settings' | 'output'>('settings');
  const def = getDefinition(node.data.kind);
  if (!def) return null;

  return (
    <aside className="panel">
      <div className="panel__header" style={{ borderTopColor: def.color }}>
        <span className="panel__icon">{def.icon}</span>
        <input
          className="panel__name"
          value={node.data.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="Node name"
        />
      </div>
      <p className="muted panel__desc">{def.description}</p>

      <div className="tabs">
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          Settings
        </button>
        <button className={tab === 'output' ? 'active' : ''} onClick={() => setTab('output')}>
          Last run {result && <span className={`dot dot--${result.status}`} />}
        </button>
      </div>

      {tab === 'settings' ? (
        <div className="panel__body">
          {def.fields.map((field) => (
            <label key={field.key} className="field" htmlFor={field.key}>
              <span>{field.label}</span>
              <Field
                field={field}
                value={node.data.config[field.key] ?? ''}
                onChange={(v) => onConfigChange(field.key, v)}
              />
              {field.help && <small className="muted">{field.help}</small>}
            </label>
          ))}
          <button className="btn btn--danger" onClick={onDelete}>
            Delete node
          </button>
        </div>
      ) : (
        <div className="panel__body">
          {!result ? (
            <p className="muted">This node hasn't run yet. Click Run.</p>
          ) : (
            <>
              <p className="muted">
                Status: <strong className={`text--${result.status}`}>{result.status}</strong>
                {result.durationMs !== undefined && ` · ${result.durationMs} ms`}
              </p>
              {result.error && <pre className="json json--error">{result.error}</pre>}
              {result.logs.length > 0 && (
                <>
                  <h4>Logs</h4>
                  <pre className="json">{result.logs.join('\n')}</pre>
                </>
              )}
              <h4>Input</h4>
              <JsonView value={result.input} />
              <h4>Output</h4>
              <JsonView value={result.output} />
            </>
          )}
        </div>
      )}
    </aside>
  );
}
