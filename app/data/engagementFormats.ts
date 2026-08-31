import type { LucideIcon } from 'lucide-react';
import { ClipboardList, FileSignature, Handshake, Layers3 } from 'lucide-react';

// Homepage "Services" content — deliberately separate from `directions.ts`. That file answers
// "what do we build"; this one answers "how can we participate in a project" (engagement format).
// Keeping them as two data shapes, not two views of the same five directions, is the fix for the
// duplication the content audit found between the old Services/Directions/`/napryamky` copy.
export type EngagementFormat = {
  number: string;
  title: string;
  text: string;
  icon: LucideIcon;
};

export const engagementFormats: readonly EngagementFormat[] = [
  {
    number: '01',
    title: 'Комплексний обсяг робіт',
    text: 'Беремо на себе погоджений комплекс будівельних робіт у межах одного об’єкта та координуємо послідовність етапів.',
    icon: Layers3,
  },
  {
    number: '02',
    title: 'Окремий етап робіт',
    text: 'Долучаємось до визначеної частини проєкту — наприклад, металоконструкцій, бетонних або покрівельних робіт.',
    icon: ClipboardList,
  },
  {
    number: '03',
    title: 'Підряд або субпідряд',
    text: 'Працюємо в межах погодженого обсягу робіт як підрядник або субпідрядник у складі більшого проєкту.',
    icon: Handshake,
  },
  {
    number: '04',
    title: 'Робота за наявною документацією',
    text: 'Можемо виконувати погоджений обсяг робіт за наявною проєктною або робочою документацією, уточнивши вихідні дані та технічні вимоги до початку робіт.',
    icon: FileSignature,
  },
] as const;
