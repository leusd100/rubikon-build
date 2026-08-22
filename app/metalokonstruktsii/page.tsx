import type { Metadata } from 'next';
import Image from 'next/image';
import { PageCta } from '../components/SiteChrome';

const liveUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';

export const metadata: Metadata = {
  title: 'Виготовлення та монтаж металоконструкцій у Дніпрі | RUBICON BUILD',
  description: 'Проєктування, виготовлення й монтаж металоконструкцій у Дніпрі та області: каркаси, колони, балки, ферми й нестандартні металеві вузли.',
  alternates: { canonical: '/metalokonstruktsii' },
  openGraph: {
    title: 'Металоконструкції у Дніпрі | RUBICON BUILD',
    description: 'Каркаси, ферми, балки, колони та монтаж металевих конструкцій.',
    url: '/metalokonstruktsii',
    images: [{ url: `${liveUrl}/media/steel-welding.jpg`, alt: 'Виготовлення металоконструкцій RUBICON BUILD' }],
  },
  twitter: { card: 'summary_large_image', images: [`${liveUrl}/media/steel-welding.jpg`] },
};

const steps = [
  ['01', 'Вихідні дані', 'Уточнюємо призначення конструкції, геометрію, навантаження та умови монтажу.'],
  ['02', 'Технічне рішення', 'Формуємо конструктивну схему, вузли, склад матеріалів і послідовність робіт.'],
  ['03', 'Виготовлення', 'Організовуємо заготівлю, складання, зварювання та підготовку конструкцій до монтажу.'],
  ['04', 'Монтаж', 'Доставляємо елементи на об’єкт, виконуємо складання та контролюємо ключові з’єднання.'],
];

export default function SteelPage() {
  return (
    <main className="inner-page">
      <section className="service-subhero">
        <div className="service-subhero-media"><Image src="/media/steel-welding.jpg" alt="Зварювання сталевої конструкції" fill priority sizes="100vw" /></div>
        <div className="service-subhero-overlay" />
        <div className="shell service-subhero-content">
          <p className="breadcrumb">Головна / Напрямки / Металоконструкції</p>
          <p className="eyebrow light"><span /> Напрямок 01</p>
          <h1>Металоконструкції<br /><em>від деталі до монтажу.</em></h1>
          <p>Виготовляємо та монтуємо металеві конструкції для промислових, складських, аграрних і комерційних об’єктів.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="shell page-two-col align-start">
          <div className="sticky-heading">
            <p className="eyebrow"><span /> Що виконуємо</p>
            <h2>Несуча основа, розрахована на реальну експлуатацію.</h2>
          </div>
          <div className="feature-list">
            <article><span>01</span><h3>Каркаси будівель</h3><p>Колони, ригелі, балки та зв’язки для промислових, складських і комерційних споруд.</p></article>
            <article><span>02</span><h3>Ферми та балки</h3><p>Елементи покриття й перекриття з урахуванням прольотів, навантажень і монтажної схеми.</p></article>
            <article><span>03</span><h3>Опорні конструкції</h3><p>Майданчики, сходи, рами та допоміжні конструкції для обладнання й технологічних потреб.</p></article>
            <article><span>04</span><h3>Нестандартні вузли</h3><p>Виготовлення деталей і з’єднань під конкретну задачу, креслення або наявні умови об’єкта.</p></article>
          </div>
        </div>
      </section>

      <section className="page-section page-section-dark">
        <div className="shell">
          <div className="page-heading split-heading">
            <div><p className="eyebrow light"><span /> Послідовність</p><h2>Керуємо не лише металом, а всім процесом.</h2></div>
            <p>Надійність конструкції залежить від точності вихідних даних, якості виготовлення та правильної роботи на монтажі.</p>
          </div>
          <ol className="detail-steps">
            {steps.map(([number, title, text]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="page-section">
        <div className="shell page-two-col">
          <div className="page-image"><Image src="/media/steel-beams.jpg" alt="Склад металевих балок" fill sizes="(max-width: 850px) 100vw, 48vw" /></div>
          <div className="copy-column">
            <p className="eyebrow"><span /> Контроль якості</p>
            <h2>Увага до вузлів, які визначають надійність.</h2>
            <p className="lead-copy">Перевіряємо геометрію, відповідність елементів, підготовку поверхонь і якість ключових з’єднань на етапах виготовлення та монтажу.</p>
            <p>Остаточний склад контролю залежить від проєкту, призначення конструкції та вимог замовника. Технічні рішення погоджуємо до початку виконання робіт.</p>
          </div>
        </div>
      </section>

      <section className="page-section faq-section">
        <div className="shell faq-grid">
          <div><p className="eyebrow"><span /> Питання</p><h2>Перед замовленням</h2></div>
          <div className="faq-list">
            <article><h3>Чи працюєте за готовим проєктом?</h3><p>Так. Спочатку перевіряємо комплектність вихідних даних і погоджуємо межі відповідальності.</p></article>
            <article><h3>Чи можна замовити тільки монтаж?</h3><p>Можна, якщо конструкції та документація придатні для безпечного й якісного виконання робіт.</p></article>
            <article><h3>Як формується вартість?</h3><p>На неї впливають тоннаж, складність вузлів, покриття, логістика, умови майданчика та обсяг монтажу.</p></article>
          </div>
        </div>
      </section>
      <PageCta eyebrow="Обговорити металоконструкції" title="Є креслення або лише задача? Почнемо з вихідних даних." />
    </main>
  );
}
