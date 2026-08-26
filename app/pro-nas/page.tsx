import Image from 'next/image';
import { Breadcrumbs, PageCta, TeamSection } from '../components/SiteChrome';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/pro-nas',
  title: brandedTitle('Про родинну компанію'),
  description: `${company.name} — родинна будівельна компанія з Дніпра. Понад 30 років практичного досвіду та інженерний підхід нового покоління.`,
  socialTitle: `Про ${company.name} — досвід двох поколінь`,
  socialDescription: 'Родинна відповідальність, 30+ років практики та сучасний інженерний підхід.',
  image: '/media/about-industrial-concept.jpg',
  imageAlt: `${company.name} — від інженерної концепції до промислової споруди`,
});

export default function AboutPage() {
  return (
    <main className="inner-page" id="main-content">
      <section className="subhero">
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Про нас', href: siteRoutes.about }]} />
            <p className="eyebrow light"><span /> Родинна справа</p>
            <h1>Репутація,<br />за якою стоять<br /><em>наші імена</em></h1>
          </div>
          <div className="subhero-side">
            <p>RUBIKON BUILD об’єднує досвід батька, інженерну освіту сина та спільну відповідальність за кожне рішення на об’єкті.</p>
            <div className="subhero-stats">
              <div><strong>30+</strong><span>років практики</span></div>
              <div><strong>02</strong><span>покоління</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section about-story-section">
        <div className="shell story-checker about-story-checker">
          <article className="story-row">
            <div className="promise-visual about-planning-visual">
              <Image
                src="/media/about-industrial-concept.webp"
                alt="Архітектурна концепція промислової споруди з кресленнями металевого каркаса"
                fill
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="visual-index">01 / ДОСВІД</span>
              <span className="image-note">Від практичного досвіду — до технічного рішення</span>
            </div>
            <div className="promise-copy about-story-copy">
              <p className="eyebrow light"><span /> Як усе почалося</p>
              <h2>Досвід, який став основою спільної компанії</h2>
              <p className="promise-lead">Леус Сергій Іванович працює у будівельному напрямку понад 30 років. За цей час сформувався головний принцип: якість видно не лише після здачі, а в кожному прихованому вузлі.</p>
              <p className="story-support">Леус Дмитро Сергійович здобув освіту за напрямом цивільного та промислового будівництва. Ідея RUBIKON BUILD — поєднати практику майданчика з проєктним мисленням і розвитком сучасної будівельної компанії.</p>
            </div>
          </article>

          <article className="story-row story-row-reverse">
            <div className="promise-copy about-story-copy">
              <p className="eyebrow light"><span /> Спільний підхід</p>
              <h2>Два покоління — одна відповідальність за результат</h2>
              <p className="promise-lead">Практичний досвід допомагає бачити ризики ще до початку робіт, а інженерний підхід — перетворювати їх на зрозумілі технічні й організаційні рішення.</p>
              <p className="story-support">Ключові рішення приймаємо особисто. Під конкретний об’єкт формуємо необхідний склад фахівців, контролюємо відповідальні етапи та відповідаємо за домовленості власним ім’ям.</p>
            </div>
            <div className="promise-visual about-control-visual">
              <Image
                src="/media/about-quality-control.webp"
                alt="Контроль сталевого вузла за технічним кресленням на будівельному майданчику"
                fill
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
          <div className="page-heading split-heading">
            <div>
              <p className="eyebrow light"><span /> Наші принципи</p>
              <h2>Спокійна впевненість замість гучних обіцянок</h2>
            </div>
            <p>Строки, бюджет і технічні рішення залежать від конкретного об’єкта. Тому спочатку вивчаємо задачу, а потім фіксуємо реалістичні домовленості.</p>
          </div>
          <div className="detail-grid values-grid">
            <article className="detail-card"><span>01</span><h3>Чесна оцінка</h3><p>Відкрито говоримо про обсяг робіт, ризики та межі відповідальності.</p></article>
            <article className="detail-card"><span>02</span><h3>Якість вузлів</h3><p>Контролюємо те, що впливає на міцність, довговічність і безпечну експлуатацію.</p></article>
            <article className="detail-card"><span>03</span><h3>Особистий контроль</h3><p>Власники компанії залучені до ключових етапів, а не лише до першої зустрічі.</p></article>
            <article className="detail-card"><span>04</span><h3>Повага до слова</h3><p>Фіксуємо домовленості й завчасно повідомляємо про зміни, якщо вони виникають.</p></article>
          </div>
        </div>
      </section>

      <TeamSection compact />
      <PageCta title="Розкажіть, що потрібно побудувати" text="Почнемо з короткої розмови про задачу, майданчик і бажані строки. Підкажемо, які вихідні дані потрібні для наступного кроку." />
    </main>
  );
}
