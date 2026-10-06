'use client';

import { useState, type CSSProperties } from 'react';
import { StartDrawing } from './StartDrawing';

// /napryamky «Що у вас уже є — з того й почнемо»: pick what you already have, and the eight stages of the Delivery
// Model show where the work starts — the start stage takes the copper ring, the copper run goes from it to the last
// stage, the stages before it step back. Under the track: the start stage's own description. Every word comes from the
// Delivery Model (entry states, their start stage and note; the stages' titles and «what»). Owner 06.10 («набагато
// цікавішим»): each entry is drawn (StartDrawing), and a small copy of the chosen one rides the track to its start stage.

export type StartEntry = { id: string; label: string; startStage: string; startNote?: string };
export type StartStage = { id: string; number: string; title: string; what: string };

export function StartTrack({ entries, stages }: Readonly<{ entries: readonly StartEntry[]; stages: readonly StartStage[] }>) {
  const [active, setActive] = useState(entries[0].id);
  const entry = entries.find((item) => item.id === active) ?? entries[0];
  const startIndex = Math.max(0, stages.findIndex((stage) => stage.id === entry.startStage));
  const start = stages[startIndex];

  return (
    <div className="dstart" data-motion style={{ '--start': startIndex, '--last': stages.length - 1 } as CSSProperties}>
      <ul className="entry-points-list dstart-entries">
        {entries.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="dstart-entry"
              aria-pressed={item.id === active}
              onClick={() => setActive(item.id)}
              onFocus={() => setActive(item.id)}
              onMouseEnter={() => setActive(item.id)}
            >
              <StartDrawing kind={item.id} />
              <b>{item.label}</b>
              {item.startNote && <small>{item.startNote}</small>}
            </button>
          </li>
        ))}
      </ul>
      <div className="dstart-track" aria-hidden="true">
        {/* The chosen entry rides the track to its start stage; its drawing re-plots on each change (the key) */}
        <span className="dstart-token">
          <StartDrawing kind={entry.id} className="start-drawing start-drawing-token" key={entry.id} />
        </span>
        <span className="dstart-rail" />
        <span className="dstart-run" />
        <ol className="dstart-stages">
          {stages.map((stage, index) => (
            <li key={stage.id} data-state={index < startIndex ? 'before' : index === startIndex ? 'start' : 'after'} style={{ '--i': index } as CSSProperties}>
              <i className="dstart-node" />
              <span className="dstart-num">{stage.number}</span>
              <span className="dstart-name">{stage.title}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="dstart-detail" key={entry.id} aria-live="polite">
        <p className="dstart-kicker">Почнемо з етапу</p>
        <p className="dstart-stage"><b>{start.number}</b> {start.title}</p>
        <p className="dstart-what">{start.what}</p>
      </div>
    </div>
  );
}
