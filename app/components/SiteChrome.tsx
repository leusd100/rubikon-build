import Image from 'next/image';
import Link from 'next/link';
import { CalendarClock, Factory, Mail, MapPin, Phone, Ruler } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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
        <Link className="brand-link" href="/#top" aria-label="RUBIKON BUILD — на головну">
          <Brand />
        </Link>
        <nav className="desktop-nav" aria-label="Основна навігація">
          <Link href="/napryamky">Напрямки</Link>
          <Link href="/#process">Як працюємо</Link>
          <Link href="/pro-nas">Про компанію</Link>
          <Link href="/#contact">Контакти</Link>
        </nav>
        <div className="header-contacts" aria-label="Контакти компанії">
          <Link className="header-contact" href="/#contact" aria-label="Перейти до телефону компанії">
            <Phone aria-hidden="true" />
            <span><small>Телефон</small><strong>буде додано</strong></span>
          </Link>
          <Link className="header-contact" href="/#contact" aria-label="Перейти до електронної пошти компанії">
            <Mail aria-hidden="true" />
            <span><small>Email</small><strong>буде додано</strong></span>
          </Link>
        </div>
        <details className="mobile-menu">
          <summary aria-label="Відкрити меню">
            <span>Меню</span>
            <i aria-hidden="true"><b /><b /></i>
          </summary>
          <nav aria-label="Мобільна навігація">
            <Link href="/napryamky"><small>01</small> Напрямки</Link>
            <Link href="/#process"><small>02</small> Як працюємо</Link>
            <Link href="/pro-nas"><small>03</small> Про компанію</Link>
            <Link href="/#contact"><small>04</small> Контакти</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="shell footer-grid">
        <Link className="brand-link" href="/#top" aria-label="RUBIKON BUILD — на головну">
          <Brand />
        </Link>
        <nav className="footer-nav" aria-label="Навігація у підвалі">
          <Link href="/napryamky">Напрямки</Link>
          <Link href="/#process">Як працюємо</Link>
          <Link href="/pro-nas">Про компанію</Link>
          <Link href="/#contact">Контакти</Link>
        </nav>
        <span>© {new Date().getFullYear()} RUBIKON BUILD</span>
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
            {index === items.length - 1 ? <b>{item.label}</b> : <Link href={item.href}>{item.label}</Link>}
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
        <Link className="section-link" href="/#contact">Підготувати запит <span aria-hidden="true">↗</span></Link>
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
          <Link className="button button-primary" href="/#contact">
            Перейти до контактів <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
