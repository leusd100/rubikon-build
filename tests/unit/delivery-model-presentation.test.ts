import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { deliveryModel } from '../../app/data/deliveryModel';
import { directionPages } from '../../app/data/directionPages';
import * as navigation from '../../app/data/navigation';
import { formatFromCooperation } from '../../app/lib/deliveryModel';
import {
  cooperationOptions,
  entryPoints,
  faqAnswerText,
  formatCards,
  inquirySuccessMessage,
  turnkeyAnswer,
} from '../../app/lib/deliveryModelPresentation';

const LABELS = ['Комплексна реалізація', 'Окремий підряд', 'Субпідряд'];
// Files wired to the model in PR 2; none of them may retype a format label.
const MODEL_CONSUMERS = [
  'app/page.tsx',
  'app/components/DirectionCards.tsx',
  'app/components/InquirySection.tsx',
  'app/components/ProjectInquiryForm.tsx',
  'app/napryamky/page.tsx',
  'app/yak-pratsyuiemo/page.tsx',
];
const MODEL_FILE = path.join('app', 'data', 'deliveryModel.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return sourceFiles(file);
    return /\.(ts|tsx)$/.test(name) ? [file] : [];
  });
}

describe('delivery model presentation: formats', () => {
  it('gives the homepage exactly the three model formats, numbered in order', () => {
    expect(formatCards()).toEqual(
      deliveryModel.formats.map((format, index) => ({ id: format.id, number: `0${index + 1}`, title: format.label, text: format.summary })),
    );
    expect(formatCards().map((card) => card.title)).toEqual(LABELS);
  });

  it('offers the three labels for «Формат співпраці», and each maps back to its format', () => {
    expect(cooperationOptions()).toEqual(LABELS);
    expect(cooperationOptions().map((label) => formatFromCooperation(label))).toEqual(['comprehensive', 'work-package', 'subcontract']);
  });

  it('keeps values stored before v1 readable without guessing the ambiguous one', () => {
    expect(formatFromCooperation('Об’єкт під ключ')).toBe('comprehensive');
    expect(formatFromCooperation('Окремий етап робіт')).toBe('work-package');
    expect(formatFromCooperation('Підряд або субпідряд')).toBeNull();
    expect(cooperationOptions()).not.toContain('Підряд або субпідряд');
  });
});

describe('delivery model presentation: entry points', () => {
  it('shows what the visitor already has as four entry points with their start stage', () => {
    expect(entryPoints()).toEqual([
      { id: 'task-only', label: 'Лише задача', startStageTitle: 'Запит' },
      { id: 'site-inputs', label: 'Вихідні дані й майданчик', startStageTitle: 'Вихідні дані' },
      { id: 'concept', label: 'Концепція', startStageTitle: 'Склад робіт і бюджет' },
      {
        id: 'design-docs',
        label: 'Проєкт або робоча документація',
        startStageTitle: 'Склад робіт і бюджет',
        startNote: deliveryModel.entryStates[3].startNote,
      },
    ]);
  });
});

describe('delivery model presentation: frozen statements', () => {
  it('ends the inquiry saved state with the first-contact statement, verbatim', () => {
    expect(inquirySuccessMessage()).toBe(`Дякуємо! Запит надіслано. ${deliveryModel.statements.firstContact}`);
  });

  it('answers «під ключ» in the model’s formats and ends on the boundary statement', () => {
    const answer = turnkeyAnswer();

    for (const label of LABELS) expect(answer).toContain(`«${label}»`);
    expect(answer).toContain(deliveryModel.formats[0].summary);
    expect(answer.endsWith(deliveryModel.statements.boundary)).toBe(true);
    expect(answer).not.toMatch(/під ключ|гаранті|штат|генеральн/i);
  });

  it('writes the /angary «під ключ» answer from the model and passes plain answers through', () => {
    const turnkey = directionPages.angary.faq?.items.find(([question]) => question === 'Чи будуєте ангари під ключ?');

    expect(turnkey?.[1]).toEqual({ deliveryModelAnswer: 'turnkey' });
    expect(faqAnswerText({ deliveryModelAnswer: 'turnkey' })).toBe(turnkeyAnswer());
    expect(faqAnswerText('Звичайна відповідь.')).toBe('Звичайна відповідь.');
  });
});

describe('delivery model presentation: single source of truth', () => {
  it('leaves format labels to the model on the homepage, in the form and on /napryamky', () => {
    for (const file of MODEL_CONSUMERS) {
      const source = readFileSync(file, 'utf8');
      for (const label of LABELS) expect(source, `${file}: ${label}`).not.toContain(label);
    }
  });

  it('keeps no local copy of a frozen statement anywhere in app/', () => {
    const statements = Object.values(deliveryModel.statements);
    for (const file of sourceFiles('app')) {
      if (file === MODEL_FILE) continue;
      const source = readFileSync(file, 'utf8');
      for (const statement of statements) expect(source, file).not.toContain(statement);
    }
  });

  it('never names «генеральний підряд» outside the model’s internal contract term', () => {
    for (const file of sourceFiles('app')) {
      if (file === MODEL_FILE) continue;
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/генеральн\S*\s+підряд/i);
    }
  });

  it('sends «Як працюємо» to /yak-pratsyuiemo, and that page exists', () => {
    expect(navigation.siteRoutes.process).toBe('/yak-pratsyuiemo');
    expect(navigation.primaryNavigation.find((item) => item.label === 'Як працюємо')?.href).toBe('/yak-pratsyuiemo');
    expect(existsSync('app/yak-pratsyuiemo/page.tsx')).toBe(true);
  });
});
