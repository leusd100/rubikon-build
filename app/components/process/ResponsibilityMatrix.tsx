import { Fragment, type CSSProperties } from 'react';
import type { ResponsibilityZone, SwitchFormat, SwitchItem } from '../../lib/deliveryModelPresentation';

// /yak-pratsyuiemo «Відповідальність без дрібного шрифту» as one table (owner 06.10: the three lists were hard to compare,
// then «зробити більш зрозумілішим для клієнта»). A row per work, a column per party, and the reader is one of the
// parties: «Ви». Each cell says its part in a word — «Робимо», «Координуємо», «На вас», «Виконують» — so nothing needs a
// key. The format switcher above (radios, name="resp-format") picks the format with CSS :has, so the table works without
// JavaScript: each row's word-marks carry their column, word, look and visibility per format as custom properties, and the
// chosen format's set wins — so on a switch the marks slide to their new columns. The cells repeat the word for screen
// readers (the marks are decoration), with the model's note where the parties share a work.

const ZONES: readonly { id: ResponsibilityZone; title: string }[] = [
  { id: 'rubikon', title: 'RUBIKON' },
  { id: 'client', title: 'Ви' },
  { id: 'specialists', title: 'Профільні спеціалісти' },
];

/** When a format is the visitor's, in plain words — built from the page's own entries (STARTS), the formats' contract
 *  terms (CHOICE_TERMS: who coordinates) and their interfaces; no new promise. The model's interfaces line follows it. */
const WHEN: Record<SwitchFormat['id'], string> = {
  comprehensive: 'Потрібно звести об’єкт комплексно — ми координуємо погоджений обсяг робіт.',
  'work-package': 'Потрібен окремий етап: фундамент, каркас чи покрівля. Об’єкт загалом координуєте ви або ваш генпідрядник.',
  subcontract: 'Ви генпідрядник, і вам потрібен виконавець на пакет робіт.',
};

/** The rows in three groups, by the first matrix row each work stands for. */
const GROUPS: readonly { title: string; rows: readonly string[] }[] = [
  { title: 'Підготовка', rows: ['task-framing', 'site-inputs', 'design', 'interfaces', 'estimate'] },
  { title: 'Будівництво', rows: ['materials', 'steel', 'steel-fabrication', 'flexible-packages', 'engineering-systems', 'external-utilities', 'process-equipment', 'quality-control'] },
  { title: 'Нагляд, дозволи й здача', rows: ['permits', 'surveys', 'acceptance'] },
];

/** Plainer names for the most technical works (same scope; the model's wording stays in the data). */
const PLAIN: Readonly<Record<string, string>> = {
  'task-framing': 'Розібрати задачу й скласти список потрібних даних',
  design: 'Проєкт об’єкта',
  interfaces: 'Ув’язка наших робіт з іншими роботами на об’єкті',
  steel: 'Будівельні роботи: фундаменти, бетон, каркас, покрівля',
  surveys: 'Геодезія й геологія, технічний і авторський нагляд',
};

type MarkKind = 'own' | 'soft' | 'client' | 'specialist';

/** Fill, line, line style and word colour of each kind of mark (resp-matrix.css defines the --rm-* values per theme). */
const KIND_LOOK: Record<MarkKind, readonly [fill: string, line: string, style: string, ink: string]> = {
  own: ['var(--rm-own)', 'var(--rm-own)', 'solid', 'var(--rm-own-ink)'],
  soft: ['transparent', 'var(--rm-own)', 'solid', 'var(--rm-soft-ink)'],
  client: ['var(--rm-client)', 'var(--rm-client)', 'solid', 'var(--rm-client-ink)'],
  specialist: ['transparent', 'var(--rm-specialist)', 'dashed', 'var(--rm-specialist)'],
};

function kindOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): MarkKind {
  if (zone === 'client') return 'client';
  if (zone === 'specialists') return 'specialist';
  const role = item.rubikonRole[format];
  return role && role !== 'executes' ? 'soft' : 'own';
}

/** The word in a cell: what that party does with the work in that format. */
function wordOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): string {
  const kind = kindOf(item, zone, format);
  if (kind === 'soft') return item.rubikonRole[format] === 'organizes' ? 'Організовуємо' : 'Координуємо';
  return { own: 'Робимо', client: 'На вас', specialist: 'Виконують' }[kind];
}

/** The model's notes were written about «замовник» / «генпідрядник»; the table speaks to them as «ви». */
const TO_YOU: Readonly<Record<string, string>> = {
  'або надає замовник — залежно від договору': 'або надаєте ви — залежно від договору',
  'або надає генпідрядник — залежно від договору': 'або надаєте ви — залежно від договору',
  'або окремо на стороні замовника': 'або окремо, на вашому боці',
  'координує об’єкт загалом': 'координуєте об’єкт загалом',
  'описує пакет робіт і графік': 'описуєте пакет робіт і графік',
  'спеціалісти замовника': 'ваші спеціалісти',
  'спеціалісти генпідрядника': 'ваші спеціалісти',
  'сам або через свого генпідрядника': 'самі або через свого генпідрядника',
};

/**
 * The model's note for a cell, in the second person — unless it only repeats the cell's word (the generated
 * «координуємо» / «організовуємо», «виконують») or the RUBIKON cell's note in the same row.
 */
function noteOf(item: SwitchItem, zone: ResponsibilityZone, format: SwitchFormat['id']): string | undefined {
  const note = item.notes[zone]?.[format];
  if (!note || note.toLowerCase() === wordOf(item, zone, format).toLowerCase()) return undefined;
  if (zone !== 'rubikon' && note === item.notes.rubikon?.[format] && item.zones.rubikon.includes(format)) return undefined;
  return TO_YOU[note] ?? note;
}

/**
 * The word-marks of one row: as many as the row ever needs in one format. Mark k in a format stands in the column of the
 * k-th party holding the work there; where the format needs fewer, it folds into its neighbour and fades — so a work
 * that gains or loses a party splits or merges on the switch.
 */
function marksOf(item: SwitchItem, formats: readonly SwitchFormat[]) {
  const placed = formats.map((format) => ZONES
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
          <p className="proc-principle">{WHEN[format.id]}</p>
          <p className="rm-when-how">{format.principle}</p>
        </div>
      ))}
      <div className="resp-matrix" role="table" aria-labelledby="proc-responsibility-title">
        <div className="rm-head" role="row">
          <span className="rm-work-head" role="columnheader">Робота</span>
          {ZONES.map((zone) => (
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
        {GROUPS.map((group) => (
          <Fragment key={group.title}>
            <div className="rm-group" role="row">
              <span role="cell" aria-colspan={4}>{group.title}</span>
            </div>
            {items.filter((item) => group.rows.includes(item.rows[0])).map((item) => {
              const i = index++;
              const out = formats.filter((format) => ZONES.every((zone) => !item.zones[zone.id].includes(format.id)));
              // What the row's placement is in each format, for FormatSwitchSync to light the rows a switch has moved
              const places = Object.fromEntries(formats.map((format) => [
                `data-${format.id}`,
                ZONES.filter((zone) => item.zones[zone.id].includes(format.id)).map((zone) => `${zone.id}:${kindOf(item, zone.id, format.id)}`).join(' ') || 'out',
              ]));
              return (
                <div className="rm-row" role="row" key={item.text} style={{ '--i': i } as CSSProperties} data-out={out.map((format) => format.id).join(' ') || undefined} {...places}>
                  <span className="rm-work" role="rowheader">{PLAIN[item.rows[0]] ?? item.text}</span>
                  {ZONES.map((zone) => (
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
