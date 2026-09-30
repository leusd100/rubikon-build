import { Breadcrumbs, HeroCallLink, SectionHeader } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionRouteList } from '../components/DirectionCards';
import { DirectionsHeroImageSequence } from '../components/DirectionsHeroImageSequence';
import { DirectionFaq, type DirectionFaqItem } from '../components/DirectionDetail';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { entryPoints, formatCards } from '../lib/deliveryModelPresentation';

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
    ['Де ви працюєте?', company.geography],
    ['З чого починається робота?', 'Із короткого опису завдання, вивчення вихідних даних та, за потреби, виїзду на майданчик.'],
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
            <p>Перейдіть до потрібного виду робіт. Якщо для об’єкта потрібні кілька видів робіт, опишіть завдання — допоможемо визначити їхній склад.</p>
            <div className="directions-hero-actions">
              <a className="button button-primary subhero-side-cta" href="#directions-list">
                Обрати напрям <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#inquiry">
                Обговорити задачу <span aria-hidden="true">↗</span>
              </a>
            </div>
            <HeroCallLink />
          </div>
        </div>
      </section>

      <section className="page-section directions-index" id="directions-list">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="П’ять напрямків"
            title="Оберіть потрібний вид робіт"
            supporting="Кожен пункт веде до конкретних можливостей, процесу й чинників вартості. Для комплексного об’єкта можна почати з будь-якого близького напрямку."
          />
          <DirectionRouteList />
        </div>
      </section>

      {/* One scene, two axes from the Delivery Model: how RUBIKON participates (the three formats)
          and what the visitor already has (where the work starts). A project or documentation is an
          entry point, not a fourth format. Kept to a routing aid — the full route is a later page. */}
      <section className="page-section">
        <div className="shell">
          <p className="eyebrow"><span /> Формати участі</p>
          <div className="cooperation-split cooperation-split-three">
            {formatCards().map(({ id, number, title, text }) => (
              <article className="cooperation-mode" key={id}>
                <span>{number}</span>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <div className="entry-points">
            <h2 className="entry-points-title">Що у вас уже є — з того й почнемо</h2>
            <p className="entry-points-lead">Звертайтеся і з початковою ідеєю, і з готовим проєктом. Переглянемо те, що вже є, та скажемо, які дані потрібні, щоб визначити склад робіт і підготувати кошторис.</p>
            <ul className="entry-points-list">
              {entryPoints().map(({ id, label, startNote }) => (
                <li key={id}>
                  <b>{label}</b>
                  {startNote && <small>{startNote}</small>}
                </li>
              ))}
            </ul>
          </div>
          <a className="section-link" href={`${siteRoutes.process}#formaty`}>Детально про формати й етапи <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <DirectionFaq title="Коротко про головне" items={faqItems} />
      <ConversationSection title="Не впевнені, який напрямок підходить? Опишіть завдання — розберемося разом." />
    </main>
  );
}
