/**
 * «Зберіть свій комплекс на кресленні» (/zernoskhovyshcha, owner 06.10: «клієнт це заповнювати не буде… спростити і
 * зробити дійсно вау ефект»): three choices instead of the planner's five themes — the grain's preparation, the storage
 * and a rough scale — and what follows from them: the chain the drawing shows, how many silos it draws, how long the
 * floor store is, who builds which part, and the line the inquiry form starts with.
 *
 * The scale is a picture of size, not a calculation: the drawing adds silos or lengthens the store, and says so. The
 * building part is RUBIKON's, the equipment the specialists' (GRAIN_WEBSITE_RESPONSIBILITY_STATEMENT); arched storage
 * is not offered here (a future capability in the service passport).
 */

export type GrainStorage = 'silos' | 'floor' | 'unknown';
export type GrainScale = 0 | 1 | 2 | 3;

export type GrainComplexState = {
  cleaning: boolean;
  drying: boolean;
  storage: GrainStorage;
  scale: GrainScale;
};

/** What the block opens with: a full chain, so the first view is the whole complex at work */
export const GRAIN_COMPLEX_DEFAULT: GrainComplexState = { cleaning: true, drying: true, storage: 'silos', scale: 1 };

export const GRAIN_STORAGE_OPTIONS: readonly { value: GrainStorage; label: string }[] = [
  { value: 'silos', label: 'Силоси' },
  { value: 'floor', label: 'Підлогове сховище' },
  { value: 'unknown', label: 'Ще не визначили' },
];

export const GRAIN_SCALE_OPTIONS: readonly { value: GrainScale; label: string }[] = [
  { value: 0, label: 'до 1 тис. т' },
  { value: 1, label: '1–5 тис. т' },
  { value: 2, label: '5–20 тис. т' },
  { value: 3, label: 'понад 20 тис. т' },
];

/** Silos drawn per scale, and the floor store's length on the drawing (its units) — a picture of size only */
const SILOS = [2, 3, 4, 5] as const;
const FLOOR_LENGTH = [330, 450, 590, 730] as const;

export type GrainComplexModel = {
  state: GrainComplexState;
  /** The modules in the order the grain passes them, as the title block names them */
  chain: string[];
  silos: number;
  floorLength: number;
  scaleLabel: string;
  /** Who does what in this chain: the building part (copper on the drawing) and the specialists' equipment (long dash) */
  own: string[];
  partners: string[];
  /** The inquiry's «Коротко про завдання», started for the visitor (PrefillInquiryLink) */
  inquiryText: string;
};

const storageWord: Record<GrainStorage, string> = { silos: 'силоси', floor: 'підлогове сховище', unknown: 'сховище (тип ще не визначили)' };

export function grainComplexModel(state: GrainComplexState): GrainComplexModel {
  const scaleLabel = GRAIN_SCALE_OPTIONS[state.scale].label;
  const chain = [
    'Приймання',
    ...(state.cleaning ? ['Очищення'] : []),
    ...(state.drying ? ['Сушіння'] : []),
    state.storage === 'silos' ? 'Силоси' : state.storage === 'floor' ? 'Підлогове сховище' : 'Сховище',
    'Відвантаження',
  ];

  const own = [
    'Приймальний бункер і майданчик розвантаження',
    'Фундаменти й опори під норію та галерею',
    ...(state.cleaning ? ['Майданчик і опорні конструкції під очищення'] : []),
    ...(state.drying ? ['Фундамент під сушарку'] : []),
    state.storage === 'silos'
      ? 'Бетонні основи під силоси'
      : state.storage === 'floor'
        ? 'Підлогове сховище: фундаменти, підпірні стіни, каркас і покрівля'
        : 'Основа або будівля — щойно визначите тип сховища',
    'Опори бункера відвантаження',
  ];

  const partners = [
    'Норія та конвеєри',
    ...(state.cleaning ? ['Машина очищення'] : []),
    ...(state.drying ? ['Зерносушарка'] : []),
    ...(state.storage === 'silos' ? ['Силоси'] : state.storage === 'floor' ? ['Аерація й конвеєри сховища'] : []),
    'Бункер відвантаження',
  ];

  const preparation = [state.cleaning && 'очищення', state.drying && 'сушіння'].filter(Boolean).join(' і ');
  const inquiryText = `Зерновий комплекс: ${preparation ? `${preparation}, ` : 'без підготовки, '}${storageWord[state.storage]}, орієнтовно ${scaleLabel}. `;

  return {
    state,
    chain,
    silos: SILOS[state.scale],
    floorLength: FLOOR_LENGTH[state.scale],
    scaleLabel,
    own,
    partners,
    inquiryText,
  };
}
