import { CalendarClock, Factory, MapPin, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ProcessCard = {
  number: string;
  title: string;
  text: string;
  icon: LucideIcon;
};

// The homepage's quick brief checklist. The five-step «how we work» list that used to live here is
// gone: the process is the Delivery Model's eight stages, and they live on /yak-pratsyuiemo.
const estimateItems: readonly ProcessCard[] = [
  { number: '01', title: 'Призначення', text: 'Що планується всередині: виробництво, склад, техніка, зерно або інше завдання.', icon: Factory },
  { number: '02', title: 'Орієнтовні розміри', text: 'Довжина, ширина, висота та необхідні прольоти. Для першої оцінки достатньо попередніх даних.', icon: Ruler },
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
