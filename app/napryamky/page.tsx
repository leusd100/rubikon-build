import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumbs, PageCta } from '../components/SiteChrome';

const liveUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';

export const metadata: Metadata = {
  title: 'Напрямки будівництва у Дніпрі | RUBIKON BUILD',
  description: 'Металоконструкції, ангари, склади, зерносховища, бетонні та фасадні роботи у Дніпрі й області: під ключ або як окремий етап.',
  alternates: { canonical: '/napryamky' },
  openGraph: {
    title: 'Напрямки робіт RUBIKON BUILD',
    description: 'Повний цикл будівництва або окремі роботи як підрядник чи субпідрядник.',
    url: '/napryamky',
    images: [{ url: `${liveUrl}/media/hero-steel-frame.jpg`, alt: 'Промислове будівництво RUBIKON BUILD' }],
  },
  twitter: { card: 'summary_large_image', images: [`${liveUrl}/media/hero-steel-frame.jpg`] },
};

const services = [
  { number: '01', title: 'Металоконструкції', text: 'Каркаси, колони, балки, ферми, опорні та нестандартні металеві вузли. Організовуємо виготовлення, доставку й монтаж.', href: '/metalokonstruktsii', id: 'metalokonstruktsii' },
  { number: '02', title: 'Ангари та склади', text: 'Швидкомонтовані споруди для виробництва, логістики, техніки, матеріалів і готової продукції.', href: '/angary', id: 'angary' },
  { number: '03', title: 'Зерносховища під ключ', text: 'Підготовка основи, металевий каркас, огороджувальні конструкції, монтаж і координація суміжних етапів.', id: 'zernoskhovyshcha' },
  { number: '04', title: 'Бетонні роботи', text: 'Фундаменти, основи під конструкції та обладнання, промислові підлоги й монолітні ділянки відповідно до задачі об’єкта.', id: 'betonni-roboty' },
  { number: '05', title: 'Фасадні роботи', text: 'Монтаж, утеплення та оновлення фасадів із увагою до герметичності, примикань і довговічності системи.', id: 'fasady' },
  { number: '06', title: 'Комплексне будівництво', text: 'Підбираємо склад робіт під задачу й координуємо процес від підготовки майданчика до перевірки результату.', id: 'kompleksne-budivnytstvo' },
];

export default function DirectionsPage() {
  return (
    <main className="inner-page">
      <section className="subhero subhero-media">
        <Image src="/media/hero-steel-frame.jpg" alt="Монтаж сталевого каркаса промислової споруди" fill priority sizes="100vw" />
        <div className="subhero-overlay" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Напрямки', href: '/napryamky' }]} />
            <p className="eyebrow light"><span /> Сфери компетенції</p>
            <h1>Від окремої роботи<br /><em>до готового об’єкта</em></h1>
          </div>
          <div className="subhero-side">
            <p>Беремо об’єкти під ключ або виконуємо визначений етап як підрядник чи субпідрядник. Межі відповідальності узгоджуємо до початку робіт.</p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="page-heading split-heading">
            <div>
              <p className="eyebrow"><span /> Що ми робимо</p>
              <h2>Шість напрямків. Один відповідальний підхід</h2>
            </div>
            <p>Точний перелік робіт визначаємо після знайомства з об’єктом. Можемо сформувати весь цикл або долучитися лише там, де потрібна наша компетенція.</p>
          </div>
          <div className="route-service-list">
            {services.map((service) => {
              const content = (
                <>
                  <span>{service.number}</span>
                  <div><h3>{service.title}</h3><p>{service.text}</p></div>
                  <b aria-hidden="true">{service.href ? '↗' : '—'}</b>
                </>
              );
              return service.href ? (
                <Link className="route-service" href={service.href} id={service.id} key={service.number}>{content}</Link>
              ) : (
                <article className="route-service" id={service.id} key={service.number}>{content}</article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="page-section page-media-band">
        <div className="shell page-media-grid">
          <div className="media-tile media-tile-large"><Image src="/media/competence-steel.jpg" alt="Зварювання несучої сталевої конструкції" fill sizes="(max-width: 800px) 100vw, 60vw" /></div>
          <div className="media-tile"><Image src="/media/competence-grain.jpg" alt="Промислове зерносховище біля поля" fill sizes="(max-width: 800px) 100vw, 40vw" /></div>
        </div>
        <p className="shell media-note dark-note">Візуальні матеріали ілюструють напрямки робіт. Власне портфоліо буде додано окремим розділом.</p>
      </section>

      <section className="page-section faq-section">
        <div className="shell faq-grid">
          <div><p className="eyebrow"><span /> Перед стартом</p><h2>Коротко про головне</h2></div>
          <div className="faq-list">
            <article><h3>Де ви працюєте?</h3><p>Основний регіон — Дніпро та Дніпропетровська область. Цікаві масштабні об’єкти розглядаємо по всій Україні.</p></article>
            <article><h3>Під ключ чи окремий етап?</h3><p>Працюємо в обох форматах: ведемо погоджений комплекс робіт або долучаємося як підрядник чи субпідрядник до конкретного етапу.</p></article>
            <article><h3>З чого починається робота?</h3><p>Із короткого опису задачі, вивчення вихідних даних та, за потреби, виїзду на майданчик.</p></article>
          </div>
        </div>
      </section>
      <PageCta />
    </main>
  );
}
