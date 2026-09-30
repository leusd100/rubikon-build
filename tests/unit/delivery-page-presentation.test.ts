import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { formatById } from '../../app/lib/deliveryModel';
import {
  basisLegend,
  budgetGroups,
  capabilityLayers,
  changeSteps,
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
import type { CapabilityLayerId, ResponsibilityCell, ResponsibilityRow, StageId } from '../../app/types/deliveryModel';

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

  it('answers the FAQ in short, direct answers held to the model: four questions the page does not already answer', () => {
    const faq = Object.fromEntries(deliveryFaq());
    const { statements } = deliveryModel;
    const handover = deliveryModel.stages.find((item) => item.id === 'handover')!;

    expect(Object.keys(faq)).toEqual(['Хто закуповує матеріали?', 'Чи залучаєте інших виконавців?', 'Чи оглядаєте майданчик перед розрахунком?', 'Як відбувається приймання і які документи я отримаю?']);
    expect(faq['Хто закуповує матеріали?']).toBe(statements.materials);
    // Specialised works go to specialists (statements.team); who engages them is fixed in the contract (statements.boundary)
    expect(statements.team).toContain('Спеціалізовані роботи виконують профільні виконавці');
    expect(faq['Чи залучаєте інших виконавців?']).toContain('Спеціалізовані роботи виконують профільні виконавці');
    expect(faq['Чи залучаєте інших виконавців?']).toContain('фіксуємо в договорі до початку робіт');
    expect(deliveryModel.stages[1].rubikon.default).toContain('перелік потрібних даних під ваш тип об’єкта');
    expect(faq['Чи оглядаєте майданчик перед розрахунком?']).toContain('перелік потрібних даних під ваш тип об’єкта');
    // Exactly the model's handover documents, and the contract decides the set
    for (const document of handover.documents) expect(faq['Як відбувається приймання і які документи я отримаю?']).toContain(document.label.toLowerCase());
    expect(faq['Як відбувається приймання і які документи я отримаю?']).toContain('склад визначає договір');
    for (const answer of Object.values(faq)) for (const pattern of FORBIDDEN_CLAIMS) expect(answer, String(pattern)).not.toMatch(pattern);
  });

});

describe('delivery page v2: the public projection', () => {
  it('tells the eight stages as four steps, in order, each stage once, each ending with a result for the client', () => {
    const steps = processSteps();
    expect(steps.map((step) => step.number)).toEqual(['01', '02', '03', '04']);
    expect(steps.flatMap((step) => step.stages)).toEqual(deliveryModel.stages.map((stage) => stage.id));
    for (const step of steps) expect(step.result.length).toBeGreaterThan(20);
    // Step 04 names only documents the handover stage lists, and leaves the set to the contract
    const handover = deliveryModel.stages.find((stage) => stage.id === 'handover')!;
    expect(handover.documents.map((document) => document.label)).toEqual(expect.arrayContaining(['Акти виконаних робіт', 'Виконавча документація']));
    expect(steps[3].result).toContain('у складі, погодженому договором');
    for (const step of steps) for (const pattern of FORBIDDEN_CLAIMS) {
      expect(step.text, String(pattern)).not.toMatch(pattern);
      expect(step.result, String(pattern)).not.toMatch(pattern);
    }
  });

  it('offers the three formats under their model names, with the contract party and coordinator the model states', () => {
    const choices = participationChoices();
    expect(choices.map(({ id, title, text, coordination }) => ({ id, title, text, coordination }))).toEqual(deliveryModel.formats.map((format) => ({
      id: format.id, title: format.label, text: format.summary, coordination: format.coordination,
    })));
    const contract = deliveryModel.stages.find((stage) => stage.id === 'contract')!;
    for (const choice of choices) {
      // The coordinator is the model's coordination sentence, shortened: every part of it is in that sentence
      for (const part of choice.coordinator.split(' — ')) expect(choice.coordination.toLowerCase(), choice.id).toContain(part.toLowerCase());
      expect(choice.rubikonCoordinates).toBe(choice.coordination.includes('координує RUBIKON'));
    }
    expect(formatById('work-package').summary).toContain('договором із замовником');
    expect(formatById('subcontract').summary).toContain('договір — з генпідрядником');
    expect(contract.client.subcontract).toBe('Сторона договору — генпідрядник.');
    expect(choices.map((choice) => choice.contractWith)).toEqual(['Замовник', 'Замовник', 'Генпідрядник']);
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

  it('says how a shared work is split wherever it sits in more than one card, and only there', () => {
    const { formats, items } = responsibilityByFormat();
    const zones = ['rubikon', 'client', 'specialists'] as const;
    for (const item of items) {
      for (const format of formats) {
        const present = zones.filter((zone) => item.zones[zone].includes(format.id));
        for (const zone of zones) {
          const note = item.notes[zone]?.[format.id];
          // No note on a card the work is not on
          if (!present.includes(zone)) expect(note, `${item.text} / ${format.id} / ${zone}`).toBeUndefined();
          // A work on two or three cards explains itself on each of them
          if (present.length > 1 && present.includes(zone)) expect(note, `${item.text} / ${format.id} / ${zone}`).toBeTruthy();
        }
      }
    }
  });

  it('marks what RUBIKON coordinates or organises from the matrix roles, and keeps every note to its source', () => {
    const { items } = responsibilityByFormat();
    const { statements } = deliveryModel;
    const row = (id: string): ResponsibilityRow => deliveryModel.responsibility.find((item) => item.id === id)!;
    const item = (text: string) => items.find((entry) => entry.text === text)!;
    for (const entry of items) {
      for (const [format, role] of Object.entries(entry.rubikonRole)) {
        const holders = entry.rows.flatMap((id) => {
          const cell = row(id).cells[format as keyof typeof entry.rubikonRole];
          return typeof cell === 'string' ? [cell] : [...cell];
        });
        if (role === 'coordinates') expect(holders, entry.text).toContain('rubikon-coordinates');
        if (role === 'organizes') expect(holders, entry.text).toContain('rubikon-organizes');
        if (role !== 'executes') expect(entry.notes.rubikon?.[format as 'comprehensive'], entry.text).toMatch(/^(координуємо|організовуємо)/);
      }
    }
    expect(item('Виготовлення металоконструкцій').notes.rubikon).toEqual({ comprehensive: 'організовуємо', 'work-package': 'організовуємо', subcontract: 'організовуємо' });
    // Each curated note says what the model's row note, stage text or statement says
    expect(row('materials').note).toContain('залежно від договору');
    expect(item('Матеріали').notes.client?.comprehensive).toContain('залежно від договору');
    expect(row('flexible-packages').note).toContain('Склад і виконавців визначаємо під проєкт');
    expect(item('Огородження, ворота, промислові підлоги').notes.specialists?.comprehensive).toBe('склад і виконавців визначаємо під проєкт');
    expect(row('engineering-systems').note).toContain('у погодженому комплексі');
    expect(row('engineering-systems').note).toContain('окремо на стороні замовника');
    expect(item('Електрика, вода, каналізація, опалення й вентиляція').notes.client?.comprehensive).toBe('або окремо на стороні замовника');
    expect(row('process-equipment').note).toContain('Підбір, постачання й монтаж обладнання — окремо із профільними спеціалістами');
    expect(row('supervision').note).toContain('спеціалісти замовника');
    expect(statements.customerScope).toContain('Вишукування та нагляд забезпечують відповідні спеціалісти замовника');
    expect(row('interfaces').note).toContain('замовник координує об’єкт загалом, а RUBIKON узгоджує свою частину робіт');
    const request = deliveryModel.stages.find((stage) => stage.id === 'request')!;
    expect(request.rubikon.subcontract).toContain('уточнюємо межі нашого пакета');
    expect(request.client.subcontract).toContain('Генпідрядник описує пакет робіт');
  });

  it('puts «Координує об’єкт» on the card of whoever the model says coordinates the object', () => {
    const { formats } = responsibilityByFormat();
    expect(formats.map((format) => [format.id, format.coordinator.zone])).toEqual([['comprehensive', 'rubikon'], ['work-package', 'client'], ['subcontract', 'client']]);
    expect(formatById('comprehensive').coordination).toContain(formats[0].coordinator.note);
    expect(formatById('work-package').coordination).toContain('замовник або його генпідрядник');
    expect(formatById('subcontract').coordination).toBe('Об’єкт координує генпідрядник.');
  });

  it('tells the change procedure as the model’s four steps, in order', () => {
    const steps = changeSteps();
    const words = (text: string) => text.toLowerCase().replace(/[.,;:—]/g, ' ').split(/\s+/).filter((word) => word.length > 3);
    expect(steps).toHaveLength(deliveryModel.changePolicy.steps.length);
    steps.forEach((step, index) => {
      const source = deliveryModel.changePolicy.steps[index].toLowerCase();
      expect(source.startsWith(step.title.split(' ')[0].toLowerCase()), step.title).toBe(true);
      for (const word of words(step.detail)) expect(source, `${step.title}: ${word}`).toContain(word);
    });
  });
});
