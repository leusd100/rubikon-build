import { ClipboardCheck, FileSignature, ShieldCheck, UserCheck } from 'lucide-react';
import { DirectionHeroVideo } from '../components/DirectionHeroVideo';
import { Breadcrumbs, SectionHeader, TeamSection } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import ResponsiveImage from '../components/ResponsiveImage';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/pro-nas',
  title: brandedTitle('Про родинну компанію'),
  description: `${company.name} — родинна будівельна компанія з Дніпра. Понад 30 років практичного досвіду, особиста відповідальність і сучасний підхід до роботи з клієнтами.`,
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
          <DirectionHeroVideo
            sources={[
              '/media/about/architect.m4v',
              '/media/about/blueprint.m4v',
              '/media/about/welding.m4v',
              '/media/about/structure.m4v',
            ]}
            poster="/media/about/architect-poster.webp"
            mobilePoster="/media/about/architect-poster-768w.webp"
            clipDurationMs={3800}
            playbackRate={0.85}
          />
        </div>
        <div className="subhero-overlay" aria-hidden="true" />
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Про компанію', href: siteRoutes.about }]} />
            <p className="eyebrow light"><span /> Родинна справа</p>
            <h1>Репутація,<br />за якою стоять<br /><em>наші імена</em></h1>
            <a className="button button-primary about-hero-cta" href="#inquiry">
              Обговорити проєкт <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="page-section about-story-section">
        <div className="shell story-checker about-story-checker">
          <article className="story-row">
            <div className="promise-visual about-planning-visual">
              <ResponsiveImage
                src="/media/concepts/about-experience-v2.jpg"
                alt="Деталь сталевого вузла зі слідами перевірки та експлуатації"
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="visual-index">01 / ДОСВІД</span>
              <span className="image-note">Від практичного досвіду — до технічного рішення</span>
            </div>
            <div className="promise-copy about-story-copy">
              <p className="eyebrow light"><span /> Практична основа</p>
              <h2>Досвід, який став основою родинної компанії</h2>
              <p className="promise-lead">Сергій Іванович має понад 30 років практичного досвіду в будівництві: від організації робіт і управління командами до контролю якості безпосередньо на об’єктах.</p>
              <p className="story-support">Цей досвід допомагає бачити ризики до початку робіт, перевіряти відповідальні вузли та приймати рішення з урахуванням реальних умов майданчика.</p>
            </div>
          </article>

          <article className="story-row story-row-reverse">
            <div className="promise-copy about-story-copy">
              <p className="eyebrow light"><span /> Спільний підхід</p>
              <h2>Ключові рішення приймаємо разом</h2>
              <p className="promise-lead">Ми разом приймаємо ключові рішення, формуємо необхідний склад фахівців і особисто відповідаємо за результат.</p>
              <p className="story-support">Для нас репутація — не рекламна теза. Вона формується на кожному об’єкті: якістю роботи, виконаними домовленостями та ставленням до замовника.</p>
            </div>
            <div className="promise-visual about-control-visual">
              <ResponsiveImage
                src="/media/concepts/about-shared-approach-v2.jpg"
                alt="Два конструктивні елементи сходяться у точному сталевому вузлі"
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="visual-index">02 / КОНТРОЛЬ</span>
              <span className="image-note">Особисто контролюємо рішення, що визначають якість</span>
            </div>
          </article>
        </div>
      </section>

      <section className="page-section page-section-dark">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Наші принципи"
            title="Спокійна впевненість замість гучних обіцянок"
            supporting="Строки, бюджет і технічні рішення залежать від конкретного об’єкта. Тому спочатку вивчаємо завдання, а потім фіксуємо реалістичні домовленості."
            inverse
          />
          <div className="detail-grid values-grid">
            <article className="detail-card"><span>01</span><ClipboardCheck className="card-icon" aria-hidden="true" /><h3>Чесна оцінка</h3><p>Відкрито говоримо про обсяг робіт, ризики та межі відповідальності.</p></article>
            <article className="detail-card"><span>02</span><ShieldCheck className="card-icon" aria-hidden="true" /><h3>Контроль відповідальних вузлів</h3><p>Перевіряємо те, що впливає на міцність, довговічність і безпечну експлуатацію.</p></article>
            <article className="detail-card"><span>03</span><UserCheck className="card-icon" aria-hidden="true" /><h3>Особистий контроль</h3><p>Власники компанії залучені до ключових етапів, а не лише до першої зустрічі.</p></article>
            <article className="detail-card"><span>04</span><FileSignature className="card-icon" aria-hidden="true" /><h3>Повага до слова</h3><p>Фіксуємо домовленості й завчасно повідомляємо про зміни, якщо вони виникають.</p></article>
          </div>
        </div>
      </section>

      <TeamSection compact />
      <InquirySection
        eyebrow="Почнемо з розмови"
        title="Розкажіть, що потрібно побудувати"
        text="Почнемо з короткої розмови про завдання, майданчик і бажані строки. Підкажемо, які вихідні дані потрібні для наступного кроку."
      />
    </main>
  );
}
