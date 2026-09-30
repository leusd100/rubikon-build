import { ClipboardCheck, FileSignature, ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';
import { AboutHeroVideo } from '../components/AboutHeroVideo';
import { Breadcrumbs, HeroCallLink, SectionHeader, TeamSection } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { RegionMap } from '../components/about/RegionMap';
import ResponsiveImage from '../components/ResponsiveImage';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { directions } from '../data/directions';
import { regionMap } from '../data/regionMap';
import './about.css';

// /pro-nas — who stands behind the company, in five zones: the two people and what each answers for, what we build
// and where (the five directions, each leading to its page, and the region), how Serhii's practice shows before work
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
const BEFORE_SITE = [
  { title: 'Вихідні дані', text: 'Що вже є, чого бракує і які умови майданчика потрібно врахувати.' },
  { title: 'Послідовність робіт', text: 'Що має відбутися раніше, а що — пізніше, щоб суміжні роботи не конфліктували.' },
  { title: 'Ключові вузли', text: 'Які конструктивні рішення потрібно зрозуміти до переходу до наступного етапу.' },
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
    title: 'Контроль ключових рішень',
    text: 'Ключові конструктивні вузли та етапи не залишаємо без уваги: вони мають бути зрозумілими до переходу до наступної частини робіт.',
    href: `${siteRoutes.process}#etapy`,
    link: 'Етапи роботи',
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
              <span className="subhero-title-line">Будуємо й відповідаємо</span>
              <span className="subhero-title-line"><em>своїми іменами</em></span>
            </h1>
          </div>
          <div className="subhero-side about-subhero-side">
            <p>RUBIKON BUILD — родинна будівельна компанія з Дніпра. Практичний досвід Сергія Івановича поєднуємо із системною організацією роботи та зрозумілою комунікацією з клієнтом.</p>
            <div className="about-hero-actions">
              <a className="button button-primary about-hero-cta" href="#inquiry">
                Обговорити задачу <span aria-hidden="true">↗</span>
              </a>
              <HeroCallLink />
            </div>
          </div>
        </div>
      </section>

      {/* 2 · The two people and what each answers for */}
      <TeamSection variant="about" />

      {/* 3 · What we build and where: each direction is one row that leads to its page and takes the charcoal ground
          when pointed at or focused; the region closes the block on a copper line. Rows from the directions' own card
          copy — no images, so nothing here can read as a finished object. */}
      <section className="page-section about-build" aria-labelledby="about-build-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Напрямки робіт"
            title="Що робимо для бізнесу й агросектору"
            titleId="about-build-title"
            supporting="Беремо окремі роботи або погоджений комплекс робіт. Оберіть напрям, найближчий до вашої задачі."
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
          {/* The region closes the block the way «Два покоління — одна відповідальність» closes the people; under the
              line, the oblast's real outline (geoBoundaries / OpenStreetMap, credited) draws itself once, Dnipro — where
              the company is based — is marked on it, and contour lines ripple out from the city (RegionMap) */}
          <div className="about-build-region" data-motion>
            <p className="about-bond"><span>Основний регіон — {company.serviceAreas[0]}</span></p>
            <div className="about-region">
              <div className="about-region-copy">
                <p className="about-region-base">Базуємося в Дніпрі.</p>
                <p className="about-build-region-note">{company.geographyBeyond}</p>
              </div>
              <figure className="about-region-map">
                <RegionMap label={`Мапа: ${company.serviceAreas[0]}, позначено місто Дніпро`} />
                <figcaption>{regionMap.attribution}</figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      {/* 4 · How Serhii's practice shows before work starts */}
      <section className="page-section about-story-section" aria-labelledby="about-story-title">
        <div className="shell about-story-layout" data-motion>
          <div className="promise-visual about-planning-visual">
            <ResponsiveImage
              src="/media/about-quality-control.webp"
              alt="Концептуальна ілюстрація: зіставлення робочого креслення з вузлом сталевого каркаса"
              sizes="(max-width: 1050px) 100vw, 40vw"
            />
            {/* Each of the three things, shown on the illustration itself (drawn in image pixels, cropped exactly as the
                image): 01 the drawing under the hands, 02 the order the frame goes up — base plate, column, then the
                beam on the left — and 03 the bolted beam-to-column joint on the right. Played once in order when the block arrives, then all three stay;
                pointing at an item brings its mark forward. Decoration only: the list carries the words. */}
            <svg className="aqc-overlay" viewBox="0 0 1440 1800" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
              <g className="aqc-mark aqc-mark-1">
                <path className="aqc-line" pathLength={1} d="M470 1100 V1010 H570 M930 1010 H1030 V1100 M1030 1340 V1430 H930 M570 1430 H470 V1340" />
                <g transform="translate(470 1010)"><g className="aqc-badge"><circle r="40" /><text dy="11">01</text></g></g>
              </g>
              <g className="aqc-mark aqc-mark-2">
                <path className="aqc-line" pathLength={1} d="M1000 930 C940 800 800 700 790 520 C740 470 650 480 560 520" />
                <g transform="translate(1000 930)"><g className="aqc-step"><circle r="30" /><text dy="10">1</text></g></g>
                <g transform="translate(790 520)"><g className="aqc-step"><circle r="30" /><text dy="10">2</text></g></g>
                <g transform="translate(560 520)"><g className="aqc-step"><circle r="30" /><text dy="10">3</text></g></g>
                <g transform="translate(1180 930)"><g className="aqc-badge"><circle r="40" /><text dy="11">02</text></g></g>
              </g>
              <g className="aqc-mark aqc-mark-3">
                <circle className="aqc-line" pathLength={1} cx="1118" cy="505" r="165" />
                <g transform="translate(1235 388)"><g className="aqc-badge"><circle r="40" /><text dy="11">03</text></g></g>
              </g>
            </svg>
            <span className="image-note">Від креслення — до перевірки на майданчику</span>
          </div>
          <div className="about-story-copy">
            <p className="eyebrow"><span /> Практика в основі</p>
            <h2 id="about-story-title">Досвід працює ще до початку робіт</h2>
            <p className="about-story-lead">До старту звертаємо увагу на три речі, які найбільше впливають на подальше виконання.</p>
            <ol className="about-before">
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
            eyebrow="Наш підхід"
            title="Принципи, які видно в роботі"
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
        lead="Почнемо з короткої розмови про задачу, майданчик і бажані строки. Уточнимо, які вихідні дані потрібні для наступного кроку."
      />
    </main>
  );
}
