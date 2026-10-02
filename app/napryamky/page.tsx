import { Breadcrumbs, HeroCallLink, SectionHeader } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionsCatalog, type CatalogItem } from '../components/directions/DirectionsCatalog';
import { DirectionsHeroImageSequence } from '../components/DirectionsHeroImageSequence';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { formatCards } from '../lib/deliveryModelPresentation';
import { deliveryModel } from '../data/deliveryModel';
import { FormatsScope } from '../components/directions/FormatsScope';
import { StartTrack } from '../components/directions/StartTrack';
import { RegionBlock } from '../components/about/RegionBlock';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { directions, undecidedDirection, type DirectionId } from '../data/directions';
import { directionPages } from '../data/directionPages';
import { webpSrcSet } from '../lib/responsiveImages';
import '../components/about/region.css';
import './directions.css';

// /napryamky — the hub: choose a direction or describe a mixed task. Hero in the /yak-pratsyuiemo composition, its
// slides naming the direction they show; the five directions as a catalogue (rows + a preview of the one in focus);
// the formats on one hangar drawing that redraws per format; where the work starts, on the eight-stage track; where we
// work, on the region's real map; the conversation, its form starting on «Ще не визначено» and without the four
// after-contact steps (the track above already says where we start). The old two-question FAQ is answered by the
// track and the map. Every word is the page's previous copy, /yak-pratsyuiemo's, the directions' own data or the
// Delivery Model.

/** The catalogue's own illustrations — generated concept images, one per direction, never the hero's slides. Focal
 *  points keep the subject in the square-ish crops of the narrow-screen rows. */
const CATALOG_FOCAL: Record<DirectionId, string> = {
  angary: '50% 50%',
  zernoskhovyshcha: '46% 50%',
  metalokonstruktsii: '34% 50%',
  'betonni-roboty': '63% 46%',
  'pokrivelni-roboty': '52% 55%',
};

/** Each direction's row and preview: its card copy, its page's accent and overview, its catalogue illustration. */
const catalog: CatalogItem[] = directions.map((direction) => {
  const page = directionPages[direction.id];
  const src = `/media/directions-catalog/catalog-${direction.id}.webp`;
  return {
    id: direction.id,
    number: direction.number,
    href: direction.href,
    title: direction.serviceTitle,
    routeText: direction.routeText,
    accent: page.hero.accent,
    kindsLabel: page.overview?.eyebrow ?? 'Що виконуємо',
    kinds: (page.overview?.items ?? []).map((item) => item[1]),
    image: { src, srcSet: webpSrcSet(src)!, focal: CATALOG_FOCAL[direction.id], width: 1448, height: 1086 },
  };
});

export const metadata = createPageMetadata({
  path: '/napryamky',
  title: brandedTitle('Оберіть напрям будівництва у Дніпрі'),
  description: 'Ангари, зерносховища, металоконструкції, бетонні й покрівельні роботи у Дніпрі. Оберіть напрям або опишіть завдання, якщо об’єкт поєднує кілька видів робіт.',
  socialTitle: `Оберіть напрям будівництва — ${company.name}`,
  socialDescription: 'П’ять напрямів промислового будівництва у Дніпрі. Один об’єкт може поєднувати кілька — підкажемо, які саме.',
  image: '/media-responsive/directions-sequence-angary-1200w.16a5481c.webp',
  imageAlt: `Промислові напрями будівництва ${company.name} — металевий каркас на будівельному майданчику`,
});

export default function DirectionsPage() {
  return (
    <main className="inner-page directions-page" id="main-content">
      <ProcessMotion root=".directions-page" />
      <section className="subhero subhero-media directions-subhero">
        <DirectionsHeroImageSequence />
        <div className="subhero-overlay" />
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div className="subhero-copy">
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Напрямки', href: siteRoutes.directions }]} />
            <p className="eyebrow light"><span /> Напрями робіт</p>
            <h1>
              <span className="subhero-title-line">Від фундаменту</span>
              <span className="subhero-title-line">до <em>покрівлі</em></span>
            </h1>
          </div>
          <div className="subhero-side directions-subhero-side">
            <p>Ангари й склади, зерносховища, металоконструкції, бетонні й покрівельні роботи — окремим етапом або погодженим комплексом. Не знаєте, з чого почати? Опишіть завдання — допоможемо визначити склад робіт.</p>
            <div className="directions-hero-actions">
              <a className="button button-primary subhero-side-cta" href="#directions-list">
                Обрати напрям <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#inquiry">
                Обговорити задачу <span aria-hidden="true">↗</span>
              </a>
              <HeroCallLink />
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
            supporting="Кожен пункт веде до конкретних можливостей, процесу й чинників вартості. Для комплексного об’єкта можна почати з будь-якого близького напрямку. Зображення — ілюстрації, а не фото виконаних об’єктів."
          />
          <DirectionsCatalog items={catalog} />
        </div>
      </section>

      {/* 3 · Formats: one drawing of the same hangar, redrawn for the format pointed at, focused or pressed */}
      <section className="page-section dfmt" aria-labelledby="dfmt-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Формати участі"
            title="Який обсяг робіт можемо взяти на себе"
            titleId="dfmt-title"
            supporting="До старту визначаємо наші роботи, хто координує інших виконавців і за який результат відповідаємо."
          />
          <FormatsScope formats={formatCards()} />
          <a className="section-link" href={`${siteRoutes.process}#obsiah`}>Детально про формати й етапи <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      {/* 4 · Where the work starts: what you already have → the stage we start from, on the eight-stage track */}
      <section className="page-section page-section-dark dstart-section" aria-labelledby="dstart-title">
        <div className="shell">
          <SectionHeader
            inverse
            eyebrow="Перше звернення"
            title="Що у вас уже є — з того й почнемо"
            titleId="dstart-title"
            supporting="Звертайтеся і з початковою ідеєю, і з готовим проєктом. Переглянемо те, що вже є, та скажемо, які дані потрібні, щоб визначити склад робіт і підготувати кошторис."
          />
          <StartTrack entries={deliveryModel.entryStates} stages={deliveryModel.stages.map(({ id, number, title, what }) => ({ id, number, title, what }))} />
        </div>
      </section>

      {/* 5 · Where we work: the region on its real map (shared with /pro-nas) */}
      <section className="page-section dregion" aria-label="Де працюємо">
        <div className="shell">
          <RegionBlock />
        </div>
      </section>

      <ConversationSection
        title="Опишіть завдання — підкажемо напрям"
        lead="Не впевнені, який напрямок підходить? Розберемося разом. Найшвидше — зателефонувати; якщо зручніше писати — залиште запит."
        defaultDirection={undecidedDirection}
        showJourney={false}
      />
    </main>
  );
}
