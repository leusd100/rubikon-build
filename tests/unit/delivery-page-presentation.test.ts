import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { formatById } from '../../app/lib/deliveryModel';
import {
  basisLegend,
  budgetGroups,
  capabilityLayers,
  deliveryFaq,
  designThread,
  documentRoute,
  formatDetails,
  formatTokens,
  perFormatRows,
  responsibilityComparison,
  stageCards,
  startInputs,
} from '../../app/lib/deliveryModelPresentation';
import type { CapabilityLayerId, ResponsibilityCell, StageId } from '../../app/types/deliveryModel';

// /yak-pratsyuiemo's presentation layer: every shape it renders is the model, regrouped.

const LABELS = deliveryModel.formats.map((format) => format.label);
const FORMAT_IDS = deliveryModel.formats.map((format) => format.id);
const FORBIDDEN_CLAIMS = [/генеральн\S*\s+підряд/i, /гаранті/i, /ліценз/i, /сертифікат/i, /штат/i, /\d+\s?(хв|хвилин|год)/i, /грн|₴|\$|€/, /від\s*\d[^.]*м²/i];
const stage = (id: StageId) => stageCards().find((card) => card.id === id);
const layer = (id: CapabilityLayerId) => capabilityLayers().find((item) => item.id === id);
const holderIds = (cell: ResponsibilityCell) => (typeof cell === 'string' ? [cell] : [...cell]).sort();

describe('delivery page: formats and stages', () => {
  it('describes each format with its model anchor, coordination and interfaces', () => {
    expect(formatDetails().map((format) => format.anchor)).toEqual(['kompleksna-realizatsiia', 'okremyi-pidriad', 'subpidriad']);
    for (const detail of formatDetails()) {
      const format = formatById(detail.id);
      expect(detail).toMatchObject({ title: format.label, text: format.summary, coordination: format.coordination, interfaces: format.interfaces });
    }
  });

  it('names the formats by the numbers of their cards, 01 to 03, with the full label and anchor alongside', () => {
    expect(formatTokens()).toEqual(
      deliveryModel.formats.map((format, index) => ({ id: format.id, number: `0${index + 1}`, label: format.label, anchor: format.anchor })),
    );
    expect(formatTokens().map((token) => token.number)).toEqual(formatDetails().map((format) => format.number));
  });

  it('lays out all eight stages in order with the model texts, badged documents and a stable anchor', () => {
    const cards = stageCards();

    expect(cards.map((card) => `${card.number} ${card.title}`)).toEqual(deliveryModel.stages.map((item) => `${item.number} ${item.title}`));
    expect(cards.map((card) => card.anchor)).toEqual(['etap-01', 'etap-02', 'etap-03', 'etap-04', 'etap-05', 'etap-06', 'etap-07', 'etap-08']);
    for (const item of deliveryModel.stages) {
      const card = stage(item.id);
      expect(card).toMatchObject({ what: item.what, result: item.result, gate: item.gate, why: item.why });
      expect(card?.documents.map((document) => document.label)).toEqual(item.documents.map((document) => document.label));
      expect(card?.documents.map((document) => document.badges.map((badge) => badge.basis))).toEqual(item.documents.map((document) => [...document.basis]));
    }
    expect(cards.filter((card) => card.designThread).map((card) => card.number)).toEqual(['03', '06']);
    expect(cards.filter((card) => card.ledByGeneralContractorIn.length > 0).map((card) => card.number)).toEqual(['01', '03', '05']);
  });

  it('uses the approved wording for stages 03, 04 and 07', () => {
    expect(stage('engineering')?.client.find((row) => row.formats.some((format) => format.label === 'Окремий підряд'))?.text).toBe(
      'Надати наявну проєктну документацію або, за потреби, залучити профільного проєктувальника; погодити вихідні вимоги до нашого пакета робіт.',
    );
    expect(stage('scope-budget')?.what).toBe('Визначаємо склад і межі пакетів робіт, готуємо кошторис. Бюджет і строки залежать від параметрів об’єкта, умов майданчика та організації виконання.');
    expect(stage('construction')?.what).toBe(
      'Виконуємо погоджений обсяг робіт: основні компетенції — власною командою; для окремих пакетів залежно від обсягу й рішення можемо залучати профільних виконавців, а спеціалізовані роботи виконують відповідні партнери.',
    );
  });

  it('gives every format exactly one wording per per-format field, and a shared wording no tokens at all', () => {
    for (const card of stageCards()) {
      for (const rows of [card.rubikon, card.client, card.involved]) {
        const covered = rows.flatMap((row) => (row.formats.length > 0 ? row.formats.map((format) => format.label) : LABELS));
        expect([...covered].sort(), card.id).toEqual([...LABELS].sort());
        if (rows.length > 1) for (const row of rows) expect(row.formats.length, `${card.id}: ${row.text}`).toBeGreaterThan(0);
      }
    }
    const tokenised = (rows: ReturnType<typeof perFormatRows>) => rows.map((row) => ({ formats: row.formats.map((format) => format.number), text: row.text }));
    expect(tokenised(perFormatRows(deliveryModel.stages[3].involved))).toEqual([
      { formats: ['01'], text: 'Партнери дають пропозиції на свої пакети.' },
      { formats: ['02', '03'], text: 'Команда RUBIKON.' },
    ]);
    expect(perFormatRows({ default: 'Для всіх.' })).toEqual([{ formats: [], text: 'Для всіх.' }]);
  });
});

describe('delivery page: who does what', () => {
  it('shows the own core in its public statements, the flexible packages under theirs, and the partners', () => {
    expect(layer('core')?.items.map((item) => item.text)).toEqual([
      'Виготовляємо та монтуємо металоконструкції власною командою.',
      'Покрівлі промислових і комерційних об’єктів.',
      'Фундаменти й бетон — залежно від проєкту.',
    ]);
    expect(layer('core')?.items.map((item) => item.href)).toEqual(['/metalokonstruktsii', '/pokrivelni-roboty', '/betonni-roboty']);
    expect(layer('flexible')?.note).toBe(deliveryModel.statements.flexiblePackages);
    expect(layer('partner')?.items.map((item) => item.text)).toEqual(['Проєктування', 'Інженерні мережі', 'Вентиляція', 'Благоустрій', 'Спеціальне технологічне обладнання']);
  });

  it('splits the matrix into what every format shares and what differs, without losing or changing a cell', () => {
    const { shared, compared } = responsibilityComparison();
    const sharedActivities = shared.flatMap((group) => group.activities.map((item) => item.activity));
    const all = deliveryModel.responsibility.map((row) => row.activity);
    const row = (activity: string) => deliveryModel.responsibility.find((item) => item.activity === activity);

    expect(sharedActivities).toHaveLength(9);
    expect(compared).toHaveLength(9);
    expect([...sharedActivities, ...compared.map((item) => item.activity)].sort()).toEqual([...all].sort());
    for (const group of shared) {
      for (const item of group.activities) {
        for (const id of FORMAT_IDS) expect(holderIds(row(item.activity)!.cells[id]), `${item.activity} · ${id}`).toEqual(group.holders.map((label) => label.holder).sort());
      }
    }
    for (const item of compared) {
      const cells = row(item.activity)!.cells;
      expect(new Set(FORMAT_IDS.map((id) => holderIds(cells[id]).join('+'))).size, item.activity).toBeGreaterThan(1);
      expect(item.cells.map((cell) => cell.format.id)).toEqual(FORMAT_IDS);
      for (const cell of item.cells) expect(cell.holders.map((label) => label.holder).sort(), `${item.activity} · ${cell.format.id}`).toEqual(holderIds(cells[cell.format.id]));
    }
  });

  it('keeps the legal layer to the contract in every format, stated once', () => {
    const legal = deliveryModel.responsibility.filter((row) => 'legalLayer' in row).map((row) => row.activity);
    const contract = responsibilityComparison().shared.find((group) => group.holders.map((label) => label.holder).join() === 'contract-defined');

    expect(contract?.title).toBe('Визначається договором');
    expect(contract?.activities.map((item) => item.activity)).toEqual(legal);
  });

  it('reads one format at a time on phones: each panel is that format’s column, every differing activity once', () => {
    const { compared, byFormat } = responsibilityComparison();

    expect(byFormat.map((format) => format.panel)).toEqual(['vidpovidalnist-kompleksna-realizatsiia', 'vidpovidalnist-okremyi-pidriad', 'vidpovidalnist-subpidriad']);
    for (const format of byFormat) {
      expect(format.rows.map((row) => row.activity), format.label).toEqual(compared.map((item) => item.activity));
      for (const row of format.rows) {
        const cell = compared.find((item) => item.activity === row.activity)?.cells.find((entry) => entry.format.id === format.id);
        expect(row.holders, `${format.label}: ${row.activity}`).toEqual(cell?.holders);
      }
    }
  });

  it('numbers the seven notes in model order and ties each to its activity wherever it is shown', () => {
    const { shared, compared, byFormat, notes } = responsibilityComparison();
    const modelNotes = deliveryModel.responsibility.flatMap((row) => ('note' in row ? [{ activity: row.activity, note: row.note }] : []));
    const marked = [...shared.flatMap((group) => group.activities), ...compared, ...byFormat.flatMap((format) => format.rows)];

    expect(notes).toEqual(modelNotes.map((item, index) => ({ number: index + 1, ...item })));
    for (const item of marked) expect(item.note, item.activity).toBe(notes.find((note) => note.activity === item.activity)?.number);
  });

  it('runs design through stages 03 and 06 and into the change procedure, in the frozen statement', () => {
    expect(designThread()).toEqual({
      statement: deliveryModel.statements.design,
      stages: [
        { number: '03', title: 'Інженерне опрацювання', anchor: 'etap-03', documents: ['Концептуальне рішення або схема', 'Технологічні вимоги постачальника обладнання'] },
        { number: '06', title: 'Підготовка реалізації', anchor: 'etap-06', documents: ['Робоча документація', 'Проєкт виконання робіт — де він потрібен'] },
      ],
      change: deliveryModel.changePolicy.steps[1],
      route: deliveryModel.stages.map((stage) => ({ number: stage.number, design: stage.designThread })),
    });
  });

  it('marks on the mini-route only the stages the model ties to design, and places the change step nowhere', () => {
    const { route } = designThread();

    expect(route.map((point) => point.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
    expect(route.filter((point) => point.design).map((point) => point.number)).toEqual(['03', '06']);
    expect(Object.keys(designThread())).toEqual(['statement', 'stages', 'change', 'route']);
  });
});

describe('delivery page: documents, budget, inputs, FAQ', () => {
  it('lists every stage document once, in route order, in four phases that cover the eight stages', () => {
    const phases = documentRoute();
    const documents = phases.flatMap((phase) => phase.documents);

    expect(phases.map((phase) => [phase.range, phase.title])).toEqual([
      ['01–05', 'Від запиту до договору'],
      ['06', 'Підготовка реалізації'],
      ['07', 'Будівництво'],
      ['08', 'Контроль і здача'],
    ]);
    expect(documents.map((document) => `${document.stage.number} ${document.label}`)).toEqual(
      deliveryModel.stages.flatMap((item) => item.documents.map((document) => `${item.number} ${document.label}`)),
    );
    expect(documents).toHaveLength(19);
    expect(new Set(documents.map((document) => document.label)).size).toBe(19);
  });

  it('badges each document with every basis it depends on, in the words the legend explains', () => {
    expect(basisLegend().map((badge) => [badge.tag, badge.title])).toEqual([
      ['типово', 'Типово'],
      ['договір', 'Залежить від договору'],
      ['проєкт', 'Залежить від проєкту'],
      ['закон', 'Регулюється законодавством'],
    ]);
    const modelBasis = new Map<string, readonly string[]>(deliveryModel.stages.flatMap((item) => item.documents.map((document) => [document.label, [...document.basis]] as const)));
    for (const document of documentRoute().flatMap((phase) => phase.documents)) {
      expect(document.badges.map((badge) => badge.basis), document.label).toEqual(modelBasis.get(document.label));
    }
    expect(documentRoute().flatMap((phase) => phase.documents).filter((document) => document.badges.length > 1)).toHaveLength(6);
  });

  it('groups the budget factors by object, site and organisation, and keeps the start inputs whole', () => {
    expect(budgetGroups().map((group) => [group.title, group.factors.length])).toEqual([['Об’єкт', 7], ['Майданчик', 4], ['Організація робіт', 2]]);
    expect(budgetGroups().flatMap((group) => group.factors).sort()).toEqual(deliveryModel.budgetFactors.map((factor) => factor.label).sort());
    expect(startInputs()).toEqual(deliveryModel.inputs.map((input) => input.label));
    expect(startInputs()).toHaveLength(11);
  });

  it('answers the FAQ only in the model’s words', () => {
    const faq = Object.fromEntries(deliveryFaq());
    const { statements, changePolicy } = deliveryModel;

    expect(Object.keys(faq)).toHaveLength(6);
    expect(faq['Чи обов’язково мати готовий проєкт?']).toContain(deliveryModel.entryStates[3].startNote);
    expect(faq['Чи можна замовити лише один пакет робіт?']).toContain(formatById('work-package').summary);
    expect(faq['Хто залучає проєктувальника?']).toBe(statements.design);
    expect(faq['Чи працюєте ви із субпідрядниками?']).toBe(`Так. ${statements.team} ${statements.principle}`);
    expect(faq['Хто закуповує матеріали?']).toBe(statements.materials);
    expect(faq['Як погоджуються зміни?']).toBe(`${changePolicy.principle} ${changePolicy.steps[2]}`);
    for (const answer of Object.values(faq)) for (const pattern of FORBIDDEN_CLAIMS) expect(answer, String(pattern)).not.toMatch(pattern);
  });
});
