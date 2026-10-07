import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { responsibilityByFormat, type ResponsibilityZone } from '../../app/lib/deliveryModelPresentation';
import {
  FORMAT_WHEN,
  RESPONSIBILITY_GROUPS,
  RESPONSIBILITY_ZONES,
  TO_YOU,
  kindOf,
  noteOf,
  wordOf,
  workName,
} from '../../app/lib/responsibilityTable';

// The /yak-pratsyuiemo responsibility table's words (owner 06.10: «зробити більш зрозумілішим для клієнта»): every one
// derived from responsibilityByFormat(), or a plainer name for the same work, and spoken to the client as «ви».

const resp = responsibilityByFormat();
const formatIds = deliveryModel.formats.map((format) => format.id);
const zones = RESPONSIBILITY_ZONES.map((zone) => zone.id);
const byRow = (row: string) => resp.items.find((item) => item.rows[0] === row)!;

describe('responsibility table', () => {
  it('has a column per party, the client being «Ви», and a plain «when it is yours» line per format', () => {
    expect(RESPONSIBILITY_ZONES.map((zone) => zone.title)).toEqual(['RUBIKON', 'Ви', 'Профільні спеціалісти']);
    expect(Object.keys(FORMAT_WHEN).sort()).toEqual([...formatIds].sort());
    for (const id of formatIds) expect(FORMAT_WHEN[id].length).toBeGreaterThan(20);
  });

  it('puts every work of the model in exactly one group, in the model’s order', () => {
    const grouped = RESPONSIBILITY_GROUPS.flatMap((group) => resp.items.filter((item) => group.rows.includes(item.rows[0])));
    expect(grouped).toEqual(resp.items);
    for (const item of resp.items) {
      expect(RESPONSIBILITY_GROUPS.filter((group) => group.rows.includes(item.rows[0])), item.text).toHaveLength(1);
    }
  });

  it('names a work plainly where the model is technical, and in the model’s words otherwise', () => {
    expect(workName(byRow('task-framing'))).toBe('Розібрати задачу й скласти список потрібних даних');
    expect(workName(byRow('steel'))).toBe('Будівельні роботи: фундаменти, бетон, каркас, покрівля');
    expect(workName(byRow('estimate'))).toBe(byRow('estimate').text);
    expect(new Set(resp.items.map(workName)).size).toBe(resp.items.length);
  });

  it('says each party’s part in a word that follows the model’s roles', () => {
    for (const item of resp.items) {
      for (const format of formatIds) {
        for (const zone of zones) {
          const kind = kindOf(item, zone, format);
          const word = wordOf(item, zone, format);
          if (zone === 'client') expect([kind, word]).toEqual(['client', 'На вас']);
          if (zone === 'specialists') expect([kind, word]).toEqual(['specialist', 'Виконують']);
          if (zone === 'rubikon') {
            const role = item.rubikonRole[format];
            if (!role || role === 'executes') expect([kind, word]).toEqual(['own', 'Робимо']);
            if (role === 'coordinates') expect([kind, word]).toEqual(['soft', 'Координуємо']);
            if (role === 'organizes') expect([kind, word]).toEqual(['soft', 'Організовуємо']);
          }
        }
      }
    }
    // the model's own cases: RUBIKON organises the fabrication and coordinates the engineering systems in a complex
    expect(wordOf(byRow('steel-fabrication'), 'rubikon', 'comprehensive')).toBe('Організовуємо');
    expect(wordOf(byRow('engineering-systems'), 'rubikon', 'comprehensive')).toBe('Координуємо');
  });

  it('keeps the model’s notes, spoken to «ви», without repeating the word or the RUBIKON cell', () => {
    // second person
    expect(noteOf(byRow('materials'), 'rubikon', 'comprehensive')).toBe('або надаєте ви — залежно від договору');
    expect(noteOf(byRow('engineering-systems'), 'client', 'comprehensive')).toBe('або окремо, на вашому боці');
    expect(noteOf(byRow('surveys'), 'specialists', 'comprehensive')).toBe('ваші спеціалісти');
    // a note that only repeats the cell's word is dropped (the generated «організовуємо», the model's «виконують»)
    expect(noteOf(byRow('steel-fabrication'), 'rubikon', 'comprehensive')).toBeUndefined();
    expect(noteOf(byRow('engineering-systems'), 'specialists', 'comprehensive')).toBeUndefined();
    // a specialists' note identical to RUBIKON's in the same row is said once, under RUBIKON
    expect(noteOf(byRow('flexible-packages'), 'rubikon', 'comprehensive')).toBe('склад і виконавців визначаємо під проєкт');
    expect(noteOf(byRow('flexible-packages'), 'specialists', 'comprehensive')).toBeUndefined();
    // a cell without a note has none
    expect(noteOf(byRow('estimate'), 'rubikon', 'comprehensive')).toBeUndefined();
    // every note shown is the model's note or its second-person form
    for (const item of resp.items) {
      for (const format of formatIds) {
        for (const zone of zones as ResponsibilityZone[]) {
          const shown = noteOf(item, zone, format);
          if (shown === undefined) continue;
          const source = item.notes[zone]?.[format];
          expect([source, TO_YOU[source ?? '']]).toContain(shown);
        }
      }
    }
  });

  it('turns every third-person note it knows into the second person, and no note it does not', () => {
    for (const [from, to] of Object.entries(TO_YOU)) {
      expect(to).not.toEqual(from);
      expect(to).not.toMatch(/замовник|генпідрядник(?!а)/);
    }
  });
});
