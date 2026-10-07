import { Fragment, type CSSProperties } from 'react';
import type { SwitchFormat, SwitchItem } from '../../lib/deliveryModelPresentation';
import {
  FORMAT_WHEN, RESPONSIBILITY_GROUPS, RESPONSIBILITY_ZONES, TO_YOU, kindOf, noteOf, wordOf, workName, type MarkKind,
} from '../../lib/responsibilityTable';

// /yak-pratsyuiemo «Відповідальність без дрібного шрифту» as one table (owner 06.10: the three lists were hard to compare,
// then «зробити більш зрозумілішим для клієнта»). A row per work, a column per party, and the reader is one of the
// parties: «Ви». Each cell says its part in a word — «Робимо», «Координуємо», «На вас», «Виконують» — so nothing needs a
// key. The format switcher above (radios, name="resp-format") picks the format with CSS :has, so the table works without
// JavaScript: each row's word-marks carry their column, word, look and visibility per format as custom properties, and the
// chosen format's set wins — so on a switch the marks slide to their new columns. The cells repeat the word for screen
// readers (the marks are decoration), with the model's note where the parties share a work.

/** Fill, line, line style and word colour of each kind of mark (resp-matrix.css defines the --rm-* values per theme). */
const KIND_LOOK: Record<MarkKind, readonly [fill: string, line: string, style: string, ink: string]> = {
  own: ['var(--rm-own)', 'var(--rm-own)', 'solid', 'var(--rm-own-ink)'],
  soft: ['transparent', 'var(--rm-own)', 'solid', 'var(--rm-soft-ink)'],
  client: ['var(--rm-client)', 'var(--rm-client)', 'solid', 'var(--rm-client-ink)'],
  specialist: ['transparent', 'var(--rm-specialist)', 'dashed', 'var(--rm-specialist)'],
};

/**
 * The word-marks of one row: as many as the row ever needs in one format. Mark k in a format stands in the column of the
 * k-th party holding the work there; where the format needs fewer, it folds into its neighbour and fades — so a work
 * that gains or loses a party splits or merges on the switch.
 */
function marksOf(item: SwitchItem, formats: readonly SwitchFormat[]) {
  const placed = formats.map((format) => RESPONSIBILITY_ZONES
    .map((zone, col) => ({ col, zone: zone.id }))
    .filter(({ zone }) => item.zones[zone].includes(format.id))
    .map(({ col, zone }) => ({ col, kind: kindOf(item, zone, format.id), word: wordOf(item, zone, format.id) })));
  const count = Math.max(1, ...placed.map((list) => list.length));
  return Array.from({ length: count }, (_, k) => {
    const style: Record<string, string | number> = {};
    formats.forEach((format, index) => {
      const list = placed[index];
      const mark = list[k] ?? list.at(-1);
      const [fill, line, lineStyle, ink] = KIND_LOOK[mark?.kind ?? 'own'];
      style[`--c-${format.id}`] = mark ? mark.col : 1;
      style[`--o-${format.id}`] = list[k] ? 1 : 0;
      style[`--f-${format.id}`] = fill;
      style[`--l-${format.id}`] = line;
      style[`--s-${format.id}`] = lineStyle;
      style[`--k-${format.id}`] = ink;
      style[`--t-${format.id}`] = `"${mark?.word ?? ''}"`;
    });
    return style as CSSProperties;
  });
}

export function ResponsibilityMatrix({ formats, items, boundary }: Readonly<{
  formats: readonly SwitchFormat[];
  items: readonly SwitchItem[];
  boundary: string;
}>) {
  let index = 0;
  return (
    <div className="resp-matrix-wrap" data-motion>
      {formats.map((format) => (
        <div className="rm-when" data-format={format.id} key={format.id}>
          <p className="proc-principle">{FORMAT_WHEN[format.id]}</p>
          <p className="rm-when-how">{format.principle}</p>
        </div>
      ))}
      <div className="resp-matrix" role="table" aria-labelledby="proc-responsibility-title">
        <div className="rm-head" role="row">
          <span className="rm-work-head" role="columnheader">Робота</span>
          {RESPONSIBILITY_ZONES.map((zone) => (
            <span className={`rm-col rm-col-${zone.id}`} role="columnheader" key={zone.id}>
              <b>{zone.title}</b>
              {zone.id === 'client' && formats.map((format) => (
                <small className="rm-who" data-format={format.id} key={format.id}>{format.clientTitle.toLowerCase()}</small>
              ))}
              {/* Who coordinates the object in the chosen format: the tag sits under that party's name */}
              {formats.filter((format) => format.coordinator.zone === zone.id).map((format) => (
                <small className="rm-coordinator" data-format={format.id} key={format.id}>
                  <b>{zone.id === 'client' ? 'Координуєте об’єкт' : 'Координує об’єкт'}</b>
                  {format.coordinator.note && <span>{zone.id === 'client' ? TO_YOU[format.coordinator.note] ?? format.coordinator.note : format.coordinator.note}</span>}
                </small>
              ))}
            </span>
          ))}
        </div>
        {RESPONSIBILITY_GROUPS.map((group) => (
          <Fragment key={group.title}>
            <div className="rm-group" role="row">
              <span role="cell" aria-colspan={4}>{group.title}</span>
            </div>
            {items.filter((item) => group.rows.includes(item.rows[0])).map((item) => {
              const i = index++;
              const out = formats.filter((format) => RESPONSIBILITY_ZONES.every((zone) => !item.zones[zone.id].includes(format.id)));
              // What the row's placement is in each format, for FormatSwitchSync to light the rows a switch has moved
              const places = Object.fromEntries(formats.map((format) => [
                `data-${format.id}`,
                RESPONSIBILITY_ZONES.filter((zone) => item.zones[zone.id].includes(format.id)).map((zone) => `${zone.id}:${kindOf(item, zone.id, format.id)}`).join(' ') || 'out',
              ]));
              return (
                <div className="rm-row" role="row" key={item.text} style={{ '--i': i } as CSSProperties} data-out={out.map((format) => format.id).join(' ') || undefined} {...places}>
                  <span className="rm-work" role="rowheader">{workName(item)}</span>
                  {RESPONSIBILITY_ZONES.map((zone) => (
                    <span className="rm-cell" role="cell" key={zone.id}>
                      {formats.filter((format) => item.zones[zone.id].includes(format.id)).map((format) => {
                        const note = noteOf(item, zone.id, format.id);
                        return (
                          <span className="rm-say" data-format={format.id} key={format.id}>
                            <span className="sr-only">{wordOf(item, zone.id, format.id)}{note ? `: ${note}` : ''}</span>
                            {note && <small aria-hidden="true">{note}</small>}
                          </span>
                        );
                      })}
                    </span>
                  ))}
                  {out.map((format) => (
                    <span className="rm-out" data-format={format.id} key={format.id}>Поза обсягом цього формату</span>
                  ))}
                  <span className="rm-track" aria-hidden="true">
                    {marksOf(item, formats).map((style, k) => <i className="rm-mark" style={style} key={k} />)}
                  </span>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      {/* Everything above is fixed in the contract before work starts */}
      <div className="proc-contract-band">
        <h3 className="proc-contract-tab">Договір</h3>
        <p>{boundary}</p>
      </div>
    </div>
  );
}
