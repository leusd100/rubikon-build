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
export type GrainCrop = 'wheat' | 'corn' | 'sunflower' | 'barley' | 'rapeseed' | 'soy';

export type GrainComplexState = {
  /** What is stored: each crop gets its own silo or zone and its own colour on the drawing (owner, 06.10) */
  crops: GrainCrop[];
  cleaning: boolean;
  drying: boolean;
  storage: GrainStorage;
  scale: GrainScale;
};

/** What the block opens with: a full chain, so the first view is the whole complex at work */
export const GRAIN_COMPLEX_DEFAULT: GrainComplexState = { crops: ['wheat', 'corn'], cleaning: true, drying: true, storage: 'silos', scale: 1 };

export const GRAIN_CROP_OPTIONS: readonly { value: GrainCrop; label: string; genitive: string }[] = [
  { value: 'wheat', label: 'Пшениця', genitive: 'пшениця' },
  { value: 'corn', label: 'Кукурудза', genitive: 'кукурудза' },
  { value: 'sunflower', label: 'Соняшник', genitive: 'соняшник' },
  { value: 'barley', label: 'Ячмінь', genitive: 'ячмінь' },
  { value: 'rapeseed', label: 'Ріпак', genitive: 'ріпак' },
  { value: 'soy', label: 'Соя', genitive: 'соя' },
];

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

/** Silos drawn per scale (never fewer than the crops: each keeps its own), and the floor store's length on the drawing
 *  (its units) — a picture of size only */
const SILOS = [2, 3, 4, 5] as const;
const MAX_SILOS = 6;
const FLOOR_LENGTH = [330, 450, 590, 730] as const;

export type GrainComplexModel = {
  state: GrainComplexState;
  /** The crop in each silo (left to right) or each zone of the floor store; 'mixed' while none is chosen */
  binCrops: (GrainCrop | 'mixed')[];
  zoneCrops: (GrainCrop | 'mixed')[];
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

  const silos = Math.min(MAX_SILOS, Math.max(SILOS[state.scale], state.crops.length));
  const cropOf = (index: number): GrainCrop | 'mixed' => (state.crops.length ? state.crops[index % state.crops.length] : 'mixed');

  const own = [
    'Приймальний бункер і майданчик розвантаження',
    'Приямки норій, тунелі конвеєрів, опори норій і галереї',
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
    'Норії та конвеєри',
    ...(state.cleaning ? ['Машина очищення'] : []),
    ...(state.drying ? ['Зерносушарка'] : []),
    ...(state.storage === 'silos' ? ['Силоси'] : state.storage === 'floor' ? ['Аерація й конвеєри сховища'] : []),
    'Бункер відвантаження',
  ];

  const preparation = [state.cleaning && 'очищення', state.drying && 'сушіння'].filter(Boolean).join(' і ');
  const crops = GRAIN_CROP_OPTIONS.filter((option) => state.crops.includes(option.value)).map((option) => option.genitive).join(', ');
  const inquiryText = `Зерновий комплекс: ${crops ? `${crops}; ` : ''}${preparation ? `${preparation}, ` : 'без підготовки, '}${storageWord[state.storage]}, орієнтовно ${scaleLabel}. `;

  return {
    state,
    binCrops: Array.from({ length: silos }, (_, index) => cropOf(index)),
    zoneCrops: state.crops.length ? [...state.crops] : ['mixed'],
    chain,
    silos,
    floorLength: FLOOR_LENGTH[state.scale],
    scaleLabel,
    own,
    partners,
    inquiryText,
  };
}

/** The drawing's modules a pointer can find (GrainComplexDrawing's hit areas) */
export type GrainModuleKey = 'receiving' | 'cleaning' | 'drying' | 'feed' | 'storage' | 'shipping';

export type GrainModuleInfo = {
  name: string;
  /** What RUBIKON builds there (copper on the drawing) and what specialists supply (long dash) */
  own: string;
  partners?: string;
  /** What a press on it does: adds or removes the module, or swaps the storage; nothing for the fixed ones */
  action?: string;
};

/**
 * Who does what in one module, for the drawing's pointer tip (owner, 06.10: «креслення як пульт»). The building part is
 * RUBIKON's, the equipment the specialists'; the action says what a press on the module would change.
 */
export function grainModuleInfo(key: GrainModuleKey, state: GrainComplexState): GrainModuleInfo {
  switch (key) {
    case 'receiving':
      return { name: 'Приймання', own: 'Приймальний бункер і майданчик розвантаження', partners: 'Конвеєр у тунелі' };
    case 'cleaning':
      return {
        name: 'Очищення', own: 'Майданчик, опори й приямок норії', partners: 'Машина очищення й норія',
        action: state.cleaning ? 'Натисніть, щоб прибрати з ланцюга' : 'Натисніть, щоб додати в ланцюг',
      };
    case 'drying':
      return {
        name: 'Сушіння', own: 'Фундамент під сушарку, приямок і щогла норії', partners: 'Зерносушарка й норія',
        action: state.drying ? 'Натисніть, щоб прибрати з ланцюга' : 'Натисніть, щоб додати в ланцюг',
      };
    case 'feed':
      return { name: 'Подача в сховище', own: 'Приямок і щогла норії, тунель конвеєра', partners: 'Норія й галерея' };
    case 'storage':
      if (state.storage === 'silos') return { name: 'Силоси', own: 'Бетонні основи й тунель під силосами', partners: 'Силоси й конвеєри', action: 'Натисніть — підлогове сховище' };
      if (state.storage === 'floor') return { name: 'Підлогове сховище', own: 'Будівля: фундаменти, підпірні стіни, каркас, покрівля', partners: 'Аерація й конвеєри', action: 'Натисніть — силоси' };
      return { name: 'Сховище', own: 'Основа або будівля — щойно визначите тип', action: 'Натисніть — силоси' };
    case 'shipping':
      return { name: 'Відвантаження', own: 'Опори бункера й тунель під сховищем', partners: 'Бункер і похилий конвеєр' };
  }
}

/** What a press on a module changes in the state, or nothing for the modules every chain has */
export function grainModulePress(key: GrainModuleKey, state: GrainComplexState): Partial<GrainComplexState> | null {
  if (key === 'cleaning') return { cleaning: !state.cleaning };
  if (key === 'drying') return { drying: !state.drying };
  if (key === 'storage') return { storage: state.storage === 'silos' ? 'floor' : 'silos' };
  return null;
}
