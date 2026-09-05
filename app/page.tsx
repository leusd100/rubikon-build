import { DirectionImageCards, EngagementFormatCards } from './components/DirectionCards';
import { EstimateBrief, GhostWord, MessengerLinks, SectionHeader, TeamSection } from './components/SiteChrome';
import { HomeHeroVideo } from './components/HomeHeroVideo';
import ResponsiveImage from './components/ResponsiveImage';
import InquirySection from './components/InquirySection';
import { ProjectProcessSteps } from './components/ProcessCards';
import { company, companyContactLinks } from './data/company';
import { siteRoutes } from './data/navigation';

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <HomeHeroVideo />
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="shell hero-layout">
          <h1>
            Промислове будівництво — від окремих робіт до об’єкта <em>під ключ</em>
          </h1>
          <div className="hero-copy">
            <p className="hero-lead">
              Будуємо промислові, складські й аграрні об’єкти — від узгодженого технічного
              рішення до виконання будівельних робіт. Працюємо комплексно або виконуємо
              окремі етапи як підрядник чи субпідрядник.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#inquiry">
                Обговорити проєкт <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href={siteRoutes.directions}>
                Дивитися напрямки <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="hero-contact-card">
            <div className="hero-contact-kicker">
              <p>Зручний зв’язок</p>
              <span>Відповідаємо особисто</span>
            </div>
            <a className="hero-contact-phone" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
              <span className="hero-contact-action"><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
            </a>
            <div className="hero-contact-options">
              <span>Або напишіть у месенджер</span>
              <MessengerLinks className="hero-messengers" showFullLabels />
            </div>
          </div>
        </div>
        <div className="hero-signature" aria-hidden="true">RUBIKON / BUILD</div>
      </section>

      <section className="services section ghost-section" id="services">
        <GhostWord word="BUILD" />
        <div className="shell">
          <SectionHeader
            eyebrow="Формат участі"
            title="Що можемо взяти на себе"
            supporting="Можемо виконати комплексний обсяг робіт або долучитися до окремого етапу як підрядник чи субпідрядник. Формат і межі відповідальності погоджуємо до початку робіт."
          />
          <EngagementFormatCards />
          <a className="section-link" href={siteRoutes.directions}>Усі напрямки робіт <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="directions section ghost-section" id="directions">
        <GhostWord word="STRUCTURE" tone="dark" align="start" />
        <div className="shell">
          <SectionHeader
            eyebrow="Сфери компетенції"
            title="Каркаси та споруди для бізнесу й агросектору"
            supporting="Від окремого металевого вузла до готової промислової споруди — підбираємо формат участі відповідно до завдання, документації та меж відповідальності."
            inverse
          />
          <DirectionImageCards />
        </div>
      </section>

      <section className="promise section" id="about">
        <div className="shell story-checker">
          <article className="story-row">
            <div className="promise-visual engineering-plan-visual">
              <ResponsiveImage
                src="/media/about-industrial-concept.webp"
                alt="Промисловий сталевий каркас переходить із креслення у конструкцію"
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="visual-index">01 / РІШЕННЯ</span>
              <span className="image-note">Від креслення — до технічного рішення</span>
            </div>
            <div className="promise-copy">
              <p className="eyebrow light"><span /> Наша основа</p>
              <h2>За кожен об’єкт відповідаємо власним ім’ям</h2>
              <p className="promise-lead">
                RUBIKON BUILD — родинна компанія, у якій поєднуються понад 30 років практичного
                досвіду Сергія Івановича та сучасний підхід до розвитку бізнесу й роботи з клієнтами.
                Ми разом приймаємо ключові рішення і особисто відповідаємо за результат.
              </p>
              <p className="story-support">
                Для нас репутація — не рекламна теза. Вона формується на кожному об’єкті:
                якістю роботи, виконаними домовленостями та ставленням до замовника.
              </p>
              <blockquote className="brand-credo"><span>Наш принцип</span>Якість будівництва визначають деталі, яких після завершення вже не видно.</blockquote>
              <a className="section-link" href={siteRoutes.about}>Більше про компанію <span aria-hidden="true">↗</span></a>
            </div>
          </article>
        </div>
      </section>

      <TeamSection />

      <section className="process section ghost-section" id="how-we-work">
        <GhostWord word="PROCESS" />
        <div className="shell">
          <SectionHeader
            eyebrow="Як ми працюємо"
            title="Від узгодження завдання до приймання робіт"
            supporting="Для об’єкта під ключ формуємо повний маршрут. Для окремого етапу чітко фіксуємо межі відповідальності, вимоги на вході та результат на виході."
          />
          <ProjectProcessSteps />
        </div>
      </section>

      <EstimateBrief />

      <InquirySection
        eyebrow="Почнемо з розмови"
        title={<>Розкажіть коротко<br className="contact-title-break" /> про завдання</>}
      />
    </main>
  );
}
