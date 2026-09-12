import { ClipboardList, DraftingCompass, HardHat, MessagesSquare } from 'lucide-react';
import type { DirectionPageConfig } from '../types/directionPage';
import { directionPages } from './directionPages';
import { relatedDirections } from './relatedDirections';

/**
 * What RUBIKON does on a grain object and what specialised partners do — decision 1 of the Grain
 * Planner Implementation Spec v1, verbatim. The hero, the result's decision boundary, bands 04 and
 * 05 and the FAQ all quote this one constant; none of them rephrases it.
 */
export const GRAIN_RESPONSIBILITY_STATEMENT =
  'RUBIKON BUILD може вести комплексну реалізацію зерносховища, координуючи будівельну частину, технологічні вимоги та стики між системами; спеціалізоване обладнання, його підбір і монтаж за потреби виконують профільні партнери в межах узгодженого рішення.';

/** A real, confirmed grain object RUBIKON built — never an illustration or a placeholder. */
export type GrainCase = { title: string; location: string; scope: string; image: string; imageAlt: string };

/**
 * The future /zernoskhovyshcha as a direction-page config: hero (01), «Як RUBIKON реалізує» (04,
 * editorial with the work points), the process after the brief (05), FAQ v2 (07), related
 * directions with roofing (08) and the inquiry (09). Bands 02–03 are the planner. The current
 * directionPages.zernoskhovyshcha stays untouched until the flag is on (Phase 5).
 */
const grainDirection: DirectionPageConfig = {
  id: 'zernoskhovyshcha',
  pageClassName: 'grain-page',
  hero: {
    breadcrumbLabel: 'Зерносховища',
    title: 'Зерносховища',
    accent: 'під вашу задачу зберігання',
    intro: `Скільки зерна, які партії, чи потрібна підготовка і що дозволяє майданчик — з цього починається рішення. ${GRAIN_RESPONSIBILITY_STATEMENT}`,
    actions: {
      className: 'grain-hero-actions',
      sectionClassName: 'grain-service-subhero',
      items: [
        { label: 'Сформувати задачу', href: '#planner', className: 'button button-primary', arrow: '↓' },
        { label: 'Обговорити з інженером', href: '#inquiry', className: 'button grain-hero-secondary', arrow: '↗' },
      ],
    },
  },
  editorial: {
    eyebrow: 'Як RUBIKON реалізує',
    title: 'Одна точка координації',
    text: GRAIN_RESPONSIBILITY_STATEMENT,
    points: [
      ['01', 'Основа й фундаменти', 'Бетонні основи під силоси чи підлогове сховище, опорні конструкції та майданчики.'],
      ['02', 'Каркас, огородження і покрівля', 'Несучий каркас і захищений контур з увагою до герметичності та примикань.'],
      ['03', 'Технологічні вимоги', 'Отвори, закладні, місця кріплення й навантаження від обладнання — у будівельному рішенні.'],
      ['04', 'Стики між системами', 'Послідовність робіт і стики з профільними партнерами, які підбирають і монтують обладнання.'],
    ],
    image: directionPages.zernoskhovyshcha.editorial.image,
    imageAlt: directionPages.zernoskhovyshcha.editorial.imageAlt,
  },
  process: {
    eyebrow: 'Після брифу',
    title: 'Від опису до реалізації',
    text: GRAIN_RESPONSIBILITY_STATEMENT,
    steps: [
      ['01', 'Ваш попередній опис', 'Бриф із планувальника — відправна точка: задача, фактори й відкриті питання.', ClipboardList],
      ['02', 'Перша розмова', 'Інженер уточнює те, що ще не визначено, і вихідні дані, яких бракує.', MessagesSquare],
      ['03', 'Технічне рішення і проєктування', 'Будівельна частина й технологічні вимоги в одному рішенні; обладнання — з профільними партнерами.', DraftingCompass],
      ['04', 'Реалізація і стики', 'Погоджені роботи, послідовність етапів і стики між системами на майданчику.', HardHat],
    ],
  },
  faq: {
    title: 'Перед першою розмовою',
    collapsible: true,
    items: [
      ['Чи результат планувальника — це проєкт?', 'Ні. Планувальник формує попередній опис задачі й показує, які підходи доречні та що варто уточнити. Конструктивні рішення, розрахунки й вартість визначаються на етапі технічного рішення і проєктування.'],
      ['Що, якщо я не знаю частини відповідей?', 'Це нормально. Позначте «ще не визначили» — планувальник покаже, що саме уточнити, а інженер RUBIKON розбере ці питання на першій розмові.'],
      ['Чи займаєтеся ви технологічним обладнанням?', GRAIN_RESPONSIBILITY_STATEMENT],
      ['Від чого залежить вартість?', 'Від місткості й кількості окремих партій, підготовки зерна, способу переміщення, умов майданчика й основи, а також від обсягу робіт, який веде RUBIKON. Вартість визначаємо після технічного рішення, а не за однією місткістю.'],
      ['Чи виконуєте лише бетонну основу під зерносховище?', 'Так, можемо виконати основу окремим етапом за наявною документацією, узгодивши межі відповідальності з іншими підрядниками.'],
      ['У яких регіонах ви будуєте зерносховища?', 'Основний регіон — Дніпро та Дніпропетровська область. Масштабні промислові й аграрні об’єкти розглядаємо по всій Україні.'],
    ],
  },
  related: {
    compact: true,
    items: [
      ...relatedDirections.zernoskhovyshcha,
      { id: 'pokrivelni-roboty', relation: 'Покрівля й огородження підлогових зерносховищ — контур, вузли та примикання.' },
    ],
  },
  cta: directionPages.zernoskhovyshcha.cta,
};

export const grainPage = {
  /** Band 02 — the planner's section header. */
  planner: {
    eyebrow: 'Починаємо з вашої задачі',
    title: 'Який зерновий об’єкт вам насправді потрібен?',
    supporting: 'Відповіді формують інженерний контекст — без передчасного вибору будівлі.',
  },
  /** Band 06: real objects only. While this is empty the band is not rendered — no placeholders. */
  cases: [] as readonly GrainCase[],
  direction: grainDirection,
} as const;
