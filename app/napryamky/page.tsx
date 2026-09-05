import { Breadcrumbs, SectionHeader } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import { DirectionRouteList } from '../components/DirectionCards';
import { DirectionsHeroImageSequence } from '../components/DirectionsHeroImageSequence';
import { DirectionFaq, type DirectionFaqItem } from '../components/DirectionDetail';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/napryamky',
  title: brandedTitle('Оберіть напрям будівництва у Дніпрі'),
  description: 'Ангари, зерносховища, металоконструкції, бетонні й покрівельні роботи у Дніпрі. Оберіть напрям або опишіть завдання, якщо об’єкт поєднує кілька видів робіт.',
  socialTitle: `Оберіть напрям будівництва — ${company.name}`,
  socialDescription: 'П’ять напрямів промислового будівництва у Дніпрі. Один об’єкт може поєднувати кілька — підкажемо, які саме.',
  image: '/media-responsive/directions-sequence-angary-1200w.bf92dcbc.webp',
  imageAlt: `Промислові напрями будівництва ${company.name} — металевий каркас на будівельному майданчику`,
});

export default function DirectionsPage() {
  const faqItems: DirectionFaqItem[] = [
    ['Де ви працюєте?', 'Основний регіон — Дніпро та Дніпропетровська область. Масштабні промислові й аграрні об’єкти розглядаємо по всій Україні.'],
    ['З чого починається робота?', 'Із короткого опису завдання, вивчення вихідних даних та, за потреби, виїзду на майданчик.'],
    ['Не впевнені, який напрямок підходить?', 'Опишіть завдання своїми словами в короткій формі. Якщо об’єкт поєднує кілька напрямків, це можна визначити вже під час першого обговорення.'],
  ];

  return (
    <main className="inner-page" id="main-content">
      <section className="subhero subhero-media directions-subhero">
        <DirectionsHeroImageSequence />
        <div className="subhero-overlay" />
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div className="subhero-copy">
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Напрямки', href: siteRoutes.directions }]} />
            <p className="eyebrow light"><span /> Сфери компетенції</p>
            <h1>
              <span className="subhero-title-line">Оберіть напрям робіт</span>
              <span className="subhero-title-line">або опишіть <em>комплексне завдання</em></span>
            </h1>
          </div>
          <div className="subhero-side">
            <p>Перейдіть до потрібного виду робіт. Якщо об’єкт поєднує кілька напрямків — одразу опишіть завдання, і ми допоможемо визначити склад робіт.</p>
            <div className="directions-hero-actions">
              <a className="button button-primary subhero-side-cta" href="#directions-list">
                Обрати напрям <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#inquiry">
                Описати завдання <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section directions-index" id="directions-list">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="П’ять напрямків"
            title="Оберіть потрібний вид робіт"
            supporting="Кожен пункт веде до конкретних можливостей, процесу й орієнтирів вартості. Для комплексного об’єкта можна почати з будь-якого близького напрямку."
          />
          <DirectionRouteList />
        </div>
      </section>

      {/* Was two separate page-section scenes with near-identical grammar and no media/structure —
          individually fine, back to back they read as one section accidentally split in half.
          Merged into one scene: two named modes of cooperation under a single shared frame,
          divided by one hairline instead of two full section-spaces of near-empty whitespace.
          Both original messages are kept in full — nothing cut, nothing new claimed. */}
      <section className="page-section">
        <div className="shell">
          <p className="eyebrow"><span /> Формати співпраці</p>
          <div className="cooperation-split">
            <article className="cooperation-mode">
              <span>Комплексні об’єкти</span>
              <h2>Коли один об’єкт поєднує кілька напрямків</h2>
              <p>Багато промислових та аграрних об’єктів не обмежуються одним видом робіт. Наприклад, ангар може одночасно включати бетонну основу, металевий каркас і покрівлю. У такому випадку важливо узгодити послідовність етапів, стики між ними та межі відповідальності ще до початку робіт.</p>
            </article>
            <article className="cooperation-mode">
              <span>Якщо проєкт уже сформований</span>
              <h2>Можемо долучитися до окремої частини робіт</h2>
              <p>Якщо у вас уже є проєкт, документація або визначений обсяг робіт, можемо долучитися як підрядник або субпідрядник на конкретний етап. До початку робіт уточнюємо вихідні дані, технічні вимоги, склад робіт і межі нашої відповідальності.</p>
            </article>
          </div>
        </div>
      </section>

      <DirectionFaq title="Коротко про головне" items={faqItems} />
      <InquirySection eyebrow="Почнемо з розмови" title="Не впевнені, який напрямок підходить? Опишіть завдання — розберемося разом." />
    </main>
  );
}
