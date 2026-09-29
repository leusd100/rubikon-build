import { CalendarClock, Factory, MapPin, Phone, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import ResponsiveImage from './ResponsiveImage';
import { GhostWord, SectionHeader } from './SiteChrome';
import { company, companyContactLinks } from '../data/company';
import type { HomeProofCase } from '../data/homeProof';
import { siteRoutes } from '../data/navigation';

// The HOME blocks that carry the «спроможність → прозорість → перша розмова» argument. Copy that comes from the
// frozen Delivery Model is read from it (never retyped); the rest is HOME's own wording and adds no fact the
// model or the owner has not stated. See 00_control/home-review-v0.1/HOME_SLICE_02_ARCHITECTURE.md.


/**
 * A calm contact line inside a section, at the point where the visitor's intent rises. Not a section and never
 * sticky: the call is the first action, writing a request the second (the Slice 01 hierarchy).
 */
export function ContactBridge({ children }: Readonly<{ children: ReactNode }>) {
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
export function HomeProofSlot({ proof }: Readonly<{ proof: HomeProofCase | null }>) {
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

// HOME introduces the team's work and invites the visitor to describe their task. Detailed responsibility and
// participation formats live on /yak-pratsyuiemo, where there is room to explain their P01 boundaries.
export function HomeCapability({ proof }: Readonly<{ proof: HomeProofCase | null }>) {
  return (
    <section className="services section ghost-section" id="services">
      <GhostWord word="BUILD" />
      <div className="shell">
        <SectionHeader
          eyebrow="Будівельні роботи"
          title="Будівельні роботи під вашу задачу"
          supporting="Кожен об’єкт має свої умови. Розкажіть, що плануєте, — після розмови й перегляду матеріалів визначимо, як RUBIKON може долучитися."
        />
        <div className="capability-overview">
          <div>
            <p className="capability-kicker">Досвід команди</p>
            <h3>Від фундаменту до покрівлі</h3>
            <p>Виконуємо бетонні роботи й типові фундаменти, монтуємо металоконструкції, стінові та покрівельні панелі, робимо покрівлі. Можемо обговорити будівництво об’єкта або окремий етап робіт.</p>
          </div>
          <div>
            <p className="capability-kicker">Перший крок</p>
            <h3>Розкажіть про свій об’єкт</h3>
            <p>Не потрібно заздалегідь обирати формат чи розподіляти роботи між виконавцями. Обговоримо вашу задачу, те, що вже підготовлено, і бажаний результат. Тоді скажемо, який обсяг можемо взяти на себе та що потрібно для наступного кроку.</p>
          </div>
        </div>
        <HomeProofSlot proof={proof} />
        <a className="section-link" href={`${siteRoutes.process}#khto-vykonuie`}>Як узгоджуємо склад робіт <span aria-hidden="true">↗</span></a>
        <ContactBridge>
          Маєте задум або готовий проєкт? Розкажіть про нього — разом визначимо можливий обсяг нашої участі.
        </ContactBridge>
      </div>
    </section>
  );
}

// Facts that help the first conversation. Soft type on purpose — no numbers, no «step» look — so it reads as a
// prompt, not a form the visitor has to complete.
const prepHints: readonly { text: string; icon: LucideIcon }[] = [
  { text: 'призначення об’єкта й орієнтовні розміри;', icon: Factory },
  { text: 'місто або область, інформація про майданчик;', icon: MapPin },
  { text: 'бажаний час початку робіт;', icon: CalendarClock },
  { text: 'концепція, креслення або робоча документація.', icon: Ruler },
];

// A first conversation, from describing the task to a scope and estimate when project data suffices.
const nextSteps: readonly { title: string; text: string }[] = [
  { title: 'Уточнюємо задачу', text: 'Обговорюємо, для чого потрібен об’єкт, які роботи вас цікавлять і де планується будівництво. Скажемо, чи це наш профіль.' },
  { title: 'Дивимося, що вже є', text: 'Переглядаємо ваш опис, параметри, креслення чи проєкт. Якщо даних бракує, пояснюємо, що потрібно підготувати. Проєкт надаєте ви або ваш окремий проєктувальник; за потреби можемо порадити спеціаліста.' },
  { title: 'Узгоджуємо склад робіт', text: 'Визначаємо, яку будівельну частину RUBIKON може взяти на себе та як вона має узгоджуватися з проєктом і роботами інших виконавців.' },
  { title: 'Готуємо кошторис', text: 'Коли склад робіт визначено й проєктних даних достатньо, готуємо кошторис погодженого обсягу. Якщо даних поки недостатньо, скажемо, чого саме бракує для розрахунку.' },
];

// One block for «з чим прийти» and «що буде далі»: it replaces the process teaser, the estimate brief and the
// «Що у вас уже є» axis. The old ids stay as anchors on the two columns.
export function HomeFirstConversation() {
  return (
    <section className="first-conversation section" id="first-conversation">
      <div className="shell page-two-col align-start">
        <div className="copy-column first-conversation-prepare" id="estimate-brief">
          <p className="eyebrow"><span /> Перша розмова</p>
          <h2>Що підготувати до першої розмови</h2>
          <p><strong>Нічого не обов’язково.</strong> Можете звернутися з ідеєю майбутнього об’єкта або вже з готовим проєктом. Достатньо коротко розповісти, що потрібно побудувати чи які роботи виконати.</p>
          <p className="prep-intro">Якщо вже маєте матеріали, вони допоможуть розмові:</p>
          <ul className="prep-list">
            {prepHints.map(({ text, icon: Icon }) => (
              <li key={text}>
                <Icon className="prep-icon" aria-hidden="true" />
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <p className="first-conversation-call">Не потрібно збирати все це перед зверненням. Уточнимо, що необхідно саме для вашої задачі.</p>
        </div>
        <div className="first-conversation-next" id="how-we-work">
          <h3>Що буде після звернення</h3>
          <dl className="next-list">
            {nextSteps.map(({ title, text }) => (
              <div key={title}>
                <dt>{title}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <p className="next-note"><strong>Почнемо з розмови.</strong> Розкажіть коротко про завдання — допоможемо визначити наступний крок.</p>
          <div className="contact-bridge-actions">
            <a className="contact-bridge-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}><Phone aria-hidden="true" /> <span>{company.phone.display}</span></a>
            <a className="section-link" href={siteRoutes.contact}>Або залишити запит <span aria-hidden="true">↗</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
