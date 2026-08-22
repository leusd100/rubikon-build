import Image from 'next/image';
import Link from 'next/link';
import { TeamSection } from './components/SiteChrome';

const services = [
  {
    number: '01',
    title: 'Металоконструкції',
    text: 'Проєктування, виготовлення та монтаж каркасів, ферм, балок і складних металевих вузлів.',
    href: '/metalokonstruktsii',
  },
  {
    number: '02',
    title: 'Ангари та склади',
    text: 'Швидкомонтовані споруди для виробництва, логістики, агросектору й комерційних задач.',
    href: '/angary',
  },
  {
    number: '03',
    title: 'Зерносховища під ключ',
    text: 'Комплексна реалізація: основа, каркас, огороджувальні конструкції та монтаж.',
    href: '/napryamky#zernoskhovyshcha',
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
    href: '/metalokonstruktsii',
  },
  {
    number: '02',
    title: 'Ангари та склади',
    text: 'Швидкомонтовані споруди для виробництва, логістики, агросектору та зберігання.',
    image: '/media/industrial-yard.jpg',
    alt: 'Промисловий складський майданчик зі сталевими конструкціями',
    className: 'tall',
    href: '/angary',
  },
  {
    number: '03',
    title: 'Комплексні рішення',
    text: 'Зерносховища, фасади, комплектування та координація суміжних робіт.',
    image: '/media/steel-beams.jpg',
    alt: 'Склад металевих балок для промислового будівництва',
    className: 'compact',
    href: '/napryamky',
  },
];

export default function Home() {
  return (
    <main>
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
            <p className="eyebrow"><span /> Родинна будівельна компанія / Україна</p>
            <h1>
              Металоконструкції, ангари<br />та промислові об’єкти<br /><em>під ключ</em>
            </h1>
            <p className="hero-lead">
              Проєктуємо, виготовляємо та монтуємо у Дніпрі й Дніпропетровській області.
              Для масштабних промислових та аграрних об’єктів працюємо по Україні.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="#contact">
                Отримати попередню оцінку <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href="/napryamky">
                Дивитися напрямки <span aria-hidden="true">↗</span>
              </Link>
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
            <p className="eyebrow"><span /> Ключові напрямки</p>
            <h2>Складні задачі.<br />Зрозумілий результат.</h2>
            <p>
              Основна спеціалізація — металоконструкції та промислові споруди. За потреби
              беремо на себе комплекс суміжних робіт.
            </p>
          </div>
          <div className="service-list">
            {services.map((service) => (
              <Link className="service-card" href={service.href} key={service.number}>
                <span className="service-number">{service.number}</span>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <span className="service-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
          <Link className="section-link" href="/napryamky">Усі напрямки робіт <span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="directions section" id="directions">
        <div className="shell">
          <div className="directions-head">
            <div>
              <p className="eyebrow light"><span /> Сфери компетенції</p>
              <h2>Міцність, масштаб і відповідальність.</h2>
            </div>
            <p>
              Поєднуємо практику будівельного майданчика з сучасним інженерним підходом —
              від окремого металевого вузла до готової промислової споруди.
            </p>
          </div>
          <div className="direction-grid">
            {directions.map((direction) => (
              <Link className={`direction-card ${direction.className}`} href={direction.href} key={direction.number}>
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
              </Link>
            ))}
          </div>
          <p className="media-note">
            Візуальні матеріали ілюструють напрямки робіт. Портфоліо реалізованих об’єктів готується.
          </p>
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
              <div><b>02</b><span><strong>Реалістичні строки</strong>Плануємо етапи й відкрито говоримо про перебіг робіт.</span></div>
              <div><b>03</b><span><strong>Інженерний підхід</strong>Рішення мають бути обґрунтованими та надійними.</span></div>
              <div><b>04</b><span><strong>Особиста відповідальність</strong>Фіксуємо домовленості та контролюємо результат.</span></div>
            </div>
            <Link className="section-link" href="/pro-nas">Більше про компанію <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <TeamSection />

      <section className="process section" id="process">
        <div className="shell">
          <div className="section-head horizontal">
            <div>
              <p className="eyebrow"><span /> Як ми працюємо</p>
              <h2>Від першої розмови<br />до здачі об’єкта</h2>
            </div>
            <p>Кожен проєкт має власні умови. Незмінними залишаються порядок, прозора комунікація та контроль результату.</p>
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
            <h2>Дніпро та область — наша основна територія.</h2>
            <p>Для масштабних промислових, складських та аграрних об’єктів працюємо також в інших регіонах України.</p>
          </div>
          <Link className="round-link" href="#contact" aria-label="Обговорити об’єкт в іншому регіоні">↗</Link>
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
    </main>
  );
}
