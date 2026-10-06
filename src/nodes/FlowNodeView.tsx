import { Fragment, useContext } from 'react';
import type { CSSProperties } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { FlowNode } from '../types';
import { RunResultsContext } from './runResultsContext';
import { getDefinition } from './registry';

const statusIcons = { running: '…', success: '✓', error: '!' };

export function FlowNodeView({ id, data, selected }: NodeProps<FlowNode>) {
  const def = getDefinition(data.kind);
  const run = useContext(RunResultsContext)[id];
  if (!def) return <div className="flow-node">Unknown node: {data.kind}</div>;

  const classes = ['flow-node', selected && 'is-selected', run && `status-${run.status}`]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={{ '--accent': def.color } as CSSProperties}>
      {def.hasInput && <Handle type="target" position={Position.Left} />}

      <div className="flow-node__icon">{def.icon}</div>
      <div className="flow-node__body">
        <div className="flow-node__title">{data.name}</div>
        <div className="flow-node__summary">{def.summary?.(data.config)}</div>
      </div>
      {run && (
        <div className="flow-node__status" title={run.error ?? run.status}>
          {statusIcons[run.status]}
        </div>
      )}

      {def.outputs.map((output, i) => {
        const top = `${((i + 1) / (def.outputs.length + 1)) * 100}%`;
        return (
          <Fragment key={output}>
            <Handle type="source" position={Position.Right} id={output} style={{ top }} />
            {def.outputs.length > 1 && (
              <span className="flow-node__handle-label" style={{ top }}>
                {output}
              </span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
