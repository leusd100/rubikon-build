// «Об’єкт» (owner, 03.10): what the hangar is for, whether there is a project, where it stands and whether it carries
// lifting equipment. Four optional answers, all business configuration — they travel to the lead like the sizes do,
// but only once answered: an unanswered question is not a row of the brief. Nothing here feeds the geometry.

export type HangarPurpose = 'storage' | 'machinery' | 'production' | 'agricultural' | 'other';
export type ProjectStatus = 'ready' | 'inProgress' | 'none' | 'unknown';
export type LiftingEquipment = 'none' | 'craneOrHoist' | 'unknown';

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
};

export const DEFAULT_OBJECT_PROFILE: ObjectProfile = {
  purpose: null,
  project: 'unknown',
  region: 'unknown',
  lifting: 'unknown',
};

export const PURPOSE_LABELS: Record<HangarPurpose, string> = {
  storage: 'Склад',
  machinery: 'Техніка',
  production: 'Виробництво',
  agricultural: 'Аграрний об’єкт',
  other: 'Інше',
};
export const PURPOSE_ORDER: HangarPurpose[] = ['storage', 'machinery', 'production', 'agricultural', 'other'];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  ready: 'Є проєкт',
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
  };
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

/** One line for the group's phone header — «Склад · Київська обл.» — in the order the questions are asked. */
export function objectProfileLine(profile: ObjectProfile): string {
  const parts = [
    profile.purpose === null ? null : PURPOSE_LABELS[profile.purpose],
    profile.region === 'unknown' ? null : profile.region.replace(/ область$/, ' обл.'),
    profile.project === 'unknown' ? null : PROJECT_SHORT[profile.project],
    profile.lifting === 'unknown' ? null : LIFTING_SHORT[profile.lifting],
  ].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : 'Ще не вказано';
}

export function sameObjectProfile(a: ObjectProfile, b: ObjectProfile): boolean {
  return a.purpose === b.purpose && a.project === b.project && a.region === b.region && a.lifting === b.lifting;
}
