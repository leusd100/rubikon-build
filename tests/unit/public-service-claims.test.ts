import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { company } from '../../app/data/company';
import { deliveryModel } from '../../app/data/deliveryModel';
import { directionPages } from '../../app/data/directionPages';
import { directions } from '../../app/data/directions';
import { grainPage } from '../../app/data/grainPage';
import { homeProofCase } from '../../app/data/homeProof';
import { publicTexts } from '../../app/lib/deliveryModel';

// Scan public copy, including fallback service pages and metadata. The Planner's frozen statement
// is deliberately excluded; grainPage.direction is the website boundary, not the Planner result.
const publicCopy = [
  company.description, company.geography, ...publicTexts(deliveryModel),
  JSON.stringify(directionPages), JSON.stringify(directions), JSON.stringify(grainPage.direction),
  ...['app/page.tsx', 'app/components/HomeSections.tsx', 'app/components/angary/HangarEditorialArchitecture.tsx',
    'app/pro-nas/page.tsx', 'app/components/SiteChrome.tsx'].map((file) => readFileSync(file, 'utf8')),
].join('\n');

const forbidden: readonly [RegExp, string][] = [
  [/власн(?:е|ого|ому)\s+виробництв|власн(?:ий|ого|ому)\s+цех/iu, 'власне виробництво'],
  [/власне\s+або\s+на\s+організованому/iu, 'власне або на організованому зовнішньому виробництві'],
  [/виготовляємо\s+та\s+монтуємо[^.]*власною\s+командою/iu, 'Виготовляємо та монтуємо металоконструкції власною командою'],
  [/формуємо\s+(?:конструктивну\s+схему|схему\s+основ)/iu, 'Формуємо конструктивну схему'],
  [/повн(?:ий|ого)\s+цикл[^.]*про[єе]ктуван/iu, 'Повний цикл від проєктування до здачі'],
  [/по\s+всій\s+Україні|Дніпрі\s+та\s+Україні/iu, 'Працюємо по всій Україні'],
  [/30\s*\+\s*(?:років)?|понад\s+30\s+рок|(?:з\s+)?1995/iu, 'з 1995 року'],
];

describe('P01 public claim boundaries', () => {
  for (const [pattern, example] of forbidden) {
    it(`blocks regression: ${example}`, () => {
      expect(example).toMatch(pattern);
      expect(publicCopy).not.toMatch(pattern);
    });
  }

  it('publishes only the primary service area and conditions other regions', () => {
    expect(company.serviceAreas).toEqual(['Дніпропетровська область']);
    expect(company.geography).toMatch(/інших регіонах України.*якщо.*якісно організувати/);
    for (const page of Object.values(directionPages)) {
      const answer = page.faq?.items.find(([question]) => /регіонах/.test(question))?.[1];
      expect(answer, page.id).toBe(company.geography);
    }
  });

  it('separates own erection, project-dependent fabrication and specialist floors', () => {
    const capabilities = deliveryModel.capabilities;
    expect(capabilities.find((item) => item.id === 'steel')?.layer).toBe('core');
    const fabrication = capabilities.find((item) => item.id === 'steel-fabrication');
    expect(fabrication?.layer).toBe('flexible');
    expect(fabrication?.statement).toMatch(/майданчику.*великих обсягів.*партнерське/);
    expect(capabilities.find((item) => item.id === 'industrial-floors')?.statement).toMatch(/Бетонну основу.*спеціалізовані етапи.*профільними/);
    for (const id of ['design', 'process-equipment']) expect(capabilities.map((item) => item.id)).not.toContain(id);
  });

  it('keeps the complex-scope responsibility with RUBIKON and independently ordered work outside it', () => {
    expect(deliveryModel.statements.responsibility).toMatch(/беремо погоджений комплекс.*відповідаємо за результат/);
    expect(deliveryModel.formats[0].summary).toBe(deliveryModel.statements.responsibility);
    expect(deliveryModel.statements.boundary).toMatch(/замовник замовляє окремо.*поза нашою відповідальністю/);
    expect(deliveryModel.statements.design).toMatch(/Проєкт надає замовник або його окремий проєктувальник/);
  });

  it('keeps the first-contact promise client-facing without a response-time promise or unsupported proof', () => {
    expect(deliveryModel.statements.firstContact).toMatch(/Ми уточнимо задачу.*підкажемо, яких даних бракує/);
    expect(deliveryModel.statements.firstContact).not.toMatch(/Дмитро|Сергій/);
    expect(publicCopy).not.toMatch(/(?:відповімо|передзвонимо|зв[’']яжемося)[^.]*\d+\s*(?:хв|год)/iu);
    expect(homeProofCase?.provenance).toBe('serhii-prior');
    expect(homeProofCase?.attribution).toContain('до створення RUBIKON BUILD');
  });
});
