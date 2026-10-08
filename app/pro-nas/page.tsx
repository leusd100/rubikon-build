import type { CSSProperties } from 'react';
import { AboutHeroVideo } from '../components/AboutHeroVideo';
import { Breadcrumbs, HeroCallButton, HeroCallLink, SectionHeader, TeamSection } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { CapabilityFigure } from '../components/about/CapabilityFigure';
import { PrincipleMark } from '../components/about/PrincipleMark';
import { RegionBlock } from '../components/about/RegionBlock';
import { PracticeSteps, type PracticeStep } from '../components/about/PracticeSteps';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { capabilityLedger } from '../lib/deliveryModelPresentation';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import '../components/about/region.css';
import '../components/about/capability.css';
import './about.css';

// /pro-nas — who stands behind the company, in five zones: the two people and what each answers for, what we do
// ourselves and what we organise, and where (the Delivery Model's capability layers and the region), how Serhii's practice shows before work
// starts, three principles that each point to the mechanism on /yak-pratsyuiemo, the conversation. The copy is the
// owner's pass of 30.09 over the page's own lines (no claim beyond the team bios, the Delivery Model's formats, the
// directions' card copy and company data).
// Owner's decisions (30.09): no object photo here until RUBIKON BUILD has objects of its own to show — the one real
// photo, from Serhii's work before the company, stays on HOME with its attribution; and the imagery, all of it
// illustrative, carries no «Ілюстрація» tag here — the conceptual image says so in its alt text.

export const metadata = createPageMetadata({
  path: '/pro-nas',
  title: brandedTitle('Про родинну компанію'),
  description: `${company.name} — родинна будівельна компанія з Дніпра. Практичний досвід Сергія Івановича поєднуємо із системною організацією роботи та зрозумілою комунікацією з клієнтом.`,
  socialTitle: `Про ${company.name} — досвід двох поколінь`,
  socialDescription: 'Родинна відповідальність, практичний досвід Сергія Івановича та сучасний підхід до розвитку компанії.',
  image: '/media/about-industrial-concept.jpg',
  imageAlt: `${company.name} — від інженерної концепції до промислової споруди`,
});

/** «Практика допомагає бачити ризики»: the three things settled before going on site (the section's own lead). */
const BEFORE_SITE: readonly PracticeStep[] = [
  {
    title: 'Вихідні дані',
    text: 'Що вже є, чого бракує і які умови майданчика потрібно врахувати.',
    caption: 'Креслення й вихідні дані',
    focus: [720, 1330],
    zoom: 1.4,
  },
  {
    title: 'Послідовність робіт',
    text: 'Що має відбутися раніше, а що — пізніше, щоб суміжні роботи не конфліктували.',
    caption: 'Порядок монтажу: плита → колона → балка',
    focus: [655, 600],
    zoom: 1.35,
  },
  {
    title: 'Ключові вузли',
    text: 'Які конструктивні рішення потрібно зрозуміти до переходу до наступного етапу.',
    caption: 'Болтовий вузол балки й колони',
    focus: [1016, 530],
    zoom: 3.4,
  },
];

/** Each principle is drawn as its mark on a sheet (PrincipleMark) and ends where the page shows how it works in practice. */
const PRINCIPLES = [
  {
    mark: 'revision',
    title: 'Прямота у складних ситуаціях',
    text: 'Якщо змінюються умови, обсяг чи вимоги, обговорюємо це до того, як рішення вплине на наступні етапи.',
    href: `${siteRoutes.process}#koshtorys`,
    link: 'Як погоджуємо зміни',
  },
  {
    mark: 'node',
    title: 'Контроль ключових рішень',
    text: 'Ключові вузли й етапи мають бути зрозумілими до переходу до наступної частини робіт.',
    href: `${siteRoutes.process}#etapy`,
    link: 'Етапи роботи',
  },
  {
    mark: 'boundary',
    title: 'Чіткі межі відповідальності',
    text: 'До початку робіт погоджуємо, що входить у нашу частину, а що — відповідальність інших учасників.',
    href: `${siteRoutes.process}#vidpovidalnist`,
    link: 'Хто за що відповідає',
  },
] as const;

export default function AboutPage() {
  return (
    <main className="inner-page about-page" id="main-content" data-field="" style={{ '--field-name': '"RUBIKON BUILD · Про нас"' } as CSSProperties}>
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
              <span className="subhero-title-line">Будуємо й відповідаємо</span>
              <span className="subhero-title-line"><em>своїми іменами</em></span>
            </h1>
          </div>
          <div className="subhero-side about-subhero-side">
            <p>RUBIKON BUILD — родинна будівельна компанія з Дніпра. Практичний досвід Сергія Івановича поєднуємо із системною організацією роботи та зрозумілою комунікацією з клієнтом.</p>
            <div className="about-hero-actions" data-hero-actions>
              <HeroCallButton />
              <a className="button button-primary about-hero-cta" href="#inquiry">
                Обговорити задачу <span aria-hidden="true">↓</span>
              </a>
              <HeroCallLink />
            </div>
          </div>
        </div>
      </section>

      {/* 2 · The two people and what each answers for */}
      <TeamSection variant="about" />

      {/* 3 · What we do ourselves and what we organise, then where: the Delivery Model's capability layers (the five
          directions are on /napryamky, one link away); the region closes the block on a copper line */}
      <section className="page-section about-build" aria-labelledby="about-build-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Що робимо"
            title="Що робимо самі, а що організовуємо"
            titleId="about-build-title"
            supporting="Беремо окремі роботи або погоджений комплекс робіт. Хто виконує кожну частину, фіксуємо в договорі до початку робіт."
          />
          <CapabilityFigure columns={capabilityLedger()} />
          <a className="section-link about-build-all" href={siteRoutes.directions}>
            Усі напрямки робіт <span aria-hidden="true">↗</span>
          </a>
          {/* The region closes the block the way «Два покоління — одна відповідальність» closes the people; under the
              line, the oblast's real outline (geoBoundaries / OpenStreetMap, credited) draws itself once, Dnipro — where
              the company is based — is marked on it, and contour lines ripple out from the city (RegionMap) */}
          <RegionBlock className="about-build-region" />
        </div>
      </section>

      {/* 4 · How Serhii's practice shows before work starts: the illustration answers the list one step at a time */}
      <section className="page-section about-story-section" aria-labelledby="about-story-title">
        <PracticeSteps
          eyebrow="Практика в основі"
          title="Досвід працює ще до початку робіт"
          titleId="about-story-title"
          lead="До старту звертаємо увагу на три речі, які найбільше впливають на подальше виконання."
          steps={BEFORE_SITE}
          support="Так рішення враховують реальні умови виконання, а склад робіт і межі відповідальності залишаються зрозумілими для всіх учасників."
          overviewCaption="Від креслення — до перевірки на майданчику"
        />
      </section>

      {/* 5 · Principles, each pointing to how it works on /yak-pratsyuiemo */}
      <section className="page-section page-section-dark about-principles" aria-labelledby="about-principles-title">
        <div className="shell">
          <SectionHeader
            inverse
            eyebrow="Наш підхід"
            title="Принципи, які видно в роботі"
            titleId="about-principles-title"
            supporting="Строки, бюджет і технічні рішення залежать від конкретного об’єкта. Тому спочатку вивчаємо завдання, а потім фіксуємо реалістичні домовленості."
          />
          <ol className="about-principles-grid" data-motion>
            {PRINCIPLES.map(({ mark, title, text, href, link }, index) => (
              <li key={title} style={{ '--i': index } as CSSProperties}>
                <span className="about-principle-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <PrincipleMark kind={mark} />
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
        lead="Почнемо з короткої розмови про задачу, майданчик і бажані строки. Уточнимо, які вихідні дані потрібні для наступного кроку."
      />
    </main>
  );
}
