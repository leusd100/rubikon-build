/* eslint-disable @next/next/no-html-link-for-pages -- regular anchors avoid the hosted vinext Link runtime failure */
import Image from 'next/image';
import { CalendarClock, Factory, MapPin, Phone, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { CookieSettingsButton } from './AnalyticsConsent';
import MobileMenu from './MobileMenu';
import ViberContactButton from './ViberContactButton';

const messengerLinks: Array<{ label: string; href: string; icon: string; shortName: string; kind: string }> = [
  { label: 'Написати в Telegram', href: 'tg://resolve?phone=380682614264', icon: '/brands/telegram.svg', shortName: 'TG', kind: 'telegram' },
  { label: 'Написати у WhatsApp', href: 'https://wa.me/380682614264', icon: '/brands/whatsapp.svg', shortName: 'WA', kind: 'whatsapp' },
];

export function MessengerLinks({ className }: { className: string }) {
  return (
    <div className={className} role="group" aria-label="Месенджери RUBIKON BUILD">
      {messengerLinks.map(({ label, href, icon, shortName, kind }) => (
        <a
          className={`messenger-link messenger-${kind}`}
          href={href}
          key={kind}
          data-contact-method={kind}
          aria-label={label}
          title={label}
          target={href.startsWith('https://') ? '_blank' : undefined}
          rel={href.startsWith('https://') ? 'noreferrer' : undefined}
        >
          <Image className="messenger-brand-icon" src={icon} width={24} height={24} alt="" aria-hidden="true" />
          <span>{shortName}</span>
        </a>
      ))}
      <ViberContactButton />
    </div>
  );
}

export function Brand() {
  return (
    <span className="brand" aria-label="RUBIKON BUILD — Construction and Engineering">
      <span className="brand-module-mark" aria-hidden="true"><i /><i /><b /></span>
      <span className="brand-name">
        <b><span>RUBIKON</span> <em>BUILD</em></b>
        <small>Construction &amp; Engineering</small>
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-wrap">
        <a className="brand-link" href="/" aria-label="RUBIKON BUILD — на головну">
          <Brand />
        </a>
        <nav className="desktop-nav" aria-label="Основна навігація">
          <a href="/napryamky">Напрямки</a>
          <a href="/#process">Як працюємо</a>
          <a href="/pro-nas">Про компанію</a>
          <a href="/#contact">Контакти</a>
        </nav>
        <div className="header-contacts" aria-label="Контакти компанії">
          <a className="header-contact header-phone" href="tel:+380682614264" aria-label="Зателефонувати до RUBIKON BUILD">
            <Phone aria-hidden="true" />
            <span><small>Телефон</small><strong>+38 068 261 42 64</strong></span>
          </a>
          <MessengerLinks className="header-messengers" />
        </div>
        <MobileMenu>
          <summary aria-label="Відкрити або закрити меню">
            <span>Меню</span>
            <i aria-hidden="true"><b /><b /></i>
          </summary>
          <nav aria-label="Мобільна навігація">
            <a href="/napryamky"><small>01</small> Напрямки</a>
            <a href="/#process"><small>02</small> Як працюємо</a>
            <a href="/pro-nas"><small>03</small> Про компанію</a>
            <a href="/#contact"><small>04</small> Контакти</a>
            <MessengerLinks className="mobile-messengers" />
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="shell footer-grid">
        <a className="brand-link" href="/" aria-label="RUBIKON BUILD — на головну">
          <Brand />
        </a>
        <nav className="footer-nav" aria-label="Навігація у підвалі">
          <a href="/napryamky">Напрямки</a>
          <a href="/#process">Як працюємо</a>
          <a href="/pro-nas">Про компанію</a>
          <a href="/#contact">Контакти</a>
        </nav>
        <div className="footer-contact-stack">
          <a className="footer-phone" href="tel:+380682614264">
            <Phone aria-hidden="true" />
            <span>+38 068 261 42 64</span>
          </a>
          <MessengerLinks className="footer-messengers" />
          <div className="footer-legal">
            <a href="/polityka-konfidentsiinosti">Політика конфіденційності</a>
            <CookieSettingsButton />
          </div>
          <span>© {new Date().getFullYear()} RUBIKON BUILD</span>
        </div>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href: string }> }) {
  const baseUrl = 'https://rubikonbuild.com';
  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: new URL(item.href, baseUrl).toString(),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      <nav className="breadcrumb" aria-label="Навігаційний шлях">
        {items.map((item, index) => (
          <span key={item.href}>
            {index > 0 && <i aria-hidden="true">/</i>}
            {index === items.length - 1 ? <b>{item.label}</b> : <a href={item.href}>{item.label}</a>}
          </span>
        ))}
      </nav>
    </>
  );
}

export function EstimateBrief() {
  const items: Array<[string, string, string, LucideIcon]> = [
    ['01', 'Призначення', 'Що планується всередині: виробництво, склад, техніка, зерно або інша задача.', Factory],
    ['02', 'Орієнтовні розміри', 'Довжина, ширина, висота та необхідні прольоти — навіть якщо дані поки попередні.', Ruler],
    ['03', 'Місце будівництва', 'Місто або область, стан майданчика та наявність під’їзду для техніки.', MapPin],
    ['04', 'Бажані строки', 'Коли плануєте почати роботи та коли об’єкт має бути готовим до використання.', CalendarClock],
  ];

  return (
    <section className="estimate-brief section" id="estimate-brief">
      <div className="shell">
        <div className="page-heading split-heading">
          <div>
            <p className="eyebrow"><span /> Для першої оцінки</p>
            <h2>Чотири речі, з яких починається предметна розмова</h2>
          </div>
          <p>Не обов’язково мати готовий проєкт. Надішліть базові параметри — ми уточнимо, яких вихідних даних бракує для наступного кроку.</p>
        </div>
        <div className="brief-grid">
          {items.map(([number, title, text, Icon]) => (
            <article key={number}>
              <span>{number}</span>
              <Icon className="brief-icon" aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
        <a className="section-link" href="/#contact">Підготувати запит <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}

export function TeamSection({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`team section${compact ? ' team-compact' : ''}`}>
      <div className="shell">
        <div className="section-head section-head-balanced team-heading">
          <div className="section-heading-copy">
            <p className="eyebrow"><span /> Родина в основі компанії</p>
            <h2 className="team-heading-title"><span>Два покоління</span><em>Одна справа</em></h2>
          </div>
          <p>
            Два покоління об’єднали понад 30 років практичного досвіду та сучасний
            інженерний підхід. Родинна відповідальність для нас — це особисте слово
            за якість, надійність і результат кожного проєкту.
          </p>
        </div>
        <div className="team-grid">
          <article className="person-card">
            <div className="person-photo">
              <Image src="/images/founder.png" alt="Леус Сергій Іванович — засновник будівельного напрямку RUBIKON BUILD" fill sizes="(max-width: 700px) 100vw, 40vw" />
            </div>
            <div className="person-info">
              <span>Засновник / керівник будівельного напрямку</span>
              <h3>Леус Сергій<br />Іванович</h3>
              <p>Понад 30 років практичного досвіду, організація робіт і особистий контроль якості на майданчику.</p>
            </div>
          </article>
          <article className="person-card">
            <div className="person-photo">
              <Image src="/images/next-generation.png" alt="Леус Дмитро Сергійович — інженер RUBIKON BUILD" fill sizes="(max-width: 700px) 100vw, 40vw" />
            </div>
            <div className="person-info">
              <span>Інженер / розвиток компанії</span>
              <h3>Леус Дмитро<br />Сергійович</h3>
              <p>Фахова освіта у сфері цивільного та промислового будівництва, сучасна комунікація й системний підхід.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function PageCta({
  eyebrow = 'Почнемо з розмови',
  title = 'Маєте будівельну задачу? Обговорімо її',
  text = 'Опишіть об’єкт або окремий етап робіт, орієнтовні розміри та бажані строки. Ми уточнимо вихідні дані й запропонуємо наступний крок.',
}: {
  eyebrow?: string;
  title?: string;
  text?: string;
}) {
  return (
    <section className="page-cta section">
      <div className="shell page-cta-grid">
        <div>
          <p className="eyebrow light"><span /> {eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div>
          <p>{text}</p>
          <a className="button button-primary" href="/#contact">
            Обговорити проєкт <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
