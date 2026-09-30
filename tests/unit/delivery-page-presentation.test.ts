import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { formatById } from '../../app/lib/deliveryModel';
import {
  basisLegend,
  budgetGroups,
  capabilityLayers,
  costFactors,
  deliveryFaq,
  participationChoices,
  processSteps,
  responsibilityByFormat,
  responsibilityMap,
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
    expect(stage('scope-budget')?.what).toBe('Визначаємо склад погоджених робіт і готуємо кошторис. Вартість і строки залежать від параметрів об’єкта, умов майданчика та організації виконання.');
    expect(stage('construction')?.what).toMatch(/Масштабуємо ресурси.*спеціалізовані роботи.*профільні виконавці/);
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
    expect(layer('core')?.items.map((item) => item.id)).toEqual(['steel', 'roofing', 'foundations', 'panels']);
    expect(layer('core')?.items.map((item) => item.href).filter(Boolean)).toEqual(['/metalokonstruktsii', '/pokrivelni-roboty', '/betonni-roboty']);
    expect(layer('flexible')?.note).toBe(deliveryModel.statements.flexiblePackages);
    expect(layer('flexible')?.items.map((item) => item.id)).toContain('steel-fabrication');
    expect(layer('partner')?.items.map((item) => item.id)).toEqual(['mep', 'ventilation']);
  });

  it('splits the matrix into what every format shares and what differs, without losing or changing a cell', () => {
    const { shared, compared } = responsibilityComparison();
    const sharedActivities = shared.flatMap((group) => group.activities.map((item) => item.activity));
    const all = deliveryModel.responsibility.map((row) => row.activity);
    const row = (activity: string) => deliveryModel.responsibility.find((item) => item.activity === activity);

    expect(sharedActivities.length).toBeGreaterThan(0);
    expect(compared.length).toBeGreaterThan(0);
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
        { number: '03', title: 'Узгодження з проєктом', anchor: 'etap-03', documents: ['Концептуальне рішення або схема', 'Технологічні вимоги постачальника обладнання'] },
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

  it('answers the FAQ only in the model’s words, four questions the page does not already answer', () => {
    const faq = Object.fromEntries(deliveryFaq());
    const { statements } = deliveryModel;

    expect(Object.keys(faq)).toEqual(['Хто закуповує матеріали?', 'Чи працюєте ви із субпідрядниками?', 'Чи оглядаєте майданчик перед розрахунком?', 'Що ви передаєте після завершення робіт?']);
    expect(faq['Хто закуповує матеріали?']).toBe(statements.materials);
    expect(faq['Чи працюєте ви із субпідрядниками?']).toBe(`Так. ${statements.team} ${statements.principle}`);
    expect(faq['Чи оглядаєте майданчик перед розрахунком?']).toContain(deliveryModel.stages[1].rubikon.default);
    expect(faq['Що ви передаєте після завершення робіт?']).toContain(deliveryModel.stages[7].result);
    for (const answer of Object.values(faq)) for (const pattern of FORBIDDEN_CLAIMS) expect(answer, String(pattern)).not.toMatch(pattern);
  });

});

describe('delivery page v2: the public projection', () => {
  it('tells the eight stages as four steps, in order, each stage once, each ending with a model result', () => {
    const steps = processSteps();
    expect(steps.map((step) => step.number)).toEqual(['01', '02', '03', '04']);
    expect(steps.flatMap((step) => step.stages)).toEqual(deliveryModel.stages.map((stage) => stage.id));
    const results = deliveryModel.stages.map((stage) => stage.result);
    for (const step of steps) expect(results).toContain(step.result);
    for (const step of steps) for (const pattern of FORBIDDEN_CLAIMS) expect(step.text, String(pattern)).not.toMatch(pattern);
  });

  it('offers the three formats under their model names, texts and coordination', () => {
    expect(participationChoices()).toEqual(deliveryModel.formats.map((format) => ({
      id: format.id, title: format.label, text: format.summary, coordination: format.coordination,
    })));
  });

  it('maps who answers for what only onto responsibility rows that say so', () => {
    const map = responsibilityMap();
    const rows = new Map<string, (typeof deliveryModel.responsibility)[number]>(deliveryModel.responsibility.map((row) => [row.id, row]));
    const holdersIn = (id: string) => {
      const row = rows.get(id);
      expect(row, id).toBeDefined();
      return Object.values(row!.cells).flatMap((cell) => (typeof cell === 'string' ? [cell] : [...cell]));
    };
    expect(map.principle).toBe(deliveryModel.statements.responsibility);
    expect(map.boundary).toBe(deliveryModel.statements.boundary);
    expect(map.areas.map((area) => area.id)).toEqual(['rubikon', 'client', 'specialists']);
    for (const area of map.areas) {
      for (const item of area.items) {
        for (const id of item.rows) {
          const holders = holdersIn(id);
          if (area.id === 'rubikon') expect(holders.some((holder) => holder.startsWith('rubikon')), `${item.text} / ${id}`).toBe(true);
          if (area.id === 'client') expect(holders, `${item.text} / ${id}`).toContain('client');
          // The client's own designer is the one specialist the model files under the client.
          if (area.id === 'specialists') expect(holders.includes('partner') || id === 'design', `${item.text} / ${id}`).toBe(true);
        }
      }
    }
  });

  it('shows seven cost factors that cover every model budget factor exactly once', () => {
    const factors = costFactors();
    expect(factors).toHaveLength(7);
    expect(factors.flatMap((factor) => factor.ids).sort()).toEqual(deliveryModel.budgetFactors.map((factor) => factor.id).sort());
  });

  it('places each work of the switcher only in the zones the matrix names, per format', () => {
    const { formats, items } = responsibilityByFormat();
    const zoneOf = (holder: string) => (holder.startsWith('rubikon') ? 'rubikon' : holder === 'partner' ? 'specialists' : ['client', 'general-contractor'].includes(holder) ? 'client' : null);
    for (const item of items) {
      for (const format of formats) {
        const expected = new Set(item.rows.flatMap((id) => {
          const cell = deliveryModel.responsibility.find((row) => row.id === id)!.cells[format.id];
          return (typeof cell === 'string' ? [cell] : [...cell]).map(zoneOf).filter(Boolean);
        }));
        for (const zone of ['rubikon', 'client', 'specialists'] as const) {
          expect(item.zones[zone].includes(format.id), `${item.text} / ${format.id} / ${zone}`).toBe(expected.has(zone));
        }
      }
    }
    expect(formats.map((format) => format.clientTitle)).toEqual(['Замовник', 'Замовник', 'Генпідрядник']);
    expect(formats[0].outOfScope).toEqual([]);
    expect(formats[1].outOfScope).toEqual(['Електрика, вода, каналізація, опалення й вентиляція']);
  });
});
