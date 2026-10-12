import type { CSSProperties } from 'react';
import { Breadcrumbs, HeroCallButton, SectionHeader } from '../components/SiteChrome';
import { ConversationSection } from '../components/ConversationSection';
import { DirectionsCatalog, type CatalogItem } from '../components/directions/DirectionsCatalog';
import { DirectionsKey } from '../components/home-v2/DirectionsKey';
import { DirectionsHeroImageSequence } from '../components/DirectionsHeroImageSequence';
import { directionsHeroSequenceAssets } from '../data/directionsHeroSequenceManifest';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { formatCards } from '../lib/deliveryModelPresentation';
import { RegionBlock } from '../components/about/RegionBlock';
import { ProcessMotion } from '../components/process/ProcessMotion';
import { directions, undecidedDirection } from '../data/directions';
import { directionPages } from '../data/directionPages';
import '../components/about/region.css';
import './directions.css';

// /napryamky — the hub: choose a direction or describe a mixed task. Hero in the /yak-pratsyuiemo composition, its
// slides naming the direction they show; the five directions as a catalogue (a key plan over five rows, each with its scheme sheet);
// one short band on how we take the work on — the three formats in the model's words and «what you already have», with
// one link each to the formats, the stages and the responsibility on /yak-pratsyuiemo, which alone explains them in full (DEC-45, PROPOSED, Phase 3:
// the formats drawing and the eight-stage track used to repeat it here); where we work, on the region's real map; the
// conversation, its form starting on «Ще не визначено», with the four after-contact steps every page shows. Every word
// is the page's previous copy, /yak-pratsyuiemo's, the directions' own data or the Delivery Model.

/** Each direction's row: its card copy and the kinds of work its page lists. */
const catalog: CatalogItem[] = directions.map((direction) => ({
  id: direction.id,
  number: direction.number,
  href: direction.href,
  title: direction.serviceTitle,
  routeText: direction.routeText,
  kinds: (directionPages[direction.id].overview?.items ?? []).map((item) => item[1]),
}));

/** The band's ways to /yak-pratsyuiemo: formats, stages and responsibility, each to its own section there */
const HOW_LINKS = [
  { hash: 'obsiah', label: 'Формати участі' },
  { hash: 'etapy', label: 'Етапи роботи' },
  { hash: 'vidpovidalnist', label: 'Хто за що відповідає' },
] as const;

export const metadata = createPageMetadata({
  path: '/napryamky',
  title: brandedTitle('Оберіть напрям будівництва у Дніпрі'),
  description: 'Ангари, зерносховища, металоконструкції, бетонні й покрівельні роботи у Дніпрі. Оберіть напрям або опишіть завдання, якщо об’єкт поєднує кілька видів робіт.',
  socialTitle: `Оберіть напрям будівництва — ${company.name}`,
  socialDescription: 'П’ять напрямів промислового будівництва у Дніпрі. Один об’єкт може поєднувати кілька — підкажемо, які саме.',
  image: directionsHeroSequenceAssets[0].fallbackSrc,
  imageAlt: `Промислові напрями будівництва ${company.name} — металевий каркас на будівельному майданчику`,
});

export default function DirectionsPage() {
  return (
    <main className="inner-page directions-page" id="main-content" data-field="" style={{ '--field-name': '"RUBIKON BUILD · Напрямки"' } as CSSProperties}>
      <ProcessMotion root=".directions-page" />
      <section className="subhero subhero-media directions-subhero">
        <DirectionsHeroImageSequence />
        <div className="subhero-overlay" />
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
            <div className="directions-hero-actions" data-hero-actions>
              <HeroCallButton />
              <a className="button button-hero-secondary subhero-side-cta" href="#directions-list">
                Обрати напрям <span aria-hidden="true">↓</span>
              </a>
              <a className="text-link" href="#inquiry" data-open-inquiry="">
                Обговорити задачу <span aria-hidden="true">↓</span>
              </a>
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

      {/* 3 · How we take the work on, in short: the three formats (the model's label and summary) and «what you already
          have», then a link to each of /yak-pratsyuiemo's formats, stages and responsibility, explained in full there */}
      <section className="page-section page-section-dark dhow" aria-labelledby="dhow-title">
        <div className="shell">
          <SectionHeader
            inverse
            eyebrow="Формати участі"
            title="Який обсяг робіт можемо взяти на себе"
            titleId="dhow-title"
            supporting="До старту визначаємо наші роботи, хто координує інших виконавців і за який результат відповідаємо."
          />
          <ol className="dhow-formats">
            {formatCards().map((format) => (
              <li key={format.id}>
                <span className="dhow-number" aria-hidden="true">{format.number}</span>
                <h3>{format.title}</h3>
                <p>{format.text}</p>
              </li>
            ))}
          </ol>
          <div className="dhow-start">
            <p>
              <b>Що у вас уже є — з того й почнемо.</b> Звертайтеся і з початковою ідеєю, і з готовим проєктом. Переглянемо те, що вже є, та скажемо, які дані потрібні, щоб визначити склад робіт і підготувати кошторис.
            </p>
            {/* One link per part of /yak-pratsyuiemo, each to its own section, named as the site already names them
                (/pro-nas: «Етапи роботи», «Хто за що відповідає»; this band's own «Формати участі») */}
            <div className="dhow-links">
              {HOW_LINKS.map(({ hash, label }) => (
                <a key={hash} className="section-link" href={`${siteRoutes.process}#${hash}`}>{label} <span aria-hidden="true">↗</span></a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4 · Where we work: the region on its real map (shared with /pro-nas) */}
      <section className="page-section dregion" aria-label="Де працюємо">
        <div className="shell">
          <RegionBlock />
        </div>
      </section>

      <ConversationSection
        title="Опишіть завдання — підкажемо напрям"
        lead="Не впевнені, який напрямок підходить? Розберемося разом. Найшвидше — зателефонувати; якщо зручніше писати — залиште запит."
        defaultDirection={undecidedDirection}
      />
    </main>
  );
}
