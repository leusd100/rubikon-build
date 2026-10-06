import type { CSSProperties } from 'react';
import type { ResponsibilityZone, SwitchFormat, SwitchItem } from '../../lib/deliveryModelPresentation';

// /yak-pratsyuiemo «Відповідальність без дрібного шрифту» as one table (owner 06.10: the three lists were hard to compare —
// «спростити і зробити зрозумілішим для клієнта»). A row per work, a column per party; a work reads left to right. The
// format switcher above (radios, name="resp-format") picks the format with CSS :has, so the table works without
// JavaScript: each row's marks carry their column, look and visibility per format as custom properties, and the chosen
// format's set wins — so on a switch the marks slide to their new columns. The cells say the same in words (the model's
// notes, and a role word for screen readers); the marks are decoration.

const ZONES: readonly { id: ResponsibilityZone; title: string }[] = [
  { id: 'rubikon', title: 'RUBIKON' },
  { id: 'client', title: 'Замовник' },
  { id: 'specialists', title: 'Профільні спеціалісти' },
];

type MarkKind = 'own' | 'soft' | 'client' | 'specialist';

/** Fill, line and line style of each kind of mark (resp-matrix.css defines the --rm-* values per theme). */
const KIND_LOOK: Record<MarkKind, readonly [fill: string, line: string, style: string]> = {
  own: ['var(--rm-own)', 'var(--rm-own)', 'solid'],
  soft: ['transparent', 'var(--rm-own)', 'solid'],
  client: ['var(--rm-client)', 'var(--rm-client)', 'solid'],
  specialist: ['transparent', 'var(--rm-specialist)', 'dashed'],
};

const ROLE_WORD: Record<MarkKind, string> = { own: 'виконує', soft: 'координує', client: 'забезпечує', specialist: 'виконують' };

function kindOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): MarkKind {
  if (zone === 'client') return 'client';
  if (zone === 'specialists') return 'specialist';
  const role = item.rubikonRole[format];
  return role && role !== 'executes' ? 'soft' : 'own';
}

/**
 * The marks of one row: as many as the row ever needs in one format. Mark k in a format stands in the column of the k-th
 * party holding the work there; where the format needs fewer, it folds into its neighbour and fades — so a work that
 * gains or loses a party splits or merges on the switch.
 */
function marksOf(item: SwitchItem, formats: readonly SwitchFormat[]) {
  const placed = formats.map((format) => ZONES
    .map((zone, col) => ({ col, zone: zone.id }))
    .filter(({ zone }) => item.zones[zone].includes(format.id))
    .map(({ col, zone }) => ({ col, kind: kindOf(item, zone, format.id) })));
  const count = Math.max(1, ...placed.map((list) => list.length));
  return Array.from({ length: count }, (_, k) => {
    const style: Record<string, string | number> = {};
    formats.forEach((format, index) => {
      const list = placed[index];
      const mark = list[k] ?? list.at(-1);
      const [fill, line, lineStyle] = KIND_LOOK[mark?.kind ?? 'own'];
      style[`--c-${format.id}`] = mark ? mark.col : 1;
      style[`--o-${format.id}`] = list[k] ? 1 : 0;
      style[`--f-${format.id}`] = fill;
      style[`--l-${format.id}`] = line;
      style[`--s-${format.id}`] = lineStyle;
    });
    return style as CSSProperties;
  });
}

export function ResponsibilityMatrix({ formats, items, boundary }: Readonly<{
  formats: readonly SwitchFormat[];
  items: readonly SwitchItem[];
  boundary: string;
}>) {
  return (
    <div className="resp-matrix-wrap" data-motion>
      {formats.map((format) => <p className="proc-principle" data-format={format.id} key={format.id}>{format.principle}</p>)}
      <ul className="rm-key" aria-label="Позначки в таблиці">
        <li><i className="rm-key-own" aria-hidden="true" />Виконуємо</li>
        <li><i className="rm-key-soft" aria-hidden="true" />Координуємо або організовуємо</li>
        <li><i className="rm-key-client" aria-hidden="true" />Забезпечує сторона договору</li>
        <li><i className="rm-key-specialist" aria-hidden="true" />Окремі спеціалізовані роботи</li>
      </ul>
      <div className="resp-matrix" role="table" aria-labelledby="proc-responsibility-title">
        <div className="rm-head" role="row">
          <span className="rm-work-head" role="columnheader">Що потрібно</span>
          {ZONES.map((zone) => (
            <span className={`rm-col rm-col-${zone.id}`} role="columnheader" key={zone.id}>
              <b>
                {zone.id === 'client'
                  ? formats.map((format) => <span data-format={format.id} key={format.id}>{format.clientTitle}</span>)
                  : zone.title}
              </b>
              {/* Who coordinates the object in the chosen format: the tag sits under that party's name */}
              {formats.filter((format) => format.coordinator.zone === zone.id).map((format) => (
                <small className="rm-coordinator" data-format={format.id} key={format.id}>
                  <b>Координує об’єкт</b>{format.coordinator.note && <span>{format.coordinator.note}</span>}
                </small>
              ))}
            </span>
          ))}
        </div>
        {items.map((item, index) => {
          const out = formats.filter((format) => ZONES.every((zone) => !item.zones[zone.id].includes(format.id)));
          // What the row's placement is in each format, for FormatSwitchSync to light the rows a switch has moved
          const places = Object.fromEntries(formats.map((format) => [
            `data-${format.id}`,
            ZONES.filter((zone) => item.zones[zone.id].includes(format.id)).map((zone) => `${zone.id}:${kindOf(item, zone.id, format.id)}`).join(' ') || 'out',
          ]));
          return (
            <div className="rm-row" role="row" key={item.text} style={{ '--i': index } as CSSProperties} data-out={out.map((format) => format.id).join(' ') || undefined} {...places}>
              <span className="rm-work" role="rowheader">{item.text}</span>
              {ZONES.map((zone) => (
                <span className="rm-cell" role="cell" key={zone.id}>
                  {formats.filter((format) => item.zones[zone.id].includes(format.id)).map((format) => {
                    const note = item.notes[zone.id]?.[format.id];
                    const word = ROLE_WORD[kindOf(item, zone.id, format.id)];
                    return (
                      <span className="rm-say" data-format={format.id} key={format.id}>
                        {note ? <small>{note}</small> : <span className="sr-only">{word}</span>}
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
      </div>
      {/* Everything above is fixed in the contract before work starts */}
      <div className="proc-contract-band">
        <h3 className="proc-contract-tab">Договір</h3>
        <p>{boundary}</p>
      </div>
    </div>
  );
}
