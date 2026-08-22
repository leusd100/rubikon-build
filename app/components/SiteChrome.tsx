import Image from 'next/image';
import Link from 'next/link';

export function Brand() {
  return (
    <span className="brand" aria-label="RUBIKON BUILD — Construction and Engineering">
      <span className="brand-slash" aria-hidden="true" />
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
          <Link href="/metalokonstruktsii">Металоконструкції</Link>
          <Link href="/angary">Ангари</Link>
          <Link href="/pro-nas">Про нас</Link>
        </nav>
        <Link className="header-cta" href="/#contact">
          Оцінити проєкт <span aria-hidden="true">↗</span>
        </Link>
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
          <Link href="/pro-nas">Про нас</Link>
          <Link href="/#contact">Контакти</Link>
        </nav>
        <span>© {new Date().getFullYear()} RUBIKON BUILD</span>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href: string }> }) {
  const baseUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';
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
  const items = [
    ['01', 'Призначення', 'Що планується всередині: виробництво, склад, техніка, зерно або інша задача.'],
    ['02', 'Орієнтовні розміри', 'Довжина, ширина, висота та необхідні прольоти — навіть якщо дані поки попередні.'],
    ['03', 'Місце будівництва', 'Місто або область, стан майданчика та наявність під’їзду для техніки.'],
    ['04', 'Бажані строки', 'Коли плануєте почати роботи та коли об’єкт має бути готовим до використання.'],
  ];

  return (
    <section className="estimate-brief section" id="estimate-brief">
      <div className="shell">
        <div className="page-heading split-heading">
          <div>
            <p className="eyebrow"><span /> Для першої оцінки</p>
            <h2>Чотири речі, з яких починається предметна розмова.</h2>
          </div>
          <p>Не обов’язково мати готовий проєкт. Надішліть базові параметри — ми уточнимо, яких вихідних даних бракує для наступного кроку.</p>
        </div>
        <div className="brief-grid">
          {items.map(([number, title, text]) => (
            <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
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
        <div className="section-head compact">
          <p className="eyebrow"><span /> Люди за результатом</p>
          <h2>Досвід двох поколінь</h2>
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
  title = 'Маєте будівельну задачу? Обговорімо її.',
  text = 'Опишіть тип об’єкта, орієнтовні розміри та бажані строки. Ми уточнимо вихідні дані й запропонуємо наступний крок.',
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
