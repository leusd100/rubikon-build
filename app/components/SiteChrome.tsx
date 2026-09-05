import Image from 'next/image';
import { Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { CookieSettingsButton } from './AnalyticsConsent';
import MobileMenu from './MobileMenu';
import { EstimateBriefCards } from './ProcessCards';
import ResponsiveImage from './ResponsiveImage';
import ViberContactButton from './ViberContactButton';
import { company, companyContactLinks } from '../data/company';
import { directions } from '../data/directions';
import { messengerContacts } from '../data/contactMethods';
import { primaryNavigation, siteRoutes } from '../data/navigation';

const messengerLinks = [
  ['telegram', messengerContacts.telegram],
  ['whatsapp', messengerContacts.whatsapp],
] as const;

export function MessengerLinks({
  className,
  showFullLabels = false,
}: {
  className: string;
  showFullLabels?: boolean;
}) {
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
          <span>{showFullLabels ? messengerContacts[kind].name : shortName}</span>
        </a>
      ))}
      <ViberContactButton showFullLabel={showFullLabels} />
    </div>
  );
}

export function Brand() {
  return (
    <span className="brand" aria-label={`${company.name} — будівництво та інженерні рішення`}>
      <BrandMark className="brand-frame-mark" />
      <span className="brand-name">
        <b><span>RUBIKON</span> <em>BUILD</em></b>
        <small>Construction &amp; Engineering</small>
      </span>
    </span>
  );
}

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <span className={`engineering-mark${className ? ` ${className}` : ''}`} aria-hidden="true">
      <i /><i /><b /><em />
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

export function GhostWord({
  word,
  tone = 'light',
  align = 'end',
}: {
  word: string;
  tone?: 'light' | 'dark';
  align?: 'start' | 'end';
}) {
  return (
    <span
      className={`ghost-word ghost-word-${tone} ghost-word-${align}`}
      aria-hidden="true"
    >
      {word}
    </span>
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
          <a className="header-contact header-phone" href={companyContactLinks.phone} aria-label={`Телефон, ${company.phone.display}`}>
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
        {/* Two peer link groups, both labelled, so the footer reads as a small site map rather
            than one titled block sitting next to an untitled one. */}
        <nav className="footer-nav" aria-label="Навігація в нижній частині сайту">
          <p className="footer-group-title">Навігація</p>
          {primaryNavigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        {/* Direct routes to the five commercial pages. Deliberately plain navigation with the
            direction's own name as the anchor — the same label the cards and the /napryamky
            route list already use — not an SEO keyword list. */}
        <nav className="footer-directions" aria-label="Напрямки робіт">
          <p className="footer-group-title">Напрямки</p>
          {directions.map((direction) => (
            <a href={direction.href} key={direction.id}>{direction.title}</a>
          ))}
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

// Deliberately NOT a SectionHeader-above/grid-below composition like Process right before it:
// two "here's a list" sections back to back went visually flat right before the conversion ask.
// This is one asymmetric split instead — a quiet statement column (which is where the CTA now
// lives) beside a single-column, intentionally compact checklist. Weight drops going into
// Contact rather than staying flat. Reuses .page-two-col/.copy-column verbatim (the same split
// already used on direction pages) rather than inventing a new grid.
export function EstimateBrief() {
  return (
    <section className="estimate-brief section" id="estimate-brief">
      <div className="shell page-two-col align-start">
        <div className="copy-column">
          <p className="eyebrow"><span /> Для першої оцінки</p>
          <h2>Що потрібно для першої оцінки</h2>
          <p>Не обов’язково мати готовий проєкт. Вкажіть базові параметри — ми уточнимо, яких вихідних даних бракує для наступного кроку.</p>
          <a className="section-link" href={siteRoutes.contact}>Підготувати запит <span aria-hidden="true">↗</span></a>
        </div>
        <EstimateBriefCards />
      </div>
    </section>
  );
}

type TeamVariant = 'home' | 'about';

type TeamBio = { role: string; paragraphs: readonly string[] };

// Two genuinely different bio sets, not one CSS toggle over one bio — Home gets a quick-trust
// summary, `/pro-nas` gets real depth (responsibility split, how the two founders hand off to
// each other). See the content audit's TeamSection finding for why this used to be a no-op prop.
const teamContent: Record<TeamVariant, { sergii: TeamBio; dmytro: TeamBio }> = {
  home: {
    sergii: {
      role: 'Засновник / керівник будівельного напряму',
      paragraphs: [
        'Понад 30 років практичного досвіду в будівництві — від організації робіт на майданчику до контролю якості та ключових технічних рішень.',
      ],
    },
    dmytro: {
      role: 'Розвиток компанії / робота з клієнтами',
      paragraphs: [
        'Відповідає за розвиток RUBIKON BUILD, комунікацію з клієнтами та системну організацію роботи — від першого звернення до узгодження формату співпраці.',
      ],
    },
  },
  about: {
    sergii: {
      role: 'Засновник / керівник будівельного напряму',
      paragraphs: [
        'Понад 30 років у будівництві — від роботи на майданчику до організації бригад, контролю якості та відповідальних етапів. Сергій Іванович залучається до оцінки ключових технічних рішень і конструктивних вузлів проєкту.',
      ],
    },
    dmytro: {
      role: 'Розвиток компанії / робота з клієнтами',
      paragraphs: [
        'Відповідає за розвиток RUBIKON BUILD і роботу з клієнтами. Допомагає структурувати завдання, зібрати вихідні дані та підготуватися до технічного обговорення, щоб склад робіт і межі відповідальності були зрозумілими обом сторонам.',
      ],
    },
  },
};

export function TeamSection({ variant = 'home' }: { variant?: TeamVariant }) {
  const { sergii, dmytro } = teamContent[variant];
  const isHome = variant === 'home';

  return (
    <section className={`team section team-${variant}`}>
      <div className="shell">
        <SectionHeader
          className="team-heading"
          eyebrow="Родина в основі компанії"
          title={isHome ? 'Два покоління. Одна відповідальність' : 'Досвід двох поколінь — в одній команді'}
          supporting={isHome
            ? 'Сергій Іванович відповідає за будівельний напрям і технічні рішення. Дмитро — за розвиток компанії та роботу з клієнтами.'
            : 'Практичний досвід будівництва поєднуємо із системною організацією роботи, зрозумілою комунікацією та сучасними інструментами.'}
        />
        <div className="team-stories">
          <article className="person-story">
            <div className="person-photo">
              <ResponsiveImage src="/images/founder.webp" alt={`${company.founders[0]} — засновник і керівник будівельного напряму ${company.name}`} sizes="(max-width: 1050px) 82vw, 47vw" />
            </div>
            <div className="person-info">
              <span>{sergii.role}</span>
              <h3>Леус Сергій Іванович</h3>
              {sergii.paragraphs.map((text) => <p key={text}>{text}</p>)}
            </div>
          </article>
          <article className="person-story person-story-reverse">
            <div className="person-info">
              <span>{dmytro.role}</span>
              <h3>Леус Дмитро Сергійович</h3>
              {dmytro.paragraphs.map((text) => <p key={text}>{text}</p>)}
            </div>
            <div className="person-photo">
              <ResponsiveImage src="/images/next-generation.webp" alt={`${company.founders[1]} — розвиток компанії та робота з клієнтами ${company.name}`} sizes="(max-width: 1050px) 82vw, 47vw" />
            </div>
          </article>
        </div>
        {isHome && (
          <a className="section-link team-home-link" href={siteRoutes.about}>
            Познайомитися з командою <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </section>
  );
}
