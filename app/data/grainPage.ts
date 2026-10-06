import { company } from './company';
import { ClipboardList, DraftingCompass, HardHat, MessagesSquare } from 'lucide-react';
import type { DirectionPageConfig } from '../types/directionPage';
import { directionPages } from './directionPages';

/**
 * What RUBIKON does on a grain object and what specialised partners do — decision 1 of the Grain
 * Planner Implementation Spec v1, verbatim. The hero, the result's decision boundary, bands 04 and
 * 05 and the FAQ all quote this one constant; none of them rephrases it.
 */
export const GRAIN_RESPONSIBILITY_STATEMENT =
  'RUBIKON BUILD може вести комплексну реалізацію зерносховища, координуючи будівельну частину, технологічні вимоги та стики між системами; спеціалізоване обладнання, його підбір і монтаж за потреби виконують профільні партнери в межах узгодженого рішення.';

/** Website service boundary. Planner decision 1 above stays unchanged until the separate D-04 task. */
export const GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT =
  'RUBIKON виконує погоджену будівельну частину зерносховища. Вимоги до основ, отворів, закладних і навантажень узгоджуємо з документацією на обладнання. Підбір, постачання й монтаж технологічного обладнання замовник погоджує окремо з профільними спеціалістами.';

/**
 * The boundary in the hero, short (owner, 06.10: the hero's lead had grown to four lines, three of them this boundary). The
 * full statement stands beside the drawing of the building part (band 04), which shows the same split, and in the FAQ.
 */
export const GRAIN_HERO_BOUNDARY =
  'Будівельну частину виконуємо ми; технологічне обладнання замовник погоджує з профільними спеціалістами.';

/** What the copper and the long dash mean on this page's drawings — band 04's section and the approaches' cards */
export const GRAIN_SCOPE_KEY = [
  { tone: 'own', label: 'Будівельна частина RUBIKON' },
  { tone: 'partner', label: 'Обладнання й роботи профільних спеціалістів' },
] as const;

/** A real, confirmed grain object RUBIKON built — never an illustration or a placeholder. */
export type GrainCase = { title: string; location: string; scope: string; image: string; imageAlt: string };

/**
 * /zernoskhovyshcha as a direction-page config: hero (01), «Як RUBIKON реалізує» (04, editorial
 * with the work points), the process after the brief (05), FAQ v2 (07), related directions (08,
 * relatedDirections.zernoskhovyshcha) and the inquiry (09). Bands 02–03 are the planner.
 * directionPages.zernoskhovyshcha keeps the previous page for the flag-off rollback until the
 * cleanup PR moves this content there.
 */
const grainDirection: DirectionPageConfig = {
  id: 'zernoskhovyshcha',
  pageClassName: 'grain-page',
  hero: {
    breadcrumbLabel: 'Зерносховища',
    title: 'Зерносховища',
    accent: 'під вашу задачу зберігання',
    intro: `Скільки зерна, які партії, чи потрібна підготовка і що дозволяє майданчик — з цього починається рішення. ${GRAIN_HERO_BOUNDARY}`,
    // A phone: the opening question as the lead, the boundary right under the actions — still in the hero, after the call
    introPhone: 'Скільки зерна, які партії, чи потрібна підготовка і що дозволяє майданчик — з цього починається рішення.',
    notePhone: GRAIN_HERO_BOUNDARY,
    actions: {
      className: 'grain-hero-actions',
      sectionClassName: 'grain-service-subhero',
      items: [
        { label: 'Сформувати задачу', href: '#planner', className: 'button button-primary', arrow: '↓' },
        { label: 'Обговорити зерносховище', href: '#inquiry', className: 'button grain-hero-secondary', arrow: '↓' },
      ],
    },
  },
  editorial: {
    eyebrow: 'Як RUBIKON реалізує',
    title: 'Будівельна частина',
    // The full boundary, beside the drawing that shows it: copper is the building part, the long dash the equipment
    text: GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT,
    image: directionPages.zernoskhovyshcha.editorial.image,
    imageAlt: directionPages.zernoskhovyshcha.editorial.imageAlt,
    // The four work points as a tour of one drawing (GrainStoreDrawing): half a section of a framed floor store
    node: {
      drawing: 'grain-store',
      width: 1800,
      height: 1200,
      overviewCaption: 'Переріз підлогового зерносховища',
      legend: GRAIN_SCOPE_KEY,
      steps: [
        {
          title: 'Основа й фундаменти',
          text: 'Фундаменти, підлога й підпірні стіни, що тримають тиск зерна; бетонні основи під силоси.',
          caption: 'Фундамент, підпірна стіна й підлога',
          focus: [520, 860], zoom: 1.6,
          mark: { d: 'M330 700V640H390M600 640H660V700M660 1020V1080H600M390 1080H330V1020', badge: [640, 1040] },
        },
        {
          title: 'Каркас, огородження і покрівля',
          text: 'Несучий каркас і захищений контур з увагою до герметичності та примикань.',
          caption: 'Каркас, стіни й покрівля',
          focus: [760, 380], zoom: 1.5,
          mark: { d: 'M380 350V290H440M700 290H760V350M760 540V600H700M440 600H380V540', badge: [320, 300] },
        },
        {
          title: 'Технологічні вимоги',
          text: 'Отвори, канали, закладні, місця кріплення й навантаження від обладнання — у будівельному рішенні.',
          caption: 'Отвір, канал аерації й закладні',
          focus: [720, 905], zoom: 1.7,
          mark: { d: 'M420 880V840H460M1250 840H1290V880M1290 952V992H1250M460 992H420V952', badge: [880, 1040] },
        },
        {
          title: 'Стики між системами',
          text: 'Узгодження нашої будівельної частини з роботами спеціалістів замовника з обладнання.',
          caption: 'Де обладнання стикується з будівлею',
          focus: [900, 600], zoom: 1,
          mark: { d: 'M196 884a104 104 0 1 0 208 0a104 104 0 1 0 -208 0M1468 212a98 98 0 1 0 196 0a98 98 0 1 0 -196 0', badge: [170, 770] },
        },
      ],
    },
  },
  process: {
    eyebrow: 'Після брифу',
    title: 'Від опису до реалізації',
    text: 'Після розмови й перегляду документації узгоджуємо склад будівельних робіт.',
    steps: [
      ['01', 'Ваш попередній опис', 'Бриф із планувальника — відправна точка: задача, фактори й відкриті питання.', ClipboardList],
      ['02', 'Перша розмова', 'Уточнюємо призначення об’єкта, місткість, умови майданчика та те, які матеріали вже підготовлено.', MessagesSquare],
      ['03', 'Узгодження з проєктом', 'Замовник надає проєкт або залучає проєктувальника. Узгоджуємо будівельну частину з ним і постачальником обладнання.', DraftingCompass],
      ['04', 'Реалізація', 'Виконуємо погоджені будівельні роботи в узгодженій послідовності.', HardHat],
    ],
  },
  faq: {
    title: 'Перед першою розмовою',
    collapsible: true,
    items: [
      ['Чи результат планувальника — це проєкт?', 'Ні. Планувальник формує попередній опис задачі й показує, які підходи доречні та що варто уточнити. Конструктивні рішення й розрахунки готує проєктувальник замовника. Кошторис будівельних робіт складаємо за достатніми проєктними даними.'],
      ['Що, якщо я не знаю частини відповідей?', 'Це нормально. Позначте «ще не визначили» — планувальник покаже, що саме уточнити, а ми розберемо ці питання на першій розмові.'],
      ['Чи займаєтеся ви технологічним обладнанням?', GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT],
      ['Від чого залежить вартість?', 'Від місткості й кількості окремих партій, підготовки зерна, способу переміщення, умов майданчика й основи, а також від обсягу робіт, який веде RUBIKON. Вартість визначаємо після технічного рішення, а не за однією місткістю.'],
      ['Чи виконуєте лише бетонну основу під зерносховище?', 'Так, можемо виконати основу окремим етапом за наявною документацією, узгодивши межі відповідальності з іншими підрядниками.'],
      ['У яких регіонах ви будуєте зерносховища?', company.geography],
    ],
  },
  related: { compact: true },
  cta: directionPages.zernoskhovyshcha.cta,
};

export const grainPage = {
  /** Band 02 — the planner's section header. */
  planner: {
    eyebrow: 'Починаємо з вашої задачі',
    title: 'Який зерновий об’єкт вам насправді потрібен?',
    supporting: 'Відповіді готують предметну розмову — без передчасного вибору будівлі.',
  },
  /**
   * Band 03 before a consultation: what each approach is, in one plain sentence (owner, 06.10: the planner's own summaries
   * describe how a card is «shown», not the store). Who does which part, the drawings say — with GRAIN_SCOPE_KEY.
   */
  approaches: {
    silo: 'Металеві силоси на бетонній основі; зерно подають і забирають норії та конвеєри.',
    framed: 'Каркасна будівля з підпірними стінами: зерно лежить на підлозі.',
    arch: 'Арочна оболонка без внутрішнього каркаса на бетонній основі; зерно лежить на підлозі.',
  },
  /** Band 06: real objects only. While this is empty the band is not rendered — no placeholders. */
  cases: [] as readonly GrainCase[],
  direction: grainDirection,
} as const;
