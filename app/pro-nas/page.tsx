import type { Metadata } from 'next';
import Image from 'next/image';
import { Breadcrumbs, PageCta, TeamSection } from '../components/SiteChrome';

const liveUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';

export const metadata: Metadata = {
  title: 'Про родинну компанію | RUBIKON BUILD',
  description: 'RUBIKON BUILD — родинна будівельна компанія з Дніпра. Понад 30 років практичного досвіду та інженерний підхід нового покоління.',
  alternates: { canonical: '/pro-nas' },
  openGraph: {
    title: 'Про RUBIKON BUILD — досвід двох поколінь',
    description: 'Родинна відповідальність, 30+ років практики та сучасний інженерний підхід.',
    url: '/pro-nas',
    images: [{ url: `${liveUrl}/images/concept-sketch.jpg`, alt: 'RUBIKON BUILD — про родинну будівельну компанію' }],
  },
  twitter: { card: 'summary_large_image', images: [`${liveUrl}/images/concept-sketch.jpg`] },
};

export default function AboutPage() {
  return (
    <main className="inner-page">
      <section className="subhero">
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Про нас', href: '/pro-nas' }]} />
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

      <section className="page-section">
        <div className="shell page-two-col">
          <div className="page-image page-image-tall">
            <Image src="/images/concept-sketch.jpg" alt="Архітектурний ескіз будівлі" fill sizes="(max-width: 850px) 100vw, 46vw" />
          </div>
          <div className="copy-column">
            <p className="eyebrow"><span /> Як усе почалося</p>
            <h2>Досвід, який став основою спільної компанії</h2>
            <p className="lead-copy">Леус Сергій Іванович працює у будівельному напрямку понад 30 років. За цей час сформувався головний принцип: якість видно не лише після здачі, а в кожному прихованому вузлі.</p>
            <p>Леус Дмитро Сергійович здобув освіту за напрямом цивільного та промислового будівництва. Ідея RUBIKON BUILD — поєднати практику майданчика з проєктним мисленням, системною комунікацією та розвитком сучасної будівельної компанії.</p>
            <p>Ключові технічні й організаційні рішення приймаємо особисто. Під конкретний об’єкт формуємо необхідний склад фахівців, контролюємо відповідальні етапи та відповідаємо за домовленості власним ім’ям.</p>
          </div>
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
