import { describe, expect, it } from 'vitest';
import { directionPages } from '../../../app/data/directionPages';
import { directions } from '../../../app/data/directions';
import { GRAIN_HERO_BOUNDARY, GRAIN_RESPONSIBILITY_STATEMENT, GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT, grainPage } from '../../../app/data/grainPage';
import { relatedDirections } from '../../../app/data/relatedDirections';

// Decision 1 of the Grain Planner Implementation Spec v1, as the owner approved it.
const DECISION_1 = 'RUBIKON BUILD може вести комплексну реалізацію зерносховища, координуючи будівельну частину, технологічні вимоги та стики між системами; спеціалізоване обладнання, його підбір і монтаж за потреби виконують профільні партнери в межах узгодженого рішення.';

/** Every string anywhere in a value — the whole page copy for the wording checks. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

const config = grainPage.direction;
const faqQuestions = config.faq?.items.map(([question]) => question) ?? [];

describe('grain page copy', () => {
  it('holds decision 1 verbatim as its one responsibility statement', () => {
    expect(GRAIN_RESPONSIBILITY_STATEMENT).toBe(DECISION_1);
  });

  it('uses the conservative website boundary without changing the Planner decision', () => {
    // short in the hero (06.10); whole beside the drawing of the building part, which shows the same split, and in the FAQ
    expect(config.hero.intro.endsWith(GRAIN_HERO_BOUNDARY)).toBe(true);
    expect(config.editorial.text).toBe(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    expect(config.editorial.text).toContain('погоджену будівельну частину');
    expect(config.process.text).toContain('склад будівельних робіт');
    expect(config.faq?.items.find(([question]) => question === 'Чи займаєтеся ви технологічним обладнанням?')?.[1]).toBe(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    expect(GRAIN_RESPONSIBILITY_STATEMENT).toBe(DECISION_1);
    expect(strings(config).join(' ')).not.toContain(DECISION_1);
  });

  it('asks the FAQ v2 questions and drops the capacity-only estimate', () => {
    for (const question of [
      'Чи результат планувальника — це проєкт?',
      'Що, якщо я не знаю частини відповідей?',
      'Чи займаєтеся ви технологічним обладнанням?',
      'Від чого залежить вартість?',
      'Чи виконуєте лише бетонну основу під зерносховище?',
      'У яких регіонах ви будуєте зерносховища?',
    ]) expect(faqQuestions).toContain(question);
    expect(faqQuestions.some((question) => /орієнтовною місткістю/.test(question))).toBe(false);
    expect(config.faq?.collapsible).toBe(true);
  });

  it('names the whole service area, not only the city', () => {
    const regions = config.faq?.items.find(([question]) => question === 'У яких регіонах ви будуєте зерносховища?')?.[1] ?? '';
    expect(regions).toContain('Дніпропетровській області');
    expect(regions).toContain('якщо їх формат і умови дозволяють');
  });

  it('leads the hero into the planner and the conversation', () => {
    expect(config.hero.actions?.items.map(({ label, href }) => [label, href])).toEqual([
      ['Сформувати задачу', '#planner'],
      ['Обговорити зерносховище', '#inquiry'],
    ]);
  });

  it('keeps concrete and steel and adds roofing to the related directions', () => {
    const ids = new Set<string>(directions.map((direction) => direction.id));
    expect(config.related?.compact).toBe(true);
    const related = config.related?.items ?? relatedDirections[config.id];
    expect(related.map(({ id }) => id)).toEqual(['betonni-roboty', 'metalokonstruktsii', 'pokrivelni-roboty']);
    for (const { id, relation } of related) {
      expect(ids.has(id)).toBe(true);
      expect(id).not.toBe(config.id);
      expect(relation.trim().length).toBeGreaterThan(0);
    }
  });

  it('shows no real-objects band until there are confirmed objects', () => {
    expect(grainPage.cases).toEqual([]);
  });

  it('keeps the previous /zernoskhovyshcha content for the flag-off rollback', () => {
    const live = directionPages.zernoskhovyshcha;
    expect(live.hero.actions).toBeUndefined();
    expect(live.overview?.eyebrow).toBe('Склад робіт');
    expect(live.cost).toBeDefined();
    expect(live.faq?.items.map(([question]) => question)).toContain('Чи можете оцінити вартість без готового проєкту, лише за орієнтовною місткістю?');
  });
});

// /zernoskhovyshcha itself since 06.10: the complex on a drawing (the planner composition above stays on /planner-preview)
describe('grain complex page copy', () => {
  const complex = grainPage.complexDirection;
  const questions = complex.faq?.items.map(([question]) => question) ?? [];

  it('keeps the same boundary as the planner page', () => {
    expect(complex.hero.intro.endsWith(GRAIN_HERO_BOUNDARY)).toBe(true);
    expect(complex.editorial.text).toBe(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    expect(complex.faq?.items.find(([question]) => question === 'Чи займаєтеся ви технологічним обладнанням?')?.[1]).toBe(GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT);
    expect(strings(complex).join(' ')).not.toContain(DECISION_1);
  });

  it('leads the hero into the complex and the conversation', () => {
    expect(complex.hero.actions?.items.map(({ label, href }) => [label, href])).toEqual([
      ['Скласти комплекс', '#kompleks'],
      ['Обговорити зерносховище', '#inquiry'],
    ]);
  });

  it('speaks of the scheme, never of a planner the page no longer has', () => {
    expect(questions).toContain('Чи схема комплексу — це проєкт?');
    expect(strings(complex.faq).join(' ')).not.toMatch(/планувальник/i);
    expect(complex.faq?.collapsible).toBe(true);
  });

  it('gives every process step what the client does and what comes of it, with its drawing', () => {
    expect(complex.process.split).toHaveLength(complex.process.steps.length);
    for (const { you, result } of complex.process.split ?? []) {
      expect(you.trim().length).toBeGreaterThan(0);
      expect(result.trim().length).toBeGreaterThan(0);
    }
  });

  it('starts each situation with what the first conversation needs', () => {
    expect(complex.entry?.items.map(({ situation }) => situation)).toEqual(['Нове зерносховище', 'Основа під силоси', 'Зерно в наявній будівлі', 'Розширення комплексу']);
    for (const { start } of complex.entry?.items ?? []) expect(start.trim().length).toBeGreaterThan(0);
  });
});
