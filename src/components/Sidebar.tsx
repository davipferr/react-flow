import type { DragEvent } from 'react';
import { categoryLabels, nodeDefinitions } from '../nodes/registry';
import type { NodeCategory } from '../types';

export const DRAG_TYPE = 'application/flow-node-kind';

const categories: NodeCategory[] = ['trigger', 'action', 'logic'];

type Props = { onAdd: (kind: string) => void };

export function Sidebar({ onAdd }: Props) {
  const onDragStart = (e: DragEvent, kind: string) => {
    e.dataTransfer.setData(DRAG_TYPE, kind);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="sidebar">
      <p className="sidebar__hint">Drag a node onto the canvas, or click to add it.</p>
      {categories.map((category) => (
        <section key={category}>
          <h3 className="sidebar__heading">{categoryLabels[category]}</h3>
          {nodeDefinitions
            .filter((d) => d.category === category)
            .map((d) => (
              <button
                key={d.kind}
                className="palette-item"
                draggable
                onDragStart={(e) => onDragStart(e, d.kind)}
                onClick={() => onAdd(d.kind)}
                style={{ borderLeftColor: d.color }}
              >
                <span className="palette-item__icon">{d.icon}</span>
                <span>
                  <strong>{d.label}</strong>
                  <small>{d.description}</small>
                </span>
              </button>
            ))}
        </section>
      ))}
    </aside>
  );
}
