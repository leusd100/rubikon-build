import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { formatById } from '../../app/lib/deliveryModel';
import {
  budgetGroups,
  capabilityLayers,
  deliveryFaq,
  designThread,
  documentGroups,
  formatDetails,
  perFormatRows,
  responsibilityByFormat,
  responsibilityNotes,
  stageCards,
  startInputs,
} from '../../app/lib/deliveryModelPresentation';
import type { CapabilityLayerId, StageId } from '../../app/types/deliveryModel';

// /yak-pratsyuiemo's presentation layer: every shape it renders is the model, regrouped.

const LABELS = deliveryModel.formats.map((format) => format.label);
const FORBIDDEN_CLAIMS = [/генеральн\S*\s+підряд/i, /гаранті/i, /ліценз/i, /сертифікат/i, /штат/i, /\d+\s?(хв|хвилин|год)/i, /грн|₴|\$|€/, /від\s*\d[^.]*м²/i];
const stage = (id: StageId) => stageCards().find((card) => card.id === id);
const layer = (id: CapabilityLayerId) => capabilityLayers().find((item) => item.id === id);

describe('delivery page: formats and stages', () => {
  it('describes each format with its model anchor, coordination and interfaces', () => {
    expect(formatDetails().map((format) => format.anchor)).toEqual(['kompleksna-realizatsiia', 'okremyi-pidriad', 'subpidriad']);
    for (const detail of formatDetails()) {
      const format = formatById(detail.id);
      expect(detail).toMatchObject({ title: format.label, text: format.summary, coordination: format.coordination, interfaces: format.interfaces });
    }
  });

  it('lays out all eight stages in order with the model texts, documents and a stable anchor', () => {
    const cards = stageCards();

    expect(cards.map((card) => `${card.number} ${card.title}`)).toEqual(deliveryModel.stages.map((item) => `${item.number} ${item.title}`));
    expect(cards.map((card) => card.anchor)).toEqual(['etap-01', 'etap-02', 'etap-03', 'etap-04', 'etap-05', 'etap-06', 'etap-07', 'etap-08']);
    for (const item of deliveryModel.stages) {
      const card = stage(item.id);
      expect(card).toMatchObject({ what: item.what, result: item.result, gate: item.gate, why: item.why });
      expect(card?.documents.map((document) => document.label)).toEqual(item.documents.map((document) => document.label));
    }
    expect(cards.filter((card) => card.designThread).map((card) => card.number)).toEqual(['03', '06']);
    expect(cards.filter((card) => card.ledByGeneralContractorIn.length > 0).map((card) => card.number)).toEqual(['01', '03', '05']);
  });

  it('uses the approved wording for stages 03, 04 and 07', () => {
    expect(stage('engineering')?.client.find((row) => row.formats.includes('Окремий підряд'))?.text).toBe(
      'Надати наявну проєктну документацію або, за потреби, залучити профільного проєктувальника; погодити вихідні вимоги до нашого пакета робіт.',
    );
    expect(stage('scope-budget')?.what).toBe('Визначаємо склад і межі пакетів робіт, готуємо кошторис. Бюджет і строки залежать від параметрів об’єкта, умов майданчика та організації виконання.');
    expect(stage('construction')?.what).toBe(
      'Виконуємо погоджений обсяг робіт: основні компетенції — власною командою; для окремих пакетів залежно від обсягу й рішення можемо залучати профільних виконавців, а спеціалізовані роботи виконують відповідні партнери.',
    );
  });

  it('gives every format exactly one wording per per-format field, merging formats that share it', () => {
    for (const card of stageCards()) {
      for (const rows of [card.rubikon, card.client, card.involved]) {
        const covered = rows.flatMap((row) => (row.formats.length > 0 ? row.formats : LABELS));
        expect([...covered].sort(), card.id).toEqual([...LABELS].sort());
      }
    }
    expect(perFormatRows(deliveryModel.stages[3].involved)).toEqual([
      { formats: ['Комплексна реалізація'], text: 'Партнери дають пропозиції на свої пакети.' },
      { formats: ['Окремий підряд', 'Субпідряд'], text: 'Команда RUBIKON.' },
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

  it('reads the matrix one format at a time without losing a row, leaving the legal layer to the contract', () => {
    const legal = deliveryModel.responsibility.filter((row) => 'legalLayer' in row).map((row) => row.activity);

    for (const format of responsibilityByFormat()) {
      const listed = new Set(format.groups.flatMap((group) => group.activities));
      expect([...listed].sort(), format.label).toEqual(deliveryModel.responsibility.map((row) => row.activity).sort());
      const contract = format.groups.find((group) => group.holder === 'contract-defined')?.activities ?? [];
      const elsewhere = format.groups.filter((group) => group.holder !== 'contract-defined').flatMap((group) => group.activities);
      for (const activity of legal) {
        expect(contract, `${format.label}: ${activity}`).toContain(activity);
        expect(elsewhere, `${format.label}: ${activity}`).not.toContain(activity);
      }
    }
    expect(responsibilityByFormat().map((format) => format.anchor)).toEqual([
      'vidpovidalnist-kompleksna-realizatsiia',
      'vidpovidalnist-okremyi-pidriad',
      'vidpovidalnist-subpidriad',
    ]);
    expect(responsibilityNotes()).toEqual(deliveryModel.responsibility.flatMap((row) => ('note' in row ? [{ activity: row.activity, note: row.note }] : [])));
  });

  it('runs design through stages 03 and 06 and into the change procedure, in the frozen statement', () => {
    expect(designThread()).toEqual({
      statement: deliveryModel.statements.design,
      stages: [
        { number: '03', title: 'Інженерне опрацювання', anchor: 'etap-03', document: 'Концептуальне рішення або схема' },
        { number: '06', title: 'Підготовка реалізації', anchor: 'etap-06', document: 'Робоча документація' },
      ],
      change: deliveryModel.changePolicy.steps[1],
    });
  });
});

describe('delivery page: documents, budget, FAQ', () => {
  it('lists every stage document under each basis it depends on', () => {
    const groups = documentGroups();

    expect(groups.map((group) => group.title)).toEqual(['Типово', 'Залежить від договору', 'Залежить від проєкту', 'Регулюється законодавством']);
    for (const item of deliveryModel.stages) {
      for (const document of item.documents) {
        for (const basis of document.basis) {
          expect(groups.find((group) => group.basis === basis)?.documents).toContainEqual({ label: document.label, stage: `${item.number} ${item.title}` });
        }
      }
    }
  });

  it('groups the budget factors by object, site and organisation, and lists the start inputs', () => {
    expect(budgetGroups().map((group) => [group.title, group.factors.length])).toEqual([['Об’єкт', 7], ['Майданчик', 4], ['Організація робіт', 2]]);
    expect(startInputs()).toEqual(deliveryModel.inputs.map((input) => input.label));
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
