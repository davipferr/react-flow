import { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

type Props = { entries: LogEntry[]; onSelectNode: (id: string) => void };

const formatTime = (t: number) => new Date(t).toLocaleTimeString();

export function LogPanel({ entries, onSelectNode }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries]);

  return (
    <div className="log-panel">
      <div className="log-panel__title">Run log</div>
      <div className="log-panel__entries">
        {entries.length === 0 && <p className="muted">Click Run to execute the flow.</p>}
        {entries.map((e, i) => (
          <div key={i} className={`log-entry log-entry--${e.level}`}>
            <span className="log-entry__time">{formatTime(e.time)}</span>
            {e.nodeId && (
              <button className="log-entry__node" onClick={() => onSelectNode(e.nodeId!)}>
                {e.nodeName}
              </button>
            )}
            <span className="log-entry__text">{e.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
