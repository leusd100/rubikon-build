import { DirectionImageCards } from './components/DirectionCards';
import { SectionHeader } from './components/SiteChrome';
import { ConversationSection } from './components/home-v2/ConversationSection';
import { EngineeringSignature } from './components/home-v2/EngineeringSignature';
import { HomeV2Hero } from './components/home-v2/HomeV2Hero';
import { homeProofCase } from './data/homeProof';
// Architectural Copper v0.1 — HOME-only palette prototype; see the file header for how to discard it.
import './palette-architectural-copper.css';
// HOME v2 «Engineering Signature» — PROTOTYPE on design/home-v2-engineering-signature (not for merge). Every rule
// is scoped to main[data-home="v2"]; the previous HOME blocks (HomeSections, TeamSection, InquirySection) are left
// untouched in the codebase so the two versions can be compared and this one discarded cleanly.
import './home-v2.css';

// HOME v2 reads in four zones: образ → напрямки → інженерне пояснення + реальний доказ → розмова.
// Illustrations explain, the one real photo proves; the two are labelled differently and never compete.
export default function Home() {
  return (
    <main id="main-content" data-palette="architectural-copper" data-home="v2">
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
          <DirectionImageCards />
        </div>
      </section>

      <EngineeringSignature proof={homeProofCase} />

      <ConversationSection />
    </main>
  );
}
