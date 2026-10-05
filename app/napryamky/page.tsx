import { Breadcrumbs, HeroCallButton, HeroCallLink, SectionHeader } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionsCatalog, type CatalogItem } from '../components/directions/DirectionsCatalog';
import { DirectionsKey } from '../components/home-v2/DirectionsKey';
import { DirectionsHeroImageSequence } from '../components/DirectionsHeroImageSequence';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { formatCards, participationChoices } from '../lib/deliveryModelPresentation';
import { deliveryModel } from '../data/deliveryModel';
import { FormatsScope, type FormatTerms } from '../components/directions/FormatsScope';
import type { DeliveryFormatId } from '../types/deliveryModel';
import { StartTrack } from '../components/directions/StartTrack';
import { RegionBlock } from '../components/about/RegionBlock';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { directions, undecidedDirection } from '../data/directions';
import { directionPages } from '../data/directionPages';
import '../components/about/region.css';
import '../components/directions/formats-scope.css';
import '../components/sheet-field.css';
import './directions.css';

// /napryamky — the hub: choose a direction or describe a mixed task. Hero in the /yak-pratsyuiemo composition, its
// slides naming the direction they show; the five directions as a catalogue (rows + a preview of the one in focus);
// the formats on one hangar drawing that redraws per format; where the work starts, on the eight-stage track; where we
// work, on the region's real map; the conversation, its form starting on «Ще не визначено» and without the four
// after-contact steps (the track above already says where we start). The old two-question FAQ is answered by the
// track and the map. Every word is the page's previous copy, /yak-pratsyuiemo's, the directions' own data or the
// Delivery Model.

/** Each direction's row: its card copy and the kinds of work its page lists. */
const catalog: CatalogItem[] = directions.map((direction) => ({
  id: direction.id,
  number: direction.number,
  href: direction.href,
  title: direction.serviceTitle,
  routeText: direction.routeText,
  kinds: (directionPages[direction.id].overview?.items ?? []).map((item) => item[1]),
}));

/** What tells the formats apart, for the drawing's caption: the other party of the contract and who coordinates */
const formatTerms = Object.fromEntries(participationChoices().map(({ id, contractWith, coordinator, rubikonCoordinates }) => [id, { contractWith, coordinator, rubikonCoordinates }])) as Record<DeliveryFormatId, FormatTerms>;

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
    <main className="inner-page directions-page" id="main-content" data-field="">
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
              <HeroCallButton />
              <a className="button button-primary subhero-side-cta" href="#directions-list">
                Обрати напрям <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#inquiry">
                Обговорити задачу <span aria-hidden="true">↓</span>
              </a>
              <HeroCallLink />
            </div>
          </div>
        </div>
        <span className="hero-provenance">Ілюстрація</span>
      </section>

      {/* 2 · The catalogue: a key plan in the header (its numbers are the rows'), then the five rows with their sheets */}
      <section className="page-section directions-index dkey-host" id="directions-list">
        <div className="shell">
          <SectionHeader
            aside={<DirectionsKey />}
            className="page-heading"
            eyebrow="П’ять напрямків"
            title="Оберіть потрібний вид робіт"
            supporting="Кожен пункт веде до конкретних можливостей, процесу й чинників вартості. Для комплексного об’єкта можна почати з будь-якого близького напрямку."
          />
          <DirectionsCatalog items={catalog} />
        </div>
      </section>

      {/* 3 · Formats: one section of the same building, redrawn for the format pointed at, focused or pressed */}
      <section className="page-section dfmt" aria-labelledby="dfmt-title">
        <div className="shell">
          <SectionHeader
            eyebrow="Формати участі"
            title="Який обсяг робіт можемо взяти на себе"
            titleId="dfmt-title"
            supporting="До старту визначаємо наші роботи, хто координує інших виконавців і за який результат відповідаємо."
          />
          <FormatsScope formats={formatCards()} terms={formatTerms} />
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
