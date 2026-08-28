import Image from 'next/image';
import { Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { CookieSettingsButton } from './AnalyticsConsent';
import MobileMenu from './MobileMenu';
import { EstimateBriefCards } from './ProcessCards';
import ViberContactButton from './ViberContactButton';
import { company, companyContactLinks } from '../data/company';
import { messengerContacts } from '../data/contactMethods';
import { primaryNavigation, siteRoutes } from '../data/navigation';

const messengerLinks = [
  ['telegram', messengerContacts.telegram],
  ['whatsapp', messengerContacts.whatsapp],
] as const;

export function MessengerLinks({ className }: { className: string }) {
  return (
    <div className={className} role="group" aria-label={`Месенджери ${company.name}`}>
      {messengerLinks.map(([kind, { label, href, icon, shortName }]) => (
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
    <span className="brand" aria-label={`${company.name} — Construction and Engineering`}>
      <span className="brand-module-mark" aria-hidden="true"><i /><i /><b /></span>
      <span className="brand-name">
        <b><span>RUBIKON</span> <em>BUILD</em></b>
        <small>Construction &amp; Engineering</small>
      </span>
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  supporting,
  inverse = false,
  className = '',
}: {
  eyebrow: string;
  title: ReactNode;
  supporting: ReactNode;
  inverse?: boolean;
  className?: string;
}) {
  return (
    <div className={`section-header${inverse ? ' section-header-inverse' : ''}${className ? ` ${className}` : ''}`}>
      <div className="section-header-copy">
        <p className={`eyebrow${inverse ? ' light' : ''}`}><span /> {eyebrow}</p>
        <h2>{title}</h2>
      </div>
      <p className="section-header-support">{supporting}</p>
    </div>
  );
}

export function SectionDivider({
  variant = 'neutral',
}: {
  variant?: 'accent' | 'neutral' | 'dark' | 'inverse';
}) {
  return <div className={`section-divider section-divider-${variant}`} aria-hidden="true" />;
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell nav-wrap">
        <a className="brand-link" href={siteRoutes.home}>
          <Brand />
        </a>
        <nav className="desktop-nav" aria-label="Основна навігація">
          {primaryNavigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="header-contacts" aria-label="Контакти компанії">
          <a className="header-contact header-phone" href={companyContactLinks.phone} aria-label={`Телефон ${company.phone.display} — зателефонувати`}>
            <Phone aria-hidden="true" />
            <span><small>Телефон</small><strong>{company.phone.display}</strong></span>
          </a>
          <MessengerLinks className="header-messengers" />
        </div>
        <MobileMenu>
          <summary aria-label="Відкрити або закрити меню">
            <span>Меню</span>
            <i aria-hidden="true"><b /><b /></i>
          </summary>
          <nav aria-label="Мобільна навігація">
            {primaryNavigation.map((item, index) => (
              <a href={item.href} key={item.href}><small>{String(index + 1).padStart(2, '0')}</small> {item.label}</a>
            ))}
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
      <SectionDivider variant="accent" />
      <div className="shell footer-grid">
        <a className="brand-link" href={siteRoutes.home}>
          <Brand />
        </a>
        <nav className="footer-nav" aria-label="Навігація у підвалі">
          {primaryNavigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="footer-contact-stack">
          <a className="footer-phone" href={companyContactLinks.phone}>
            <Phone aria-hidden="true" />
            <span>{company.phone.display}</span>
          </a>
          <MessengerLinks className="footer-messengers" />
          <div className="footer-legal">
            <a href={siteRoutes.privacy}>Політика конфіденційності</a>
            <CookieSettingsButton />
          </div>
          <span>© {new Date().getFullYear()} {company.name}</span>
        </div>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href: string }> }) {
  const baseUrl = company.siteUrl;
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
  return (
    <section className="estimate-brief section" id="estimate-brief">
      <div className="shell">
        <SectionHeader
          className="page-heading"
          eyebrow="Для першої оцінки"
          title="Що потрібно для першої оцінки"
          supporting="Не обов’язково мати готовий проєкт. Надішліть базові параметри — ми уточнимо, яких вихідних даних бракує для наступного кроку."
        />
        <EstimateBriefCards />
        <a className="section-link" href={siteRoutes.contact}>Підготувати запит <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}

export function TeamSection({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`team section${compact ? ' team-compact' : ''}`}>
      <div className="shell">
        <SectionHeader
          className="team-heading"
          eyebrow="Родина в основі компанії"
          title="Родинна компанія. Досвід двох поколінь."
          supporting="Поєднуємо понад 30 років практичного досвіду з сучасним підходом до розвитку компанії, комунікації та організації роботи."
        />
        <div className="team-stories">
          <article className="person-story">
            <div className="person-photo">
              <Image src="/images/founder.webp" alt={`${company.founders[0]} — засновник і керівник будівельного напряму ${company.name}`} fill sizes="(max-width: 760px) 100vw, 47vw" />
            </div>
            <div className="person-info">
              <span>ЗАСНОВНИК / КЕРІВНИК БУДІВЕЛЬНОГО НАПРЯМУ</span>
              <h3>Леус Сергій Іванович</h3>
              <p>Понад 30 років у будівництві. Практичний досвід організації робіт, управління командами та контролю якості безпосередньо на об’єктах.</p>
            </div>
          </article>
          <article className="person-story person-story-reverse">
            <div className="person-info">
              <span>РОЗВИТОК КОМПАНІЇ / РОБОТА З КЛІЄНТАМИ</span>
              <h3>Леус Дмитро Сергійович</h3>
              <p>Розвиток Rubikon Build, комунікація з клієнтами, цифрові процеси та системний підхід до організації роботи компанії.</p>
            </div>
            <div className="person-photo">
              <Image src="/images/next-generation.webp" alt={`${company.founders[1]} — розвиток компанії та робота з клієнтами ${company.name}`} fill sizes="(max-width: 760px) 100vw, 47vw" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function PageCta({
  eyebrow = 'Почнемо з розмови',
  title = 'Маєте будівельне завдання? Обговорімо його',
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
          <a className="button button-primary" href={siteRoutes.contact}>
            Обговорити проєкт <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
