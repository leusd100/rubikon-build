import { CalendarClock, Factory, MapPin, Phone, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EngagementFormatCards, EntryPointsNote } from './DirectionCards';
import ResponsiveImage from './ResponsiveImage';
import { GhostWord, SectionHeader } from './SiteChrome';
import { company, companyContactLinks } from '../data/company';
import { deliveryModel } from '../data/deliveryModel';
import type { HomeProofCase } from '../data/homeProof';
import { siteRoutes } from '../data/navigation';
import { entryPoints } from '../lib/deliveryModelPresentation';

// The HOME blocks that carry the «спроможність → прозорість → перша розмова» argument. Copy that comes from the
// frozen Delivery Model is read from it (never retyped); the rest is HOME's own wording and adds no fact the
// model or the owner has not stated. See 00_control/home-review-v0.1/HOME_SLICE_02_ARCHITECTURE.md.

const { statements } = deliveryModel;

// Who does the work — the model's three layers, in HOME's own words. «Виготовлення» sits under «залежно від
// проєкту» on purpose: the owner confirmed metal may be made in-house or at an organised outside producer, so
// nothing here says the whole chain is always done by our own team.
const capabilityColumns: readonly { id: string; title: string; items: readonly string[] }[] = [
  {
    id: 'own',
    title: 'Виконує наша команда',
    items: ['Бетонні роботи та фундаменти', 'Роботи з металоконструкціями', 'Монтаж конструкцій і панелей', 'Покрівлі'],
  },
  {
    id: 'depends',
    title: 'Залежно від проєкту',
    items: [
      'Виготовлення металоконструкцій — власне або на організованому зовнішньому виробництві',
      'Огородження, ворота, промислові підлоги та інші будівельні роботи — власною командою або профільним виконавцем',
    ],
  },
  {
    id: 'partners',
    title: 'Профільні виконавці',
    items: ['Проєктування', 'Інженерні мережі й комунікації', 'Вентиляція й благоустрій', 'Спеціальні системи й технологічне обладнання'],
  },
];

/**
 * A calm contact line inside a section, at the point where the visitor's intent rises. Not a section and never
 * sticky: the call is the first action, writing a request the second (the Slice 01 hierarchy).
 */
export function ContactBridge({ children }: { children: ReactNode }) {
  return (
    <div className="contact-bridge">
      <p>{children}</p>
      <div className="contact-bridge-actions">
        <a className="contact-bridge-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
          <Phone aria-hidden="true" />
          <span>{company.phone.display}</span>
        </a>
        <a className="section-link" href={siteRoutes.contact}>Або залишити запит <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  );
}

/**
 * The slot for one real, approved project. Renders nothing while `proof` is null, so HOME never carries an empty
 * frame or a «coming soon» note. The figure is also the mount point for the later `REAL PHOTO → ENGINEERING
 * EXPLANATION` interaction — that interaction is not part of this slice.
 */
export function HomeProofSlot({ proof }: { proof: HomeProofCase | null }) {
  if (!proof) return null;
  const { photo, scope } = proof;
  return (
    <figure className="home-proof">
      <div className="home-proof-media" style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
        <ResponsiveImage src={photo.src} alt={photo.alt} sizes="(max-width: 1050px) 100vw, 60vw" />
      </div>
      <figcaption className="home-proof-body">
        <p className="eyebrow"><span /> Реальний об’єкт</p>
        <p className="home-proof-caption">{proof.caption}</p>
        <p className="home-proof-attribution">{proof.attribution}</p>
        <div className="home-proof-scope">
          <div>
            <h3>Виконала наша команда</h3>
            <ul>{scope.ours.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          {scope.others && scope.others.length > 0 && (
            <div>
              <h3>Виконали інші</h3>
              <ul>{scope.others.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
        {proof.context && <p className="home-proof-context">{proof.context}</p>}
      </figcaption>
    </figure>
  );
}

// «Що виконуємо самі, а що координуємо»: capability first, then — only if one exists — the proof, then the three
// formats of participation. The formats used to be the whole block; they are now the second half of it.
export function HomeCapability({ proof }: { proof: HomeProofCase | null }) {
  return (
    <section className="services section ghost-section" id="services">
      <GhostWord word="BUILD" />
      <div className="shell">
        <SectionHeader
          eyebrow="Хто що виконує"
          title="Що виконуємо самі, а що координуємо"
          supporting={`Комплексна реалізація можлива — її склад залежить від проєкту й договору. ${statements.boundary}`}
        />
        <div className="capability-ledger">
          {capabilityColumns.map((column) => (
            <div className={`capability-${column.id}`} key={column.id}>
              <h3>{column.title}</h3>
              <ul>{column.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </div>
        <HomeProofSlot proof={proof} />
        <p className="capability-subtitle">Формат участі</p>
        <EngagementFormatCards />
        <a className="section-link" href={`${siteRoutes.process}#khto-vykonuie`}>Хто за що відповідає — докладно <span aria-hidden="true">↗</span></a>
        <ContactBridge>
          Схожа задача? Розкажіть коротко — скажемо, чи вона в нашому профілі й у якому форматі ми можемо бути корисними.
        </ContactBridge>
      </div>
    </section>
  );
}

// Facts that help the first conversation. Soft type on purpose — no numbers, no «step» look — so it reads as a
// prompt, not a form the visitor has to complete.
const prepHints: readonly { title: string; text: string; icon: LucideIcon }[] = [
  { title: 'Призначення', text: 'Що планується всередині: виробництво, склад, техніка, зерно чи інше.', icon: Factory },
  { title: 'Орієнтовні розміри', text: 'Довжина, ширина, висота, прольоти — достатньо попередніх цифр.', icon: Ruler },
  { title: 'Місце', text: 'Місто або область, стан майданчика та під’їзд для техніки.', icon: MapPin },
  { title: 'Бажані строки', text: 'Коли плануєте почати й коли об’єкт має бути готовим.', icon: CalendarClock },
];

// What happens next and who decides what. Every line restates the frozen model (firstContact, stage 01, stage 04,
// the design statement, the design-docs start note); none of it promises a time, a price or a visit.
const nextSteps: readonly { title: string; text: string }[] = [
  { title: 'Що робимо ми', text: 'Ставимо уточнювальні питання й чесно кажемо, чи задача в нашому профілі та в якому форматі ми можемо бути корисними.' },
  { title: 'Що вирішуєте ви', text: 'Який формат участі вам потрібен; погоджуєте концепцію, склад робіт, виключення та припущення.' },
  { title: 'Технічні рішення', text: 'Проєктування виконує профільна проєктна організація; RUBIKON координує будівельні рішення й стики в погодженому обсязі.' },
  { title: 'Коли з’являється ціна', text: 'Кошторис — коли зібрано вихідні дані й погоджено концепцію, яку можна порахувати. Бюджет і строки залежать від параметрів об’єкта, умов майданчика та організації виконання.' },
];

// One block for «з чим прийти» and «що буде далі»: it replaces the process teaser, the estimate brief and the
// «Що у вас уже є» axis. The old ids stay as anchors on the two columns.
export function HomeFirstConversation() {
  const docsPoint = entryPoints().find((point) => point.startNote);
  const lowerFirst = (text: string) => text.charAt(0).toLocaleLowerCase('uk') + text.slice(1);
  return (
    <section className="first-conversation section" id="first-conversation">
      <div className="shell page-two-col align-start">
        <div className="copy-column first-conversation-prepare" id="estimate-brief">
          <p className="eyebrow"><span /> Перша розмова</p>
          <h2>Що підготувати до першої розмови</h2>
          <p>Нічого не обов’язково. Достатньо розповісти, для чого потрібен об’єкт, — решту уточнимо разом.</p>
          <EntryPointsNote />
          <p className="prep-intro">Якщо вже відомо — скажіть, це допоможе розмові. Якщо ні — це нормально:</p>
          <ul className="prep-list">
            {prepHints.map(({ title, text, icon: Icon }) => (
              <li key={title}>
                <Icon className="prep-icon" aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="first-conversation-call">
            Не знаєте, з чого почати? Зателефонуйте — розберемося разом.{' '}
            <a className="contact-bridge-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
              <Phone aria-hidden="true" />
              <span>{company.phone.display}</span>
            </a>
          </p>
        </div>
        <div className="first-conversation-next" id="how-we-work">
          <h3>Що буде після звернення</h3>
          <p className="next-lead">{statements.firstContact}</p>
          <dl className="next-list">
            {nextSteps.map(({ title, text }) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          {docsPoint?.startNote && <p className="next-note">Якщо вже є {lowerFirst(docsPoint.label)}, {lowerFirst(docsPoint.startNote)}</p>}
          <a className="section-link" href={siteRoutes.process}>Модель роботи: формати, етапи, відповідальність, документи <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
