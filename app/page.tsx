import { DirectionImageCards } from './components/DirectionCards';
import { DirectionsRail } from './components/home-v2/DirectionsRail';
import { SectionHeader } from './components/SiteChrome';
import { ConversationSection } from './components/ConversationSection';
import { EngineeringSignature } from './components/home-v2/EngineeringSignature';
import { HomeV2Hero } from './components/home-v2/HomeV2Hero';
import { directions } from './data/directions';
import { homeProofCase } from './data/homeProof';
// HOME v2 «Engineering Signature» (owner-approved 2026-09-29, from design/home-v2-engineering-signature). Every rule
// is scoped to main[data-home="v2"]; the previous HOME blocks (HomeSections, TeamSection) are no longer rendered here.
// The closing conversation block is the site-wide ConversationSection.
import './home-v2.css';

// HOME v2 reads in four zones: образ → напрямки → інженерне пояснення + реальний доказ → розмова.
// Illustrations explain, the one real photo proves; the two are labelled differently and never compete.
export default function Home() {
  return (
    <main id="main-content" data-home="v2">
      <HomeV2Hero />

      {/* The direction images are concept illustrations of the service directions, not project evidence — each card
          keeps its «Ілюстрація» tag and the intro says so in words. */}
      <section className="directions section hv2-directions" id="directions">
        <div className="shell">
          <SectionHeader
            eyebrow="Напрямки робіт"
            title="П’ять напрямів для бізнесу й агросектору"
            supporting="Оберіть напрям, найближчий до вашої задачі. Зображення на картках — ілюстрації, а не фото виконаних об’єктів."
            inverse
          />
          <DirectionsRail count={directions.length}>
            <DirectionImageCards />
          </DirectionsRail>
        </div>
      </section>

      <EngineeringSignature proof={homeProofCase} />

      <ConversationSection title="Розкажіть коротко про завдання" />
    </main>
  );
}
