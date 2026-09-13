import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { directions } from '../../app/data/directions';
import {
  formatById,
  formatFromCooperation,
  forFormat,
  publicTexts,
  stageById,
  startStage,
} from '../../app/lib/deliveryModel';
import type {
  CapabilityLayerId,
  DeliveryFormatId,
  DocumentBasis,
  EntryStateId,
  Party,
  StageId,
} from '../../app/types/deliveryModel';

const FORMAT_IDS: DeliveryFormatId[] = ['comprehensive', 'work-package', 'subcontract'];
const STAGE_IDS: StageId[] = ['request', 'inputs', 'engineering', 'scope-budget', 'contract', 'preparation', 'construction', 'handover'];
const PARTIES: Party[] = ['rubikon', 'rubikon-coordinates', 'partner', 'client', 'general-contractor'];
const BASES: DocumentBasis[] = ['typical', 'contract', 'project', 'law'];

// Frozen public wording, per model version. Rewording a statement means a new version and a new entry.
const STATEMENTS_BY_VERSION: Record<string, typeof deliveryModel.statements> = {
  '1.0.0': {
    principle: 'RUBIKON не обіцяє, що одна команда робить абсолютно все. RUBIKON виконує своє ядро та координує інших виконавців у погодженому обсязі.',
    team: 'Власна будівельна команда та профільні субпідрядники — залежно від обсягу й специфіки проєкту.',
    design: 'Проєктування виконує профільна проєктна організація. Залежно від формату проєкту її залучає замовник або робота з нею організовується в межах комплексної реалізації. RUBIKON координує будівельні рішення та стики в погодженому обсязі.',
    flexiblePackages: 'Огородження, ворота, промислові підлоги та інші будівельні роботи виконуємо власною командою або залучаємо профільного виконавця — залежно від обсягу та рішення.',
    materials: 'Матеріали закуповує RUBIKON або надає замовник — залежно від договору.',
    firstContact: 'Після заявки зв’яжемося, щоб уточнити задачу, вихідні дані та можливий формат нашої участі.',
    experience: 'За RUBIKON BUILD стоять понад 30 років особистої практики Сергія Івановича в будівництві.',
    boundary: 'За що відповідає кожен учасник, фіксуємо в договорі до початку робіт.',
  },
};

// Claims the public site must not make until they are true, and phrases the model replaces.
const FORBIDDEN_CLAIMS = [/генеральн/i, /гаранті/i, /ліценз/i, /сертифікат/i, /штат/i, /\d+\s?(хв|хвилин|год)/i, /грн|₴|\$|€/, /від\s*\d[^.]*м²/i];
const DISALLOWED_PUBLIC_PHRASES = [
  'Об’єкт під ключ',
  'Робота за наявною документацією',
  'Підряд або субпідряд',
  'найближчим часом',
  'Організовуємо заготівлю',
  'Контролюємо весь цикл',
  'Формуємо конструктивну схему',
  'Розрахунок і проєктне рішення',
  'Технічне рішення і проєктування',
  'Обговорити з інженером',
  'інженер RUBIKON',
  'В основі — понад 30 років',
];

describe('delivery model: formats and entry states', () => {
  it('has exactly the three frozen formats, in order', () => {
    expect(deliveryModel.formats.map((format) => format.id)).toEqual(FORMAT_IDS);
    expect(deliveryModel.formats.map((format) => format.label)).toEqual(['Комплексна реалізація', 'Окремий підряд', 'Субпідряд']);
    expect(new Set(deliveryModel.formats.map((format) => format.anchor)).size).toBe(3);
  });

  it('keeps the general-contract term internal and pending the lawyer', () => {
    const withTerm = deliveryModel.formats.filter((format) => 'contractTerm' in format);

    expect(withTerm.map((format) => format.id)).toEqual(['comprehensive']);
    expect(formatById('comprehensive').contractTerm).toEqual({ label: 'Генеральний підряд', status: 'pending-legal' });
  });

  it('starts each entry state from an existing stage', () => {
    expect(deliveryModel.entryStates.map((state) => state.id)).toEqual(['task-only', 'site-inputs', 'concept', 'design-docs']);
    const starts = Object.fromEntries(deliveryModel.entryStates.map((state) => [state.id, startStage(state.id).id]));

    expect(starts).toEqual({ 'task-only': 'request', 'site-inputs': 'inputs', concept: 'scope-budget', 'design-docs': 'scope-budget' });
  });
});

describe('delivery model: who does which work', () => {
  const layer = (id: CapabilityLayerId) => deliveryModel.capabilities.filter((capability) => capability.layer === id).map((capability) => capability.id);

  it('splits the work into the frozen core, flexible packages and partners', () => {
    expect(layer('core')).toEqual(['steel', 'roofing', 'foundations']);
    expect(layer('flexible')).toEqual(['envelope', 'gates', 'industrial-floors', 'other-construction']);
    expect(layer('partner')).toEqual(['design', 'mep', 'ventilation', 'landscaping', 'process-equipment']);
  });

  it('links competencies only to direction pages that exist', () => {
    const directionIds = new Set<string>(directions.map((direction) => direction.id));
    const linked = deliveryModel.capabilities.flatMap((capability) => ('directionId' in capability ? [capability.directionId] : []));

    expect(linked).toEqual(['metalokonstruktsii', 'pokrivelni-roboty', 'betonni-roboty']);
    for (const id of linked) expect(directionIds.has(id), id).toBe(true);
  });
});

describe('delivery model: stages', () => {
  it('has eight stages numbered 01–08 in the frozen order', () => {
    expect(deliveryModel.stages.map((stage) => stage.id)).toEqual(STAGE_IDS);
    expect(deliveryModel.stages.map((stage) => stage.number)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08']);
  });

  it('runs the design thread through engineering and preparation only', () => {
    expect(deliveryModel.stages.filter((stage) => stage.designThread).map((stage) => stage.id)).toEqual(['engineering', 'preparation']);
  });

  it('gives every stage its texts, a default for each per-format field and at least one document', () => {
    for (const stage of deliveryModel.stages) {
      for (const text of [stage.title, stage.what, stage.result, stage.gate, stage.why]) expect(text.trim(), stage.id).not.toBe('');
      for (const field of [stage.rubikon, stage.client, stage.involved]) {
        expect(field.default.trim(), stage.id).not.toBe('');
        for (const key of Object.keys(field)) expect(['default', ...FORMAT_IDS], `${stage.id}.${key}`).toContain(key);
      }
      expect(stage.documents.length, stage.id).toBeGreaterThan(0);
      for (const document of stage.documents) {
        expect(document.basis.length, document.label).toBeGreaterThan(0);
        for (const basis of document.basis) expect(BASES).toContain(basis);
      }
      for (const format of stage.ledByGeneralContractorIn) expect(format).toBe('subcontract');
    }
  });
});

describe('delivery model: responsibility', () => {
  it('fills every format of every row with valid parties or a contract/scope marker', () => {
    expect(new Set(deliveryModel.responsibility.map((row) => row.id)).size).toBe(deliveryModel.responsibility.length);
    for (const row of deliveryModel.responsibility) {
      expect(Object.keys(row.cells).sort(), row.id).toEqual([...FORMAT_IDS].sort());
      for (const cell of Object.values(row.cells)) {
        if (typeof cell === 'string') expect(['contract-defined', 'out-of-scope'], row.id).toContain(cell);
        else {
          expect(cell.length, row.id).toBeGreaterThan(0);
          for (const party of cell) expect(PARTIES, row.id).toContain(party);
        }
      }
    }
  });

  it('leaves the legal layer to the contract in every format', () => {
    const legalRows = deliveryModel.responsibility.filter((row) => 'legalLayer' in row);

    expect(legalRows.map((row) => row.id)).toEqual(['permits', 'supervision', 'as-built-documents']);
    for (const row of legalRows) expect(Object.values(row.cells), row.id).toEqual(['contract-defined', 'contract-defined', 'contract-defined']);
  });
});

describe('delivery model: public wording', () => {
  it('keeps the frozen statements verbatim for its version', () => {
    expect(deliveryModel.version).toBe('1.0.0');
    expect(STATEMENTS_BY_VERSION[deliveryModel.version]).toEqual(deliveryModel.statements);
    expect(deliveryModel.contactRoles.constructionLead.cta).toBe('Обговорити з керівником будівельного напряму');
  });

  it('makes no claim the site cannot stand behind and uses none of the replaced phrases', () => {
    for (const text of publicTexts(deliveryModel)) {
      for (const pattern of FORBIDDEN_CLAIMS) expect(text, String(pattern)).not.toMatch(pattern);
      for (const phrase of DISALLOWED_PUBLIC_PHRASES) expect(text).not.toContain(phrase);
    }
  });

  it('leaves internal fields out of the public texts', () => {
    const texts = publicTexts(deliveryModel).join('\n');

    expect(texts).toContain(deliveryModel.statements.design);
    expect(texts).not.toContain('Генеральний підряд');
    expect(texts).not.toContain('Об’єкт під ключ');
    for (const capability of deliveryModel.capabilities) {
      if ('internalNote' in capability) expect(texts).not.toContain(capability.internalNote);
    }
    // Permits and supervision are public matrix rows that read «визначається договором»; the other
    // legal topics — the general-contract term, warranty, exact contract forms — stay internal.
    const publicActivities = new Set<string>(deliveryModel.responsibility.map((row) => row.activity));
    const internalTopics = deliveryModel.legalLayer.filter((item) => !publicActivities.has(item.topic));

    expect(internalTopics.map((item) => item.id)).toEqual(['general-contract-term', 'warranty', 'contract-documents']);
    for (const item of internalTopics) expect(texts).not.toContain(item.topic);
  });
});

describe('delivery model: helpers', () => {
  it('finds formats and stages by id and rejects unknown ids', () => {
    expect(formatById('subcontract').label).toBe('Субпідряд');
    expect(stageById('handover').number).toBe('08');
    expect(() => formatById('turnkey' as DeliveryFormatId)).toThrow('Unknown delivery format');
    expect(() => stageById('design' as StageId)).toThrow('Unknown delivery stage');
    expect(() => startStage('drawings' as EntryStateId)).toThrow('Unknown entry state');
  });

  it('reads a per-format text, falling back to the default', () => {
    const request = stageById('request');

    expect(forFormat(request.rubikon, 'subcontract')).toBe(request.rubikon.subcontract);
    expect(forFormat(request.rubikon, 'work-package')).toBe(request.rubikon.default);
  });

  it('maps stored cooperation values to a format only when the value is unambiguous', () => {
    expect(formatFromCooperation('Об’єкт під ключ')).toBe('comprehensive');
    expect(formatFromCooperation('Окремий етап робіт')).toBe('work-package');
    expect(formatFromCooperation('Підряд або субпідряд')).toBeNull();
    expect(formatFromCooperation('')).toBeNull();
    expect(formatFromCooperation('   ')).toBeNull();
    expect(formatFromCooperation(' Комплексна реалізація ')).toBe('comprehensive');
    expect(formatFromCooperation('Окремий підряд')).toBe('work-package');
    expect(formatFromCooperation('Субпідряд')).toBe('subcontract');
    expect(formatFromCooperation('Інше')).toBeNull();
  });
});

describe('delivery model: data contract', () => {
  it('is plain JSON — no functions, icons or class instances', () => {
    expect(JSON.parse(JSON.stringify(deliveryModel))).toEqual(deliveryModel);
  });

  it('matches its human-readable version in docs/delivery-model.md', () => {
    const doc = readFileSync(path.join(process.cwd(), 'docs/delivery-model.md'), 'utf8');

    expect(doc).toContain(`v${deliveryModel.version}`);
    for (const format of deliveryModel.formats) expect(doc, format.label).toContain(format.label);
    for (const stage of deliveryModel.stages) expect(doc, stage.title).toContain(`${stage.number} ${stage.title}`);
    for (const text of Object.values(deliveryModel.statements)) expect(doc).toContain(text);
  });
});
