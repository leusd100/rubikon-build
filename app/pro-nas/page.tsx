import { ClipboardCheck, FileSignature, MapPin, ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import { AboutHeroVideo } from '../components/AboutHeroVideo';
import { Breadcrumbs, HeroCallLink, SectionHeader, TeamSection } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { ProcessMotion } from '../components/process/ProcessMotion';
import ResponsiveImage from '../components/ResponsiveImage';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { directions } from '../data/directions';
import './about.css';

// /pro-nas — who stands behind the company, in five zones: the two people and what each answers for, what we build
// and where (the five directions, each leading to its page, and the region), how Serhii's practice shows before work
// starts, three principles that each point to the mechanism on /yak-pratsyuiemo, the conversation. Every sentence is
// the page's previous copy, the team bios, the directions' own card copy, the HOME and /napryamky headings, or
// company data.
// Owner's decisions (30.09): no object photo here until RUBIKON BUILD has objects of its own to show — the one real
// photo, from Serhii's work before the company, stays on HOME with its attribution; and the imagery, all of it
// illustrative, carries no «Ілюстрація» tag here — the conceptual image says so in its alt text.

export const metadata = createPageMetadata({
  path: '/pro-nas',
  title: brandedTitle('Про родинну компанію'),
  description: `${company.name} — родинна будівельна компанія з Дніпра. В основі — практичний досвід Сергія Івановича, особиста відповідальність і системний підхід.`,
  socialTitle: `Про ${company.name} — досвід двох поколінь`,
  socialDescription: 'Родинна відповідальність, практичний досвід Сергія Івановича та сучасний підхід до розвитку компанії.',
  image: '/media/about-industrial-concept.jpg',
  imageAlt: `${company.name} — від інженерної концепції до промислової споруди`,
});

/** «Практика допомагає бачити ризики»: the three things settled before going on site (the section's own lead). */
const BEFORE_SITE = [
  { title: 'Вихідні дані', text: 'Що вже є, чого бракує і які умови майданчика впливають на рішення.' },
  { title: 'Послідовність етапів', text: 'Хто і коли виконує свою частину, щоб роботи не заважали одна одній.' },
  { title: 'Відповідальні вузли', text: 'Ключові конструктивні вузли мають бути зрозумілими до переходу до наступної частини робіт.' },
] as const;

/** Each principle ends where the page shows how it works in practice. */
const PRINCIPLES = [
  {
    Icon: ClipboardCheck,
    title: 'Прямота у складних ситуаціях',
    text: 'Якщо під час підготовки або робіт змінюються вихідні умови, обсяг чи технічні вимоги, обговорюємо це до того, як рішення вплине на наступні етапи.',
    href: `${siteRoutes.process}#koshtorys`,
    link: 'Як погоджуємо зміни',
  },
  {
    Icon: ShieldCheck,
    title: 'Контроль відповідальних рішень',
    text: 'Ключові конструктивні вузли та етапи не залишаємо без уваги: вони мають бути зрозумілими до переходу до наступної частини робіт.',
    href: `${siteRoutes.process}#etapy`,
    link: 'Що буде після звернення',
  },
  {
    Icon: FileSignature,
    title: 'Чіткі межі відповідальності',
    text: 'До початку робіт погоджуємо, що входить у нашу частину проєкту, а що залишається відповідальністю інших учасників.',
    href: `${siteRoutes.process}#vidpovidalnist`,
    link: 'Хто за що відповідає',
  },
] as const;

export default function AboutPage() {
  return (
    <main className="inner-page about-page" id="main-content">
      <ProcessMotion root=".about-page" />

      {/* 1 · Hero — the names behind the reputation; words and actions under the title, as on /yak-pratsyuiemo */}
      <section className="subhero about-subhero">
        <div className="about-hero-media">
          <AboutHeroVideo />
        </div>
        <div className="subhero-overlay" aria-hidden="true" />
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div className="subhero-copy">
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Про компанію', href: siteRoutes.about }]} />
            <p className="eyebrow light"><span /> Родинна справа</p>
            <h1>
              <span className="subhero-title-line">Репутація, за якою</span>
              <span className="subhero-title-line">стоять <em>наші імена</em></span>
            </h1>
          </div>
          <div className="subhero-side about-subhero-side">
            <p>RUBIKON BUILD — родинна компанія з Дніпра. В основі — практичний досвід Сергія Івановича, особиста відповідальність і системний підхід.</p>
            <div className="about-hero-actions">
              <a className="button button-primary about-hero-cta" href="#inquiry">
                Обговорити проєкт <span aria-hidden="true">↗</span>
              </a>
              <HeroCallLink />
            </div>
          </div>
        </div>
      </section>

      {/* 2 · The two people and what each answers for */}
      <TeamSection variant="about" />

      {/* 3 · What we build and where: each direction is one row that leads to its page and takes the charcoal ground
          when pointed at or focused; the region closes the list. Headings from HOME and /napryamky, rows from the
          directions' own card copy — no images, so nothing here can read as a finished object. */}
      <section className="page-section about-build" aria-labelledby="about-build-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Напрямки робіт"
            title="П’ять напрямів для бізнесу й агросектору"
            titleId="about-build-title"
            supporting="Кожен пункт веде до конкретних можливостей, процесу й чинників вартості. Для комплексного об’єкта можна почати з будь-якого близького напрямку."
          />
          <ol className="about-build-list" data-motion>
            {directions.map((direction, index) => (
              <li key={direction.id} style={{ '--i': index } as CSSProperties}>
                <span className="about-build-number" aria-hidden="true">{direction.number}</span>
                <h3><a href={direction.href}>{direction.cardTitle}</a></h3>
                <p>{direction.cardText}</p>
                <span className="about-build-arrow" aria-hidden="true"><span>↗</span></span>
              </li>
            ))}
          </ol>
          <div className="about-build-geo">
            <MapPin aria-hidden="true" />
            <p><b>Дніпро і Дніпропетровська область.</b> {company.geography}</p>
          </div>
        </div>
      </section>

      {/* 4 · How Serhii's practice shows before work starts */}
      <section className="page-section about-story-section" aria-labelledby="about-story-title">
        <div className="shell about-story-layout">
          <div className="promise-visual about-planning-visual">
            <ResponsiveImage
              src="/media/about-quality-control.webp"
              alt="Концептуальна ілюстрація: зіставлення робочого креслення з вузлом сталевого каркаса"
              sizes="(max-width: 1050px) 100vw, 40vw"
            />
            <span className="image-note">Від креслення — до перевірки на майданчику</span>
          </div>
          <div className="about-story-copy">
            <p className="eyebrow"><span /> Досвід у роботі</p>
            <h2 id="about-story-title">Практика допомагає бачити ризики до початку робіт</h2>
            <p className="about-story-lead">До виходу на майданчик уточнюємо три речі:</p>
            <ol className="about-before" data-motion>
              {BEFORE_SITE.map((item, index) => (
                <li key={item.title} style={{ '--i': index } as CSSProperties}>
                  <span className="about-before-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <b>{item.title}</b>
                  <span className="about-before-text">{item.text}</span>
                </li>
              ))}
            </ol>
            <p className="about-story-support">Так рішення враховують реальні умови виконання, а склад робіт і межі відповідальності залишаються зрозумілими для всіх учасників.</p>
          </div>
        </div>
      </section>

      {/* 5 · Principles, each pointing to how it works on /yak-pratsyuiemo */}
      <section className="page-section page-section-dark about-principles" aria-labelledby="about-principles-title">
        <div className="shell">
          <SectionHeader
            inverse
            eyebrow="Наші принципи"
            title="Спокійна впевненість замість гучних обіцянок"
            titleId="about-principles-title"
            supporting="Строки, бюджет і технічні рішення залежать від конкретного об’єкта. Тому спочатку вивчаємо завдання, а потім фіксуємо реалістичні домовленості."
          />
          <ol className="about-principles-grid" data-motion>
            {PRINCIPLES.map(({ Icon, title, text, href, link }, index) => (
              <li key={title} style={{ '--i': index } as CSSProperties}>
                <span className="about-principle-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <Icon className="about-principle-icon" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
                <a className="about-principle-link" href={href}>{link} <span aria-hidden="true">↗</span></a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ConversationSection
        title="Розкажіть, що потрібно побудувати"
        lead="Почнемо з короткої розмови про завдання, майданчик і бажані строки. Підкажемо, які вихідні дані потрібні для наступного кроку."
      />
    </main>
  );
}
