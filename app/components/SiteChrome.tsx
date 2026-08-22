import Image from 'next/image';
import Link from 'next/link';

export function Brand() {
  return (
    <span className="brand" aria-label="RUBICON BUILD">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-pillar pillar-left" />
        <span className="brand-pillar pillar-right" />
        <span className="brand-crossing" />
        <span className="brand-deck" />
      </span>
      <span className="brand-name">
        <b><span>RUBICON</span> <em>BUILD</em></b>
        <small>Family steel construction</small>
      </span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-wrap">
        <Link className="brand-link" href="/#top" aria-label="RUBICON BUILD — на головну">
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
        <Link className="brand-link" href="/#top" aria-label="RUBICON BUILD — на головну">
          <Brand />
        </Link>
        <p>Металоконструкції та промислове будівництво</p>
        <span>© {new Date().getFullYear()} RUBICON BUILD</span>
      </div>
    </footer>
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
              <Image src="/images/founder.png" alt="Леус Сергій Іванович — засновник будівельного напрямку RUBICON BUILD" fill sizes="(max-width: 700px) 100vw, 40vw" />
            </div>
            <div className="person-info">
              <span>Засновник / керівник будівельного напрямку</span>
              <h3>Леус Сергій<br />Іванович</h3>
              <p>Понад 30 років практичного досвіду, організація робіт і особистий контроль якості на майданчику.</p>
            </div>
          </article>
          <article className="person-card">
            <div className="person-photo">
              <Image src="/images/next-generation.png" alt="Леус Дмитро Сергійович — інженер RUBICON BUILD" fill sizes="(max-width: 700px) 100vw, 40vw" />
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
  text = 'Опишіть тип об’єкта, орієнтовні розміри та бажані строки. Ми поставимо правильні запитання й запропонуємо наступний крок.',
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
