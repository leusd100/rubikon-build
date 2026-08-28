import Image from 'next/image';
import { MessagesSquare, Phone } from 'lucide-react';
import { DirectionImageCards, DirectionServiceCards } from './components/DirectionCards';
import { EstimateBrief, MessengerLinks, SectionHeader, TeamSection } from './components/SiteChrome';
import { DirectionHeroVideo } from './components/DirectionHeroVideo';
import { ProjectProcessSteps } from './components/ProcessCards';
import ProjectInquiryForm from './components/ProjectInquiryForm';
import { company, companyContactLinks } from './data/company';
import { siteRoutes } from './data/navigation';

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <DirectionHeroVideo
            sources={['/media/hero-steel-frame.mp4']}
            poster="/media/hero-steel-frame.jpg"
            playbackRate={0.85}
          />
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="shell hero-layout">
          <div className="hero-copy">
            <h1>
              Промислове будівництво — від окремих робіт до об’єкта <em>під ключ</em>
            </h1>
            <p className="hero-lead">
              Проєктуємо та будуємо промислові, складські й аграрні об’єкти. Працюємо
              комплексно або виконуємо окремі етапи як підрядник чи субпідрядник.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Обговорити проєкт <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href={siteRoutes.directions}>
                Дивитися напрямки <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="hero-contact-card">
            <p>Зручний зв’язок</p>
            <a className="hero-contact-phone" href={companyContactLinks.phone} aria-label={`Зателефонувати за номером ${company.phone.display}`}>
              <span className="hero-contact-desktop"><small>Телефон</small><strong>{company.phone.display}</strong></span>
              <span className="hero-contact-mobile">Зателефонувати</span>
              <b aria-hidden="true">↗</b>
            </a>
            <MessengerLinks className="hero-messengers" />
            <small>Телефон · Telegram · WhatsApp · Viber</small>
          </div>
        </div>
        <div className="hero-signature" aria-hidden="true">RUBIKON / BUILD</div>
      </section>

      <section className="services section" id="services">
        <span className="ghost-word" aria-hidden="true">STEEL</span>
        <div className="shell">
          <SectionHeader
            eyebrow="Ключові напрямки"
            title="Що можемо взяти на себе"
            supporting="Можемо відповідати за весь об’єкт або виконати визначений етап робіт у межах більшого будівельного проєкту."
          />
          <DirectionServiceCards />
          <a className="section-link" href={siteRoutes.directions}>Усі напрямки робіт <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="directions section" id="directions">
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
              <Image
                src="/media/engineering-planning.webp"
                alt="Фахівець опрацьовує архітектурні креслення та технічні плани"
                fill
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
              <a className="section-link" href={siteRoutes.about}>Більше про компанію <span aria-hidden="true">↗</span></a>
            </div>
          </article>

          <article className="story-row story-row-reverse">
            <div className="promise-copy">
              <p className="eyebrow light"><span /> Як працюємо</p>
              <h2 className="workflow-heading"><span>Практика майданчика</span><span>та системний контроль</span></h2>
              <div className="principles">
                <div><b>01</b><span><strong>Рішення до початку робіт</strong>Уточнюємо вихідні дані, конструктив і склад відповідальності.</span></div>
                <div><b>02</b><span><strong>Контроль ключових етапів</strong>Особисто стежимо за тим, що визначає міцність і довговічність.</span></div>
                <div><b>03</b><span><strong>Відкрита комунікація</strong>Пояснюємо рішення, погоджуємо зміни й не приховуємо складних моментів.</span></div>
                <div><b>04</b><span><strong>Родинна відповідальність</strong>Репутація компанії напряму пов’язана з нашими іменами.</span></div>
              </div>
              <blockquote className="brand-credo"><span>Наш принцип</span>Якість будівництва визначають деталі, яких після завершення вже не видно</blockquote>
            </div>
            <div className="promise-visual site-control-visual">
              <Image
                src="/media/site-quality-control.webp"
                alt="Перевірка точності металевої конструкції перед монтажем"
                fill
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="visual-index">02 / КОНТРОЛЬ</span>
              <span className="image-note">Точність перевіряємо на кожному етапі</span>
            </div>
          </article>
        </div>
      </section>

      <TeamSection />

      <section className="process section" id="how-we-work">
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

      <section className="contact section" id="contact">
        <div className="shell contact-grid">
          <div className="contact-intro">
            <p className="eyebrow light"><span /> Почнемо з розмови</p>
            <h2>Розкажіть коротко<br />про завдання</h2>
            <p>
              Залиште контакт і кілька вихідних даних. Ми ознайомимося із запитом,
              зв’яжемося з вами та підкажемо, що потрібно для предметного обговорення проєкту.
            </p>
            <div className="contact-links" id="contact-note">
              <a className="pending-contact contact-phone" href={companyContactLinks.phone} aria-label={`Зателефонувати за номером ${company.phone.display}`}>
                <b><Phone aria-hidden="true" />Телефон</b><i>{company.phone.display}</i>
              </a>
              <div className="pending-contact contact-messenger-row">
                <b>
                  <MessagesSquare aria-hidden="true" />
                  <span>Месенджери<small>Telegram · WhatsApp · Viber</small></span>
                </b>
                <MessengerLinks className="contact-messengers" />
              </div>
            </div>
          </div>
          <ProjectInquiryForm />
        </div>
      </section>
    </main>
  );
}
