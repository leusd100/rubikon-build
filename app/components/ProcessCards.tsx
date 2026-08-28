import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  Factory,
  Handshake,
  HardHat,
  MapPin,
  Ruler,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ProcessCard = {
  number: string;
  title: string;
  text: string;
  icon: LucideIcon;
};

const projectSteps: readonly ProcessCard[] = [
  { number: '01', title: 'Знайомство', text: 'Уточнюємо завдання, тип об’єкта, умови та бажаний результат.', icon: Handshake },
  { number: '02', title: 'Виїзд і заміри', text: 'Оглядаємо майданчик, фіксуємо обсяги та технічні особливості.', icon: Ruler },
  { number: '03', title: 'Рішення та кошторис', text: 'Готуємо пропозицію з переліком робіт, строками й бюджетом.', icon: ClipboardList },
  { number: '04', title: 'Виготовлення і монтаж', text: 'Організовуємо процес та контролюємо якість ключових етапів.', icon: HardHat },
  { number: '05', title: 'Перевірка й приймання', text: 'Разом перевіряємо результат і приймаємо виконані роботи.', icon: BadgeCheck },
];

const estimateItems: readonly ProcessCard[] = [
  { number: '01', title: 'Призначення', text: 'Що планується всередині: виробництво, склад, техніка, зерно або інше завдання.', icon: Factory },
  { number: '02', title: 'Орієнтовні розміри', text: 'Довжина, ширина, висота та необхідні прольоти — навіть якщо дані поки попередні.', icon: Ruler },
  { number: '03', title: 'Місце будівництва', text: 'Місто або область, стан майданчика та наявність під’їзду для техніки.', icon: MapPin },
  { number: '04', title: 'Бажані строки', text: 'Коли плануєте почати роботи та коли об’єкт має бути готовим до використання.', icon: CalendarClock },
];

function CardContent({ item, iconClassName }: { item: ProcessCard; iconClassName: string }) {
  const Icon = item.icon;

  return (
    <>
      <span>{item.number}</span>
      <Icon className={iconClassName} aria-hidden="true" />
      <h3>{item.title}</h3>
      <p>{item.text}</p>
    </>
  );
}

export function ProjectProcessSteps() {
  return (
    <ol className="steps">
      {projectSteps.map((item) => (
        <li key={item.number}>
          <CardContent item={item} iconClassName="step-icon" />
        </li>
      ))}
    </ol>
  );
}

export function EstimateBriefCards() {
  return (
    <ol className="estimate-list">
      {estimateItems.map((item) => (
        <li key={item.number}>
          <CardContent item={item} iconClassName="brief-icon" />
        </li>
      ))}
    </ol>
  );
}
