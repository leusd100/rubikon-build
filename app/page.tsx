import Image from 'next/image';
import {
  BadgeCheck,
  ClipboardList,
  DraftingCompass,
  Handshake,
  HardHat,
  Hammer,
  Layers3,
  Mail,
  MessagesSquare,
  Phone,
  Ruler,
  Warehouse,
  Wheat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EstimateBrief, MessengerLinks, TeamSection } from './components/SiteChrome';

const services = [
  {
    number: '01',
    title: 'Ангари та склади',
    text: 'Швидкомонтовані споруди для виробництва, логістики, агросектору й комерційних задач.',
    href: '/angary',
    icon: Warehouse,
  },
  {
    number: '02',
    title: 'Зерносховища під ключ',
    text: 'Комплексна реалізація: основа, каркас, огороджувальні конструкції та монтаж.',
    href: '/zernoskhovyshcha',
    icon: Wheat,
  },
  {
    number: '03',
    title: 'Металоконструкції',
    text: 'Проєктування, виготовлення та монтаж каркасів, ферм, балок і складних металевих вузлів.',
    href: '/metalokonstruktsii',
    icon: DraftingCompass,
  },
  {
    number: '04',
    title: 'Бетонні роботи',
    text: 'Фундаменти, промислові підлоги, монолітні ділянки та основи під конструкції й обладнання.',
    href: '/betonni-roboty',
    icon: Layers3,
  },
  {
    number: '05',
    title: 'Покрівельні роботи',
    text: 'Монтаж і ремонт покрівель промислових, складських та аграрних споруд із герметизацією вузлів і примикань.',
    href: '/pokrivelni-roboty',
    icon: Hammer,
  },
];

const steps: Array<[string, string, string, LucideIcon]> = [
  ['01', 'Знайомство', 'Уточнюємо задачу, тип об’єкта, умови та бажаний результат.', Handshake],
  ['02', 'Виїзд і заміри', 'Оглядаємо майданчик, фіксуємо обсяги та технічні особливості.', Ruler],
  ['03', 'Рішення та кошторис', 'Готуємо пропозицію з переліком робіт, строками й бюджетом.', ClipboardList],
  ['04', 'Виготовлення і монтаж', 'Організовуємо процес та контролюємо якість ключових етапів.', HardHat],
  ['05', 'Перевірка і здача', 'Разом перевіряємо результат і закриваємо виконані роботи.', BadgeCheck],
];

const directions = [
  {
    number: '01',
    title: 'Ангари та склади',
    text: 'Швидкомонтовані споруди для виробництва, логістики, агросектору та зберігання.',
    image: '/media/competence-hangar.jpg',
    alt: 'Промисловий ангар і складська будівля',
    className: 'wide',
    href: '/angary',
  },
  {
    number: '02',
    title: 'Зерносховища',
    text: 'Основа, металевий каркас, огороджувальні конструкції та координація монтажу.',
    image: '/media/competence-grain.jpg',
    alt: 'Промислове зерносховище біля поля',
    className: 'tall',
    href: '/zernoskhovyshcha',
  },
  {
    number: '03',
    title: 'Несучі металоконструкції',
    text: 'Виготовлення та монтаж каркасів, балок, ферм і складних металевих вузлів.',
    image: '/media/competence-steel.jpg',
    alt: 'Монтаж і зварювання несучого сталевого каркаса',
    className: 'compact',
    href: '/metalokonstruktsii',
  },
  {
    number: '04',
    title: 'Бетонні роботи',
    text: 'Фундаменти, основи, промислові підлоги та монолітні елементи під задачу об’єкта.',
    image: '/media/competence-concrete.jpg',
    alt: 'Армування залізобетонної основи на будівельному майданчику',
    className: 'concrete',
    href: '/betonni-roboty',
  },
  {
    number: '05',
    title: 'Покрівельні роботи',
    text: 'Монтаж, ремонт і герметизація покрівель промислових, складських та аграрних споруд.',
    image: '/media/competence-roofing.jpg',
    alt: 'Роботи на металевій покрівлі промислової споруди',
    className: 'roof',
    href: '/pokrivelni-roboty',
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <video
            src="/media/hero-steel-frame.mp4"
            poster="/media/hero-steel-frame.jpg"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
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
                Отримати попередню оцінку <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="/napryamky">
                Дивитися напрямки <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className="hero-cycle" aria-label="Формати співпраці">
            <p>Формат співпраці</p>
            <ol>
              <li><b>01</b><span>Об’єкт під ключ</span></li>
              <li><b>02</b><span>Окремий етап</span></li>
              <li><b>03</b><span>Підряд / субпідряд</span></li>
            </ol>
          </div>
        </div>
        <div className="hero-signature" aria-hidden="true">RUBIKON / BUILD</div>
      </section>

      <section className="services section" id="services">
        <span className="ghost-word" aria-hidden="true">STEEL</span>
        <div className="shell">
          <div className="section-head section-head-balanced">
            <div className="section-heading-copy">
              <p className="eyebrow"><span /> Ключові напрямки</p>
              <h2>Що можемо<br />взяти на себе</h2>
            </div>
            <p>
              Можемо відповідати за весь об’єкт або виконати визначений етап робіт у межах
              більшого будівельного проєкту.
            </p>
          </div>
          <div className="service-list">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <a className="service-card" href={service.href} key={service.number}>
                  <span className="service-number">{service.number}</span>
                  <Icon className="service-icon" aria-hidden="true" />
                  <h3>{service.title}</h3>
                  <p>{service.text}</p>
                  <span className="service-arrow" aria-hidden="true">↗</span>
                </a>
              );
            })}
          </div>
          <a className="section-link" href="/napryamky">Усі напрямки робіт <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="directions section" id="directions">
        <div className="shell">
          <div className="directions-head">
            <div>
              <p className="eyebrow light"><span /> Сфери компетенції</p>
              <h2>Каркаси та споруди для бізнесу й агросектору</h2>
            </div>
            <p>
              Від окремого металевого вузла до готової промислової споруди — підбираємо
              формат участі під задачу, документацію та межі відповідальності.
            </p>
          </div>
          <div className="direction-grid">
            {directions.map((direction) => (
              <a className={`direction-card ${direction.className}`} href={direction.href} key={direction.number}>
                <Image
                  src={direction.image}
                  alt={direction.alt}
                  fill
                  sizes={direction.className === 'wide' ? '(max-width: 800px) 100vw, 65vw' : '(max-width: 800px) 100vw, 35vw'}
                />
                <span className="direction-shade" />
                <span className="direction-number">{direction.number}</span>
                <span className="direction-copy">
                  <strong>{direction.title}</strong>
                  <small>{direction.text}</small>
                </span>
                <span className="direction-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
          <p className="media-note">
            Візуальні матеріали ілюструють напрямки робіт. Портфоліо реалізованих об’єктів готується.
          </p>
        </div>
      </section>

      <section className="promise section" id="about">
        <div className="shell story-checker">
          <article className="story-row">
            <div className="promise-visual engineering-plan-visual">
              <Image
                src="/media/engineering-planning.jpg"
                alt="Фахівець опрацьовує архітектурні креслення та технічні плани"
                fill
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="image-note">Від креслення — до технічного рішення</span>
            </div>
            <div className="promise-copy">
              <p className="eyebrow light"><span /> Наша основа</p>
              <h2>За кожен об’єкт відповідаємо власним ім’ям</h2>
              <p className="promise-lead">
                RUBIKON BUILD об’єднує понад 30 років практичного досвіду Сергія Івановича
                та сучасну інженерну освіту Дмитра Сергійовича. Ми особисто контролюємо ключові
                етапи й відповідаємо за результат власним ім’ям.
              </p>
              <p className="story-support">
                Практика будівельного майданчика допомагає бачити реальні ризики, а інженерний
                підхід — заздалегідь перетворювати їх на зрозумілі технічні рішення.
              </p>
              <a className="section-link" href="/pro-nas">Більше про компанію <span aria-hidden="true">↗</span></a>
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
                src="/media/site-quality-control.jpg"
                alt="Перевірка точності металевої конструкції перед монтажем"
                fill
                sizes="(max-width: 1050px) 100vw, 46vw"
              />
              <span className="image-note">Точність перевіряємо на кожному етапі</span>
            </div>
          </article>
        </div>
      </section>

      <TeamSection />

      <section className="process section" id="process">
        <div className="shell">
          <div className="section-head section-head-balanced">
            <div className="section-heading-copy">
              <p className="eyebrow"><span /> Як ми працюємо</p>
              <h2>Від узгодження задачі<br />до приймання робіт</h2>
            </div>
            <p>Для об’єкта під ключ формуємо повний маршрут. Для окремого етапу чітко фіксуємо межі відповідальності, вимоги на вході та результат на виході.</p>
          </div>
          <ol className="steps">
            {steps.map(([number, title, text, Icon]) => (
              <li key={number}>
                <span>{number}</span>
                <Icon className="step-icon" aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <EstimateBrief />

      <section className="contact section" id="contact">
        <div className="shell contact-grid">
          <div>
            <p className="eyebrow light"><span /> Почнемо з розмови</p>
            <h2>Потрібна оцінка?<br />Обговорімо об’єкт</h2>
          </div>
          <div className="contact-panel">
            <p>
              Надішліть призначення об’єкта, місто та орієнтовні довжину, ширину й висоту.
              Уточнимо вихідні дані та пояснимо, що потрібно для попередньої оцінки.
            </p>
            <div className="contact-links" id="contact-note">
              <a className="pending-contact contact-phone" href="tel:+380682614264" aria-label="Зателефонувати за номером +38 068 261 42 64">
                <b><Phone aria-hidden="true" />Телефон</b><i>+38 068 261 42 64</i>
              </a>
              <span className="pending-contact"><b><Mail aria-hidden="true" />Email</b><i>буде додано</i></span>
              <div className="pending-contact contact-messenger-row">
                <b>
                  <MessagesSquare aria-hidden="true" />
                  <span>Месенджери<small>Telegram · WhatsApp · Viber</small></span>
                </b>
                <MessengerLinks className="contact-messengers" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
