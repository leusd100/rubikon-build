import Image from 'next/image';
import Link from 'next/link';
import { EstimateBrief, TeamSection } from './components/SiteChrome';

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
  {
    number: '04',
    title: 'Бетонні роботи',
    text: 'Фундаменти, промислові підлоги, монолітні ділянки та основи під конструкції й обладнання.',
    href: '/napryamky#betonni-roboty',
  },
  {
    number: '05',
    title: 'Фасадні системи',
    text: 'Монтаж, утеплення та оновлення фасадів з увагою до герметичності й складних примикань.',
    href: '/napryamky#fasady',
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
    title: 'Зерносховища',
    text: 'Основа, металевий каркас, огороджувальні конструкції та координація монтажу.',
    image: '/media/steel-beams.jpg',
    alt: 'Сталеві елементи для аграрної та промислової споруди',
    className: 'compact',
    href: '/napryamky#zernoskhovyshcha',
  },
  {
    number: '04',
    title: 'Бетонні роботи',
    text: 'Фундаменти, основи, промислові підлоги та монолітні елементи під задачу об’єкта.',
    image: '/media/industrial-yard.jpg',
    alt: 'Промисловий майданчик із будівельними конструкціями',
    className: 'concrete',
    href: '/napryamky#betonni-roboty',
  },
  {
    number: '05',
    title: 'Фасади та огородження',
    text: 'Фасадні системи, утеплення, герметизація та влаштування складних примикань.',
    image: '/images/architectural-sketch.jpg',
    alt: 'Архітектурний ескіз фасаду сучасної будівлі',
    className: 'facade',
    href: '/napryamky#fasady',
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
              Металоконструкції та ангари<br /><em>під ключ у Дніпрі</em>
            </h1>
            <p className="hero-lead">
              Проєктуємо, виготовляємо та монтуємо каркаси, ангари, склади й зерносховища.
              Основний регіон — Дніпро та область; масштабні промислові й аграрні об’єкти розглядаємо по Україні.
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
            <div><strong>30+</strong><span>років досвіду керівника</span></div>
            <div><strong>02</strong><span>покоління</span></div>
            <div><strong>DN</strong><span>основний регіон — Дніпро</span></div>
          </div>
        </div>
        <div className="hero-signature" aria-hidden="true">RUBIKON / BUILD</div>
      </section>

      <section className="manifesto" aria-label="Принципи RUBIKON BUILD">
        <div className="shell manifesto-grid">
          <span>01</span><strong>Досвід.</strong>
          <span>02</span><strong>Інженерія.</strong>
          <span>03</span><strong>Відповідальність.</strong>
        </div>
      </section>

      <section className="services section" id="services">
        <span className="ghost-word" aria-hidden="true">STEEL</span>
        <div className="shell">
          <div className="section-head section-head-balanced">
            <div className="section-heading-copy">
              <p className="eyebrow"><span /> Ключові напрямки</p>
              <h2>Що можемо<br />взяти на себе.</h2>
            </div>
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
              <h2>Каркаси та споруди для бізнесу й агросектору.</h2>
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
            <h2>За кожен об’єкт відповідаємо власним ім’ям.</h2>
            <p className="promise-lead">
              RUBIKON BUILD об’єднує понад 30 років практичного досвіду Сергія Івановича
              та сучасну інженерну освіту Дмитра Сергійовича. Ми особисто контролюємо ключові
              етапи й відповідаємо за результат власним ім’ям.
            </p>
            <div className="principles">
              <div><b>01</b><span><strong>Рішення до початку робіт</strong>Уточнюємо вихідні дані, конструктив і склад відповідальності.</span></div>
              <div><b>02</b><span><strong>Контроль ключових етапів</strong>Особисто стежимо за тим, що визначає міцність і довговічність.</span></div>
              <div><b>03</b><span><strong>Відкрита комунікація</strong>Пояснюємо рішення, погоджуємо зміни й не приховуємо складних моментів.</span></div>
              <div><b>04</b><span><strong>Родинна відповідальність</strong>Репутація компанії напряму пов’язана з нашими іменами.</span></div>
            </div>
            <blockquote className="brand-credo"><span>Наш принцип</span>Якість будівництва визначають деталі, яких після завершення вже не видно.</blockquote>
            <Link className="section-link" href="/pro-nas">Більше про компанію <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      </section>

      <TeamSection />

      <section className="process section" id="process">
        <div className="shell">
          <div className="section-head section-head-balanced">
            <div className="section-heading-copy">
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

      <EstimateBrief />

      <section className="contact section" id="contact">
        <div className="shell contact-grid">
          <div>
            <p className="eyebrow light"><span /> Почнемо з розмови</p>
            <h2>Потрібна оцінка?<br />Обговорімо об’єкт.</h2>
          </div>
          <div className="contact-panel">
            <p>
              Надішліть призначення об’єкта, місто та орієнтовні довжину, ширину й висоту.
              Уточнимо вихідні дані та пояснимо, що потрібно для попередньої оцінки.
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
