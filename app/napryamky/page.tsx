import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumbs, PageCta } from '../components/SiteChrome';

const liveUrl = 'https://rubicon-build.bronze-spoon-6603.chatgpt.site';

export const metadata: Metadata = {
  title: 'Напрямки будівництва у Дніпрі та області | RUBICON BUILD',
  description: 'Металоконструкції, ангари, склади, зерносховища, фасадні роботи та комплексне промислове будівництво у Дніпрі й області.',
  alternates: { canonical: '/napryamky' },
  openGraph: {
    title: 'Напрямки робіт RUBICON BUILD',
    description: 'Від металевого вузла до готової промислової споруди.',
    url: '/napryamky',
    images: [{ url: `${liveUrl}/media/industrial-yard.jpg`, alt: 'Промислове будівництво RUBICON BUILD' }],
  },
  twitter: { card: 'summary_large_image', images: [`${liveUrl}/media/industrial-yard.jpg`] },
};

const services = [
  { number: '01', title: 'Металоконструкції', text: 'Каркаси, колони, балки, ферми, опорні та нестандартні металеві вузли. Організовуємо виготовлення, доставку й монтаж.', href: '/metalokonstruktsii', id: 'metalokonstruktsii' },
  { number: '02', title: 'Ангари та склади', text: 'Швидкомонтовані споруди для виробництва, логістики, техніки, матеріалів і готової продукції.', href: '/angary', id: 'angary' },
  { number: '03', title: 'Зерносховища під ключ', text: 'Підготовка основи, металевий каркас, огороджувальні конструкції, монтаж і координація суміжних етапів.', id: 'zernoskhovyshcha' },
  { number: '04', title: 'Фасадні роботи', text: 'Монтаж, утеплення та оновлення фасадів із увагою до герметичності, примикань і довговічності системи.', id: 'fasady' },
  { number: '05', title: 'Комплексне будівництво', text: 'Підбираємо склад робіт під задачу й координуємо процес від підготовки майданчика до перевірки результату.', id: 'kompleksne-budivnytstvo' },
];

export default function DirectionsPage() {
  return (
    <main className="inner-page">
      <section className="subhero subhero-media">
        <Image src="/media/industrial-yard.jpg" alt="Промисловий складський майданчик" fill priority sizes="100vw" />
        <div className="subhero-overlay" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Напрямки', href: '/napryamky' }]} />
            <p className="eyebrow light"><span /> Сфери компетенції</p>
            <h1>Будуємо з металу.<br /><em>Від вузла — до об’єкта.</em></h1>
          </div>
          <div className="subhero-side">
            <p>Формуємо склад робіт під конкретну задачу: від окремих конструкцій до комплексної реалізації промислової або аграрної споруди.</p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="page-heading split-heading">
            <div>
              <p className="eyebrow"><span /> Що ми робимо</p>
              <h2>П’ять напрямків. Один відповідальний підхід.</h2>
            </div>
            <p>Точний перелік робіт визначаємо після знайомства з об’єктом, вихідними даними та очікуваним результатом.</p>
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
          <div className="media-tile media-tile-large"><Image src="/media/steel-welding.jpg" alt="Зварювання сталевої конструкції" fill sizes="(max-width: 800px) 100vw, 60vw" /></div>
          <div className="media-tile"><Image src="/media/steel-beams.jpg" alt="Сталеві балки для промислового будівництва" fill sizes="(max-width: 800px) 100vw, 40vw" /></div>
        </div>
        <p className="shell media-note dark-note">Візуальні матеріали ілюструють напрямки робіт. Власне портфоліо буде додано окремим розділом.</p>
      </section>

      <section className="page-section faq-section">
        <div className="shell faq-grid">
          <div><p className="eyebrow"><span /> Перед стартом</p><h2>Коротко про головне</h2></div>
          <div className="faq-list">
            <article><h3>Де ви працюєте?</h3><p>Основний регіон — Дніпро та Дніпропетровська область. Цікаві масштабні об’єкти розглядаємо по всій Україні.</p></article>
            <article><h3>Чи берете об’єкти під ключ?</h3><p>Так, коли можемо відповідально сформувати й проконтролювати весь необхідний склад робіт.</p></article>
            <article><h3>З чого починається робота?</h3><p>Із короткого опису задачі, вивчення вихідних даних та, за потреби, виїзду на майданчик.</p></article>
          </div>
        </div>
      </section>
      <PageCta />
    </main>
  );
}
