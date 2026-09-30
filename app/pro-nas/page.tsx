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
import { deliveryModel } from '../data/deliveryModel';
import { homeProofCase, homeProofWebpSrcSet } from '../data/homeProof';
import './about.css';

// /pro-nas — who stands behind the company, in six zones: the two people and what each answers for, the one real
// object from Serhii's practice (the owner-approved HOME proof, same attribution), how that practice shows before work
// starts, three principles that each point to the mechanism on /yak-pratsyuiemo, where we work, the conversation.
// Every sentence is the page's previous copy, the team bios, the Delivery Model or company data; imagery other than
// the proof photo is illustrative and labelled «Ілюстрація».

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
  const proof = homeProofCase;

  return (
    <main className="inner-page about-page" id="main-content">
      <ProcessMotion root=".about-page" />

      {/* 1 · Hero — the names behind the reputation */}
      <section className="subhero about-subhero">
        <div className="about-hero-media">
          <AboutHeroVideo />
        </div>
        <div className="subhero-overlay" aria-hidden="true" />
        <div className="subhero-grid" aria-hidden="true" />
        {/* A compass arc set out once over the drawing-table footage, then still (hidden on phones) */}
        <svg className="about-hero-trace" data-motion viewBox="0 0 1440 900" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
          <path className="aht-grid" d="M1080 0 V900 M1260 0 V900 M860 300 H1440" pathLength={1} />
          <path className="aht-leg" d="M1150 318 L1368 236" pathLength={1} />
          <path className="aht-arc" d="M1368 236 A232 232 0 0 1 1318 478" pathLength={1} />
          <path className="aht-dim" d="M1150 318 V250 M1368 236 V168 M1150 190 H1368" pathLength={1} />
          <circle className="aht-node" cx="1150" cy="318" r="5" />
        </svg>
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
            <a className="button button-primary about-hero-cta" href="#inquiry">
              Обговорити проєкт <span aria-hidden="true">↗</span>
            </a>
            <HeroCallLink />
          </div>
        </div>
        <span className="about-provenance">Ілюстрація</span>
      </section>

      {/* 2 · The two people and what each answers for */}
      <TeamSection variant="about" />

      {/* 3 · The one real object from Serhii's practice (owner-approved, before RUBIKON BUILD) */}
      {proof && (
        <section className="page-section about-practice" id="praktyka" aria-labelledby="about-practice-title">
          <div className="shell">
            <SectionHeader
              eyebrow="Практика в основі"
              title="Досвід, який можна побачити"
              titleId="about-practice-title"
              supporting={deliveryModel.statements.experience}
            />
            <div className="about-practice-grid" data-motion>
              <figure className="about-practice-photo">
                <div className="about-practice-media">
                  <picture>
                    <source type="image/webp" srcSet={homeProofWebpSrcSet} sizes="(max-width: 1050px) 100vw, 62vw" />
                    <img src={proof.photo.src} alt={proof.photo.alt} width={proof.photo.width} height={proof.photo.height} loading="lazy" decoding="async" />
                  </picture>
                  <span className="about-tag">Фото об’єкта</span>
                </div>
                <figcaption><b>Реальний об’єкт.</b> Фото з ретушшю переднього плану.</figcaption>
              </figure>
              <div className="about-practice-facts">
                <p className="about-kicker">Реалізований об’єкт до створення RUBIKON BUILD</p>
                <h3>Ангар: {proof.scope.subject.join(', ').toLowerCase()}</h3>
                <p>{proof.attribution}</p>
                <ul className="about-scope" aria-label="Роботи на цьому об’єкті">
                  {proof.scope.subject.map((item, index) => <li key={item} style={{ '--i': index } as CSSProperties}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4 · How that practice shows before work starts */}
      <section className="page-section about-story-section" aria-labelledby="about-story-title">
        <div className="shell about-story-layout">
          <div className="promise-visual about-planning-visual">
            <ResponsiveImage
              src="/media/about-quality-control.webp"
              alt="Концептуальна ілюстрація: зіставлення робочого креслення з вузлом сталевого каркаса"
              sizes="(max-width: 1050px) 100vw, 40vw"
            />
            <span className="visual-index">Ілюстрація</span>
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

      {/* 6 · Where we work */}
      <section className="page-section about-geo" aria-labelledby="about-geo-title">
        <div className="shell about-geo-layout">
          <MapPin className="about-geo-pin" aria-hidden="true" />
          <div>
            <p className="eyebrow"><span /> Де працюємо</p>
            <h2 id="about-geo-title">Дніпро і Дніпропетровська область</h2>
          </div>
          <p className="about-geo-text">{company.geography}</p>
        </div>
      </section>

      <ConversationSection
        title="Розкажіть, що потрібно побудувати"
        lead="Почнемо з короткої розмови про завдання, майданчик і бажані строки. Підкажемо, які вихідні дані потрібні для наступного кроку."
      />
    </main>
  );
}
