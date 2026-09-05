import { ClipboardCheck, FileSignature, ShieldCheck } from 'lucide-react';
import { AboutHeroVideo } from '../components/AboutHeroVideo';
import { Breadcrumbs, GhostWord, SectionHeader, TeamSection } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import ResponsiveImage from '../components/ResponsiveImage';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/pro-nas',
  title: brandedTitle('Про родинну компанію'),
  description: `${company.name} — родинна будівельна компанія з Дніпра. В основі — понад 30 років досвіду Сергія Івановича, особиста відповідальність і системний підхід.`,
  socialTitle: `Про ${company.name} — досвід двох поколінь`,
  socialDescription: 'Родинна відповідальність, понад 30 років практики та сучасний підхід до розвитку компанії.',
  image: '/media/about-industrial-concept.jpg',
  imageAlt: `${company.name} — від інженерної концепції до промислової споруди`,
});

export default function AboutPage() {
  return (
    <main className="inner-page" id="main-content">
      <section className="subhero about-subhero">
        <div className="about-hero-media" aria-hidden="true">
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
            <p>RUBIKON BUILD — родинна компанія з Дніпра. В основі — понад 30 років практичного досвіду, особиста відповідальність і системний підхід.</p>
            <a className="button button-primary about-hero-cta" href="#inquiry">
              Обговорити проєкт <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <TeamSection variant="about" />

      <section className="page-section about-story-section ghost-section">
        <GhostWord word="EXPERIENCE" />
        <div className="shell story-checker about-story-checker">
          <article className="story-row">
            <div className="promise-visual about-planning-visual">
              <ResponsiveImage
                src="/media/about-quality-control.webp"
                alt="Зіставлення робочого креслення з відповідальним вузлом сталевого каркаса"
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="visual-index">01 / ДОСВІД</span>
              <span className="image-note">Від креслення — до перевірки на майданчику</span>
            </div>
            <div className="promise-copy about-story-copy">
              <p className="eyebrow light"><span /> Досвід у роботі</p>
              <h2>Практика допомагає бачити ризики до початку робіт</h2>
              <p className="promise-lead">До виходу на майданчик уточнюємо вихідні дані, послідовність етапів і відповідальні конструктивні вузли.</p>
              <p className="story-support">Так рішення враховують реальні умови виконання, а склад робіт і межі відповідальності залишаються зрозумілими для всіх учасників.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="page-section page-section-dark ghost-section">
        <GhostWord word="TRUST" tone="dark" align="start" />
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Наші принципи"
            title="Спокійна впевненість замість гучних обіцянок"
            supporting="Строки, бюджет і технічні рішення залежать від конкретного об’єкта. Тому спочатку вивчаємо завдання, а потім фіксуємо реалістичні домовленості."
            inverse
          />
          <div className="detail-grid values-grid">
            <article className="detail-card"><span>01</span><ClipboardCheck className="card-icon" aria-hidden="true" /><h3>Прямота у складних ситуаціях</h3><p>Якщо під час підготовки або робіт змінюються вихідні умови, обсяг чи технічні вимоги, обговорюємо це до того, як рішення вплине на наступні етапи.</p></article>
            <article className="detail-card"><span>02</span><ShieldCheck className="card-icon" aria-hidden="true" /><h3>Контроль відповідальних рішень</h3><p>Ключові конструктивні вузли та етапи не залишаємо без уваги: вони мають бути зрозумілими до переходу до наступної частини робіт.</p></article>
            <article className="detail-card"><span>03</span><FileSignature className="card-icon" aria-hidden="true" /><h3>Чіткі межі відповідальності</h3><p>До початку робіт погоджуємо, що входить у нашу частину проєкту, а що залишається відповідальністю інших учасників.</p></article>
          </div>
        </div>
      </section>
      <InquirySection
        eyebrow="Почнемо з розмови"
        title="Розкажіть, що потрібно побудувати"
        text="Почнемо з короткої розмови про завдання, майданчик і бажані строки. Підкажемо, які вихідні дані потрібні для наступного кроку."
      />
    </main>
  );
}
