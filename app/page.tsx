import Image from 'next/image';
import BeforeAfter from './BeforeAfter';

const services = [
  {
    number: '01',
    title: 'Металоконструкції',
    text: 'Проєктування, виготовлення та монтаж каркасів, ферм, балок і складних металевих вузлів.',
  },
  {
    number: '02',
    title: 'Ангари та склади',
    text: 'Швидкомонтовані споруди для виробництва, логістики, агросектору й комерційних задач.',
  },
  {
    number: '03',
    title: 'Зерносховища під ключ',
    text: 'Комплексна реалізація: підготовка основи, каркас, огороджувальні конструкції та монтаж.',
  },
  {
    number: '04',
    title: 'Фасадні роботи',
    text: 'Монтаж, утеплення й оновлення фасадів із контролем герметичності та довговічності вузлів.',
  },
  {
    number: '05',
    title: 'Комплексне будівництво',
    text: 'Координуємо суміжні будівельні роботи та ведемо об’єкт від першого рішення до здачі.',
  },
];

const steps = [
  ['01', 'Знайомство', 'Уточнюємо задачу, тип об’єкта, умови та бажаний результат.'],
  ['02', 'Виїзд і заміри', 'Оглядаємо майданчик, фіксуємо обсяги та технічні особливості.'],
  ['03', 'Рішення та кошторис', 'Готуємо пропозицію з переліком робіт, строками й бюджетом.'],
  ['04', 'Виготовлення і монтаж', 'Організовуємо процес та контролюємо якість ключових етапів.'],
  ['05', 'Перевірка і здача', 'Разом перевіряємо результат і закриваємо виконані роботи.'],
];

const directions = [
  {
    number: '01',
    title: 'Несучі металоконструкції',
    text: 'Виготовлення та монтаж каркасів, балок, ферм і складних металевих вузлів.',
    image: '/media/steel-welding.jpg',
    alt: 'Зварювання великої сталевої балки на виробничому майданчику',
    className: 'wide',
  },
  {
    number: '02',
    title: 'Ангари та склади',
    text: 'Швидкомонтовані споруди для виробництва, логістики, агросектору та зберігання.',
    image: '/media/industrial-yard.jpg',
    alt: 'Промисловий складський майданчик зі сталевими конструкціями',
    className: 'tall',
  },
  {
    number: '03',
    title: 'Сталь і комплектування',
    text: 'Продумані конструктивні рішення, підбір матеріалів і контроль кожного етапу.',
    image: '/media/steel-beams.jpg',
    alt: 'Склад металевих балок для промислового будівництва',
    className: 'compact',
  },
];

function Brand() {
  return (
    <span className="brand" aria-label="Rubicon Build">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-r">R</span>
        <span className="brand-b">B</span>
      </span>
      <span className="brand-name">
        <b>RUBICON BUILD</b>
        <small>Steel &amp; construction</small>
      </span>
    </span>
  );
}

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <div className="shell nav-wrap">
          <a className="brand-link" href="#top" aria-label="Рубікон Білд — на початок сторінки">
            <Brand />
          </a>
          <nav className="desktop-nav" aria-label="Основна навігація">
            <a href="#services">Послуги</a>
            <a href="#directions">Напрямки</a>
            <a href="#result">До / після</a>
            <a href="#about">Про компанію</a>
            <a href="#process">Як працюємо</a>
          </nav>
          <a className="header-cta" href="#contact">
            Отримати оцінку <span aria-hidden="true">↗</span>
          </a>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero-media" aria-hidden="true">
          <video autoPlay muted loop playsInline preload="metadata" poster="/media/hero-welding.jpg">
            <source src="/media/hero-welding.mp4" type="video/mp4" media="(min-width: 761px)" />
          </video>
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="shell hero-layout">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Family construction / Ukraine</p>
            <h1>
              Металоконструкції, ангари<br />та промислові об’єкти<br /><em>під ключ</em>
            </h1>
            <p className="hero-lead">
              Проєктуємо, виготовляємо та монтуємо у Дніпрі й Дніпропетровській області.
              Для масштабних промислових та аграрних об’єктів працюємо по Україні.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#contact">
                Отримати попередню оцінку <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href="#services">
                Дивитися напрямки <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
          <div className="hero-rail" aria-label="Ключові факти">
            <div><strong>30+</strong><span>років досвіду</span></div>
            <div><strong>02</strong><span>покоління</span></div>
            <div><strong>UA</strong><span>географія робіт</span></div>
          </div>
        </div>
        <div className="hero-signature" aria-hidden="true">RUBICON / BUILD</div>
      </section>

      <section className="services section" id="services">
        <span className="ghost-word" aria-hidden="true">STEEL</span>
        <div className="shell">
          <div className="section-head">
            <p className="eyebrow"><span /> Що ми будуємо</p>
            <h2>Складні задачі.<br />Зрозумілий результат.</h2>
            <p>
              Ключова спеціалізація — металоконструкції та промислові споруди. За потреби
              беремо на себе комплекс суміжних робіт.
            </p>
          </div>
          <div className="service-list">
            {services.map((service) => (
              <article className="service-card" key={service.number}>
                <span className="service-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <span className="service-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="directions section" id="directions">
        <div className="shell">
          <div className="directions-head">
            <div>
              <p className="eyebrow light"><span /> Сфери компетенції</p>
              <h2>Працюємо там, де потрібні міцність, масштаб і відповідальність.</h2>
            </div>
            <p>
              Поєднуємо практику будівельного майданчика з сучасним інженерним підходом —
              від окремого металевого вузла до готової промислової споруди.
            </p>
          </div>
          <div className="direction-grid">
            {directions.map((direction) => (
              <article className={`direction-card ${direction.className}`} key={direction.number}>
                <Image
                  src={direction.image}
                  alt={direction.alt}
                  fill
                  sizes={direction.className === 'wide' ? '(max-width: 800px) 100vw, 65vw' : '(max-width: 800px) 100vw, 35vw'}
                />
                <div className="direction-shade" />
                <span className="direction-number">{direction.number}</span>
                <div className="direction-copy">
                  <h3>{direction.title}</h3>
                  <p>{direction.text}</p>
                </div>
                <span className="direction-arrow" aria-hidden="true">↗</span>
              </article>
            ))}
          </div>
          <p className="media-note">
            Візуальні матеріали ілюструють напрямки робіт. Портфоліо реалізованих об’єктів готується.
          </p>
        </div>
      </section>

      <section className="transformation section" id="result">
        <div className="shell">
          <div className="transformation-head">
            <div>
              <p className="eyebrow"><span /> Результат у деталях</p>
              <h2>Від робочого процесу — до готового простору.</h2>
            </div>
            <p>
              Будівництво має цінність лише тоді, коли ним зручно користуватися. Порівняйте стан
              приміщення під час робіт і після завершення оздоблення.
            </p>
          </div>
          <BeforeAfter />
        </div>
      </section>

      <section className="promise section" id="about">
        <div className="shell promise-grid">
          <div className="promise-visual">
            <Image
              src="/images/concept-sketch.jpg"
              alt="Ескіз сучасної будівлі на етапі проєктування"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
            />
            <span className="image-note">Проєктуємо з думкою про реалізацію</span>
          </div>
          <div className="promise-copy">
            <p className="eyebrow light"><span /> Наша основа</p>
            <h2>Репутація будується довше, ніж будь-який об’єкт.</h2>
            <p className="promise-lead">
              RUBICON BUILD об’єднує понад 30 років практичного досвіду Сергія Івановича
              та сучасну інженерну освіту Дмитра Сергійовича. Ми особисто контролюємо ключові
              етапи й відповідаємо за результат власним ім’ям.
            </p>
            <div className="principles">
              <div><b>01</b><span><strong>Якість у деталях</strong>Працюємо так, щоб не повертатися до переробок.</span></div>
              <div><b>02</b><span><strong>Дотримання строків</strong>Плануємо реалістично й тримаємо слово.</span></div>
              <div><b>03</b><span><strong>Інженерний підхід</strong>Рішення мають бути обґрунтованими та надійними.</span></div>
              <div><b>04</b><span><strong>Офіційна робота</strong>Фіксуємо домовленості та відповідаємо за результат.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="team section">
        <div className="shell">
          <div className="section-head compact">
            <p className="eyebrow"><span /> Люди за результатом</p>
            <h2>Досвід двох поколінь</h2>
          </div>
          <div className="team-grid">
            <article className="person-card">
              <div className="person-photo">
                <Image src="/images/founder.png" alt="Леус Сергій Іванович — засновник будівельного напрямку RUBICON BUILD" fill sizes="(max-width: 700px) 100vw, 40vw" />
              </div>
              <div className="person-info">
                <span>Засновник / керівник будівельного напрямку</span>
                <h3>Леус Сергій Іванович</h3>
                <p>Понад 30 років практичного досвіду, організація робіт і особистий контроль якості на майданчику.</p>
              </div>
            </article>
            <article className="person-card">
              <div className="person-photo">
                <Image src="/images/next-generation.png" alt="Леус Дмитро Сергійович — інженер RUBICON BUILD" fill sizes="(max-width: 700px) 100vw, 40vw" />
              </div>
              <div className="person-info">
                <span>Інженер / розвиток компанії</span>
                <h3>Леус Дмитро Сергійович</h3>
                <p>Фахова освіта у сфері цивільного та промислового будівництва, сучасна комунікація й системний підхід.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="process section" id="process">
        <div className="shell">
          <div className="section-head horizontal">
            <div>
              <p className="eyebrow"><span /> Як ми працюємо</p>
              <h2>Від першої розмови<br />до здачі об’єкта</h2>
            </div>
            <p>Кожен проєкт має власні умови. Незмінним залишається порядок, прозора комунікація та контроль результату.</p>
          </div>
          <ol className="steps">
            {steps.map(([number, title, text]) => (
              <li key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="region section">
        <div className="shell region-card">
          <div className="region-mark" aria-hidden="true">UA</div>
          <div>
            <p className="eyebrow light"><span /> Географія робіт</p>
            <h2>Дніпро та Дніпропетровська область — наша основна територія.</h2>
            <p>Для масштабних промислових, складських та аграрних об’єктів працюємо також в інших регіонах України.</p>
          </div>
          <a className="round-link" href="#contact" aria-label="Обговорити об’єкт в іншому регіоні">↗</a>
        </div>
      </section>

      <section className="contact section" id="contact">
        <div className="shell contact-grid">
          <div>
            <p className="eyebrow light"><span /> Почнемо з розмови</p>
            <h2>Потрібна оцінка?<br />Обговорімо об’єкт.</h2>
          </div>
          <div className="contact-panel">
            <p>
              Опишіть тип об’єкта, орієнтовні розміри та бажані строки. Уточнимо задачу,
              відповімо на запитання й запропонуємо наступний крок.
            </p>
            <div className="contact-links" id="contact-note">
              <span className="pending-contact">Телефон <i>буде додано</i></span>
              <span className="pending-contact">Email <i>буде додано</i></span>
              <span className="pending-contact">Telegram <i>буде додано</i></span>
              <span className="pending-contact">WhatsApp / Viber <i>буде додано</i></span>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="shell footer-grid">
          <Brand />
          <p>Металоконструкції та промислове будівництво</p>
          <span>© {new Date().getFullYear()} RUBICON BUILD</span>
        </div>
      </footer>
    </main>
  );
}
