// «Об’єкт» (owner, 03.10): what the hangar is for, whether there is a project, where it stands and whether it carries
// lifting equipment. Four optional answers, all business configuration — they travel to the lead like the sizes do,
// but only once answered: an unanswered question is not a row of the brief. Nothing here feeds the geometry.
// 10.10 (owner): a fifth, asked only of a cold store — the temperature inside, for the manager. No engineering follows
// from it here: no panel thickness, no insulation value; the purpose alone suggests the warm hangar (domainModel.ts).

export type HangarPurpose = 'storage' | 'coldStore' | 'machinery' | 'production' | 'agricultural' | 'other';
export type ProjectStatus = 'ready' | 'inProgress' | 'none' | 'unknown';
export type LiftingEquipment = 'none' | 'craneOrHoist' | 'unknown';
/** «Яка температура всередині?» — asked of a cold store only (10.10) */
export type ColdStoreTemperature = 'chilled' | 'frozen' | 'unknown';

/** The 24 oblasts and Kyiv, by their names: the value is what the lead reads, so there is no code to look up. */
export const BUILD_REGIONS = [
  'Вінницька область',
  'Волинська область',
  'Дніпропетровська область',
  'Донецька область',
  'Житомирська область',
  'Закарпатська область',
  'Запорізька область',
  'Івано-Франківська область',
  'Київська область',
  // next to its oblast, where a visitor scanning for «К» looks for it
  'м. Київ',
  'Кіровоградська область',
  'Луганська область',
  'Львівська область',
  'Миколаївська область',
  'Одеська область',
  'Полтавська область',
  'Рівненська область',
  'Сумська область',
  'Тернопільська область',
  'Харківська область',
  'Херсонська область',
  'Хмельницька область',
  'Черкаська область',
  'Чернівецька область',
  'Чернігівська область',
] as const;

export type BuildRegion = (typeof BUILD_REGIONS)[number] | 'unknown';

export type ObjectProfile = {
  /** null until a chip is chosen: the purpose has no «Ще не знаю» chip of its own (owner's list, 03.10). */
  purpose: HangarPurpose | null;
  project: ProjectStatus;
  region: BuildRegion;
  lifting: LiftingEquipment;
  /** Kept when the purpose changes, as every answer is held (04.10), but sent only with «Холодильний склад» */
  temperature: ColdStoreTemperature;
};

export const DEFAULT_OBJECT_PROFILE: ObjectProfile = {
  purpose: null,
  project: 'unknown',
  region: 'unknown',
  lifting: 'unknown',
  temperature: 'unknown',
};

export const PURPOSE_LABELS: Record<HangarPurpose, string> = {
  storage: 'Склад',
  coldStore: 'Холодильний склад',
  machinery: 'Техніка',
  production: 'Виробництво',
  agricultural: 'Аграрний об’єкт',
  other: 'Інше',
};
// the cold store beside the plain one, where a visitor reading «Склад» looks for it (10.10)
export const PURPOSE_ORDER: HangarPurpose[] = ['storage', 'coldStore', 'machinery', 'production', 'agricultural', 'other'];

// The chips under «Чи є у вас проєкт?»: «Є», not «Є проєкт» (10.10, audit F42 — «Проєкт» three times in a row)
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ready: 'Є',
  inProgress: 'Готується',
  none: 'Ще немає',
  unknown: 'Ще не знаю',
};
export const PROJECT_STATUS_ORDER: ProjectStatus[] = ['ready', 'inProgress', 'none', 'unknown'];

export const LIFTING_EQUIPMENT_LABELS: Record<LiftingEquipment, string> = {
  none: 'Немає',
  craneOrHoist: 'Кран-балка або тельфер',
  unknown: 'Ще не знаю',
};
export const LIFTING_EQUIPMENT_ORDER: LiftingEquipment[] = ['none', 'craneOrHoist', 'unknown'];
/** The question in the client's words, «Буде кран-балка або тельфер?», answered «Так / Ні / Ще не знаю» (10.10, owner);
 *  the lead keeps the equipment's name (LIFTING_EQUIPMENT_LABELS), which a bare «Так» would not say */
export const LIFTING_EQUIPMENT_ANSWERS: Record<LiftingEquipment, string> = {
  craneOrHoist: 'Так',
  none: 'Ні',
  unknown: 'Ще не знаю',
};
export const LIFTING_EQUIPMENT_ANSWER_ORDER: LiftingEquipment[] = ['craneOrHoist', 'none', 'unknown'];

/** «Яка температура всередині?»: the answer as one line, for the brief and the stamp — what the visitor read on its tile */
export const TEMPERATURE_LABELS: Record<ColdStoreTemperature, string> = {
  // the answer by what it does, and on which side of zero (10.10, owner: not «Плюсова»)
  chilled: 'Охолодження\u00A0— від 0\u00A0°C',
  frozen: 'Заморозка\u00A0— нижче 0\u00A0°C',
  unknown: 'Ще не знаю',
};
export const TEMPERATURE_ORDER: ColdStoreTemperature[] = ['chilled', 'frozen', 'unknown'];

export const UNKNOWN_REGION_LABEL = 'Ще не знаю';

export function isBuildRegion(value: string): value is BuildRegion {
  return value === 'unknown' || (BUILD_REGIONS as readonly string[]).includes(value);
}

/** The answers as the lead reads them; null = not answered, so the row is left out rather than sent as «Ще не знаю». */
export type ObjectProfileLabels = {
  purpose: string | null;
  project: string | null;
  region: string | null;
  lifting: string | null;
  /** only for a cold store, once answered */
  temperature: string | null;
};

// «Проєкт: Є проєкт» repeats itself in a brief row, so the row says only the answer
const PROJECT_BRIEF_VALUES: Record<Exclude<ProjectStatus, 'unknown'>, string> = {
  ready: 'Є',
  inProgress: 'Готується',
  none: 'Ще немає',
};

export function objectProfileLabels(profile: ObjectProfile): ObjectProfileLabels {
  return {
    purpose: profile.purpose === null ? null : PURPOSE_LABELS[profile.purpose],
    project: profile.project === 'unknown' ? null : PROJECT_BRIEF_VALUES[profile.project],
    region: profile.region === 'unknown' ? null : profile.region,
    lifting: profile.lifting === 'unknown' ? null : LIFTING_EQUIPMENT_LABELS[profile.lifting],
    temperature: coldStoreTemperature(profile),
  };
}

/** The temperature the lead carries: a cold store's, once answered — held for another purpose, never sent with it */
function coldStoreTemperature(profile: ObjectProfile): string | null {
  return profile.purpose === 'coldStore' && profile.temperature !== 'unknown' ? TEMPERATURE_LABELS[profile.temperature] : null;
}

const PROJECT_SHORT: Record<Exclude<ProjectStatus, 'unknown'>, string> = {
  ready: 'є проєкт',
  inProgress: 'проєкт готується',
  none: 'проєкту ще немає',
};
const LIFTING_SHORT: Record<Exclude<LiftingEquipment, 'unknown'>, string> = {
  none: 'без підйомного обладнання',
  craneOrHoist: 'кран-балка або тельфер',
};
const TEMPERATURE_SHORT: Record<Exclude<ColdStoreTemperature, 'unknown'>, string> = {
  // as the tiles name them (10.10, QA: «плюсова» stayed here after the tiles changed)
  chilled: 'охолодження',
  frozen: 'заморозка',
};

/** One line for the group's phone header — «Склад · Київська обл.» — in the order the questions are asked; a cold store's
 *  temperature right after it (10.10): «Холодильний склад · заморозка · Одеська обл.» */
export function objectProfileLine(profile: ObjectProfile): string {
  const parts = [
    profile.purpose === null ? null : PURPOSE_LABELS[profile.purpose],
    profile.purpose === 'coldStore' && profile.temperature !== 'unknown' ? TEMPERATURE_SHORT[profile.temperature] : null,
    profile.region === 'unknown' ? null : profile.region.replace(/ область$/, ' обл.'),
    profile.project === 'unknown' ? null : PROJECT_SHORT[profile.project],
    profile.lifting === 'unknown' ? null : LIFTING_SHORT[profile.lifting],
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : 'Ще не вказано';
}

export function sameObjectProfile(a: ObjectProfile, b: ObjectProfile): boolean {
  return a.purpose === b.purpose && a.project === b.project && a.region === b.region && a.lifting === b.lifting
    && a.temperature === b.temperature;
}
