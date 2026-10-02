import { Mail, Phone } from 'lucide-react';
import type { ReactNode } from 'react';
import { CookieSettingsButton } from './AnalyticsConsent';
import BrandLogo from './BrandLogo';
import MobileMenu from './MobileMenu';
import { ThemeMenu, ThemeOptions } from './ThemeControl';
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
          {/* eslint-disable-next-line @next/next/no-img-element -- a 24 px SVG: next/image would only add its client chunk (~15 KB gzip) to every page */}
          <img className="messenger-brand-icon" src={icon} width={24} height={24} alt="" aria-hidden="true" loading="lazy" decoding="async" />
          <span>{showFullLabels ? messengerContacts[kind].name : shortName}</span>
        </a>
      ))}
      <ViberContactButton showFullLabel={showFullLabels} />
    </div>
  );
}

function Brand({ idPrefix }: Readonly<{ idPrefix: string }>) {
  return <BrandLogo idPrefix={idPrefix} />;
}

export function SectionHeader({
  eyebrow,
  title,
  supporting,
  inverse = false,
  className = '',
  icon,
  titleId,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  supporting: ReactNode;
  inverse?: boolean;
  className?: string;
  /** A small decorative drawing in the empty right of the header (wide screens only; UX pass 2026-10) */
  aside?: ReactNode;
  /** A role icon beside the eyebrow's text — decoration only, never instead of the words. */
  icon?: ReactNode;
  /** For a section that names itself by its heading (aria-labelledby). */
  titleId?: string;
}) {
  return (
    <div className={`section-header${inverse ? ' section-header-inverse' : ''}${aside ? ' has-aside' : ''}${className ? ` ${className}` : ''}`}>
      <div className="section-header-copy">
        <p className={`eyebrow${inverse ? ' light' : ''}`}><span /> {icon}{eyebrow}</p>
        <h2 id={titleId}>{title}</h2>
      </div>
      <p className="section-header-support">{supporting}</p>
      {aside && <div className="section-header-aside" aria-hidden="true">{aside}</div>}
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

function SectionDivider({
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
          <Brand idPrefix="header" />
        </a>
        <nav className="desktop-nav" aria-label="Основна навігація">
          {primaryNavigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}
        </nav>
        <div className="header-contacts" aria-label="Контакти компанії">
          {/* The number itself is the label: one readable line (16 px), the icon says what it is. */}
          <a className="header-contact header-phone" href={companyContactLinks.phone} aria-label={`Телефон, ${company.phone.display}`}>
            <Phone aria-hidden="true" />
            <span><strong>{company.phone.display}</strong></span>
          </a>
          <MessengerLinks className="header-messengers" />
          <a className="messenger-link header-email" href={companyContactLinks.email} aria-label={`Email, ${company.email}`} title={company.email}>
            <Mail aria-hidden="true" />
          </a>
          <ThemeMenu />
        </div>
        <a className="mobile-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
          <Phone aria-hidden="true" />
        </a>
        <MobileMenu>
          <summary aria-label="Відкрити або закрити меню">
            <span>Меню</span>
            <i aria-hidden="true"><b /><b /></i>
          </summary>
          <nav aria-label="Мобільна навігація">
            {primaryNavigation.map((item, index) => (
              <a href={item.href} key={item.href}><small>{String(index + 1).padStart(2, '0')}</small> {item.label}</a>
            ))}
            <a className="mobile-phone" href={companyContactLinks.phone}><Phone aria-hidden="true" /> {company.phone.display}</a>
            <MessengerLinks className="mobile-messengers" />
            <a className="mobile-email" href={companyContactLinks.email}><Mail aria-hidden="true" /> {company.email}</a>
            <ThemeOptions variant="menu" />
          </nav>
        </MobileMenu>
      </div>
    </header>
  );
}

/** The inner pages' second hero action: one tap to call, deliberately quieter than the page's primary «Обговорити…». */
export function HeroCallLink() {
  return (
    <a className="hero-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
      <Phone aria-hidden="true" />
      <span><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
    </a>
  );
}

/**
 * Phone only (≤ 760 px): the call leads every inner hero as the same copper button HOME has, with the number on it.
 * It is rendered first in each hero's action row, so the reading order matches what a phone shows; wider screens hide
 * it and keep the page's own primary action with the quiet HeroCallLink beside it (globals.css, «Phone: the call
 * leads»).
 */
export function HeroCallButton() {
  return (
    <a className="button button-primary hero-call-primary hero-call-phone" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
      <Phone aria-hidden="true" />
      <span><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <SectionDivider variant="accent" />
      <div className="shell footer-grid">
        <a className="brand-link" href={siteRoutes.home}>
          <Brand idPrefix="footer" />
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
          <p className="footer-geo">{company.geographyShort}</p>
          <a className="footer-phone" href={companyContactLinks.phone}>
            <Phone aria-hidden="true" />
            <span>{company.phone.display}</span>
          </a>
          <a className="footer-email" href={companyContactLinks.email}>
            <Mail aria-hidden="true" />
            <span>{company.email}</span>
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

type TeamVariant = 'home' | 'about';

type TeamBio = {
  role: string;
  paragraphs: readonly string[];
  /** /pro-nas: what the person answers for — the bio's own nouns, never a new claim. */
  focus?: readonly string[];
};

// Two genuinely different bio sets, not one CSS toggle over one bio — Home gets a quick-trust
// summary, `/pro-nas` gets real depth (responsibility split, how the two founders hand off to
// each other). See the content audit's TeamSection finding for why this used to be a no-op prop.
const teamContent: Record<TeamVariant, { sergii: TeamBio; dmytro: TeamBio }> = {
  home: {
    sergii: {
      role: 'Засновник / керівник будівельного напряму',
      paragraphs: [
        'Керує будівельним напрямом. Його практичний досвід охоплює організацію робіт на майданчику, бригади, якість виконання та складні конструктивні вузли.',
      ],
    },
    dmytro: {
      role: 'Розвиток компанії / робота з клієнтами',
      paragraphs: [
        'Веде роботу з клієнтами й розвиток компанії. Допомагає розібрати завдання, зібрати наявні матеріали та підготувати предметну розмову про будівельні роботи.',
      ],
    },
  },
  about: {
    sergii: {
      role: 'Засновник / керівник будівельного напряму',
      paragraphs: [
        'Керує будівельним напрямом. Його практичний досвід охоплює організацію робіт на майданчику, бригади, якість виконання та складні конструктивні вузли.',
      ],
      focus: ['Організація робіт на майданчику', 'Бригади', 'Якість виконання', 'Складні конструктивні вузли'],
    },
    dmytro: {
      role: 'Розвиток компанії / робота з клієнтами',
      paragraphs: [
        'Веде розвиток RUBIKON і роботу з клієнтами. Допомагає перетворити початкову задачу, креслення або наявні матеріали на зрозумілу основу для предметної розмови про роботи.',
      ],
      focus: ['Робота з клієнтами', 'Розбір завдання й наявних матеріалів', 'Предметна розмова про роботи', 'Розвиток компанії'],
    },
  },
};

function PersonFocus({ items }: Readonly<{ items?: readonly string[] }>) {
  if (!items?.length) return null;
  return (
    <>
      <p className="person-focus-label">Відповідає за</p>
      <ul className="person-focus">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </>
  );
}

export function TeamSection({ variant = 'home' }: { variant?: TeamVariant }) {
  const { sergii, dmytro } = teamContent[variant];
  const isHome = variant === 'home';

  return (
    <section className={`team section team-${variant} team-text-only`} id={isHome ? 'about' : undefined}>
      <div className="shell">
        {/* HOME: the one place the family / responsibility thesis is stated (it used to be split between «Наша основа»
            and this block). Experience is told without a number until Serhii himself confirms one; responsibility is
            bounded by the contract. */}
        <SectionHeader
          className="team-heading"
          eyebrow="Люди й відповідальність"
          title={isHome ? 'Два покоління. Одна відповідальність' : 'Хто стоїть за RUBIKON'}
          supporting={isHome
            ? 'Практичний досвід будівництва й сучасна система роботи з клієнтом — в одній родинній компанії. За свою частину робіт і за домовленості в договорі відповідаємо особисто.'
            // /pro-nas: who they are, plainly (the owner's wording, 01.10); the family thesis itself is said once, by
            // the copper line under the cards
            : 'Батько й син — дві зони відповідальності: будівельна частина й робота з клієнтами.'}
        />
        <div className="team-stories" data-motion={isHome ? undefined : ''}>
          <article className="person-story">
            <div className="person-info">
              <span>{sergii.role}</span>
              <h3>Сергій Іванович Леус</h3>
              {sergii.paragraphs.map((text) => <p key={text}>{text}</p>)}
              <PersonFocus items={sergii.focus} />
            </div>
          </article>
          <article className="person-story person-story-reverse">
            <div className="person-info">
              <span>{dmytro.role}</span>
              <h3>Дмитро Сергійович Леус</h3>
              {dmytro.paragraphs.map((text) => <p key={text}>{text}</p>)}
              <PersonFocus items={dmytro.focus} />
            </div>
          </article>
          {/* /pro-nas: the family thesis ties the two cards together — one copper line across both */}
          {!isHome && <p className="team-bond"><span>Два покоління — одна відповідальність</span></p>}
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
