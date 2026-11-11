import type { DirectionId } from './directions';

// «Що буде після звернення» — the four steps in the closing conversation block (ConversationSection).
//
// The steps and their titles are the same on every page: what happens after a visitor gets in touch does not depend on
// the direction. Only the explanation under each title changes, so a direction page speaks about its own inputs. Every
// direction text is assembled from what that page already publishes (its FAQ «що потрібно для оцінки», process and
// cost factors) — no time, no price, no visit, no new promise; the design stays the customer's (P01).

export const JOURNEY_TITLES = ['Уточнюємо задачу', 'Дивимося, що вже є', 'Узгоджуємо склад робіт', 'Готуємо кошторис'] as const;

export type JourneyTexts = readonly [string, string, string, string];

/** HOME, /napryamky, /yak-pratsyuiemo, /pro-nas: pages not about one direction. The texts published in #124/#125. */
export const DEFAULT_JOURNEY: JourneyTexts = [
  'Для чого об’єкт, які роботи потрібні й де будуємо. Скажемо, чи це наш профіль.',
  'Опис, креслення чи проєкт — проєкт надаєте ви або ваш проєктувальник. Якщо даних бракує, підкажемо, що підготувати.',
  'Яку будівельну частину беремо на себе і як вона стикується з проєктом та роботами інших виконавців.',
  'Коли склад робіт визначено й проєктних даних достатньо — кошторис погодженого обсягу.',
];

/**
 * The planner composition (/planner-preview) only. The live direction pages leave the journey out of their form since
 * 11.11 (owner: «прибрати повтори») — each tells the route in its own steps block, as /angary has since the UX review
 * 2026-10 — so the texts metal, concrete and roofing had here went with it.
 */
export const DIRECTION_JOURNEY: Partial<Record<DirectionId, JourneyTexts>> = {
  zernoskhovyshcha: [
    'Місткість, технологія, габарити й умови ділянки. Скажемо, чи це наш профіль.',
    'Ваша схема комплексу чи опис задачі та технологічні вимоги постачальника обладнання. Місткість — лише початок розмови; підкажемо, яких проєктних даних бракує.',
    'Основи, каркас, огородження й вузли примикання до обладнання — узгоджуємо з проєктувальником замовника.',
    'Попередній кошторис — коли є проєктні дані про основу, конструкції й умови майданчика.',
  ],
};
