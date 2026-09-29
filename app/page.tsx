import { Mail, Phone } from 'lucide-react';
import { DirectionImageCards } from './components/DirectionCards';
import { HomeCapability, HomeFirstConversation } from './components/HomeSections';
import { GhostWord, MessengerLinks, SectionHeader, TeamSection } from './components/SiteChrome';
import { HomeHeroVideo } from './components/HomeHeroVideo';
import InquirySection from './components/InquirySection';
import { company, companyContactLinks } from './data/company';
import { homeProofCase } from './data/homeProof';
import { siteRoutes } from './data/navigation';
// Architectural Copper v0.1 — HOME-only palette prototype; see the file header for how to discard it.
import './palette-architectural-copper.css';

// HOME reads as one argument for a warm, referred visitor:
//   understands the task (hero, directions) → team experience and an invitation to discuss the work (plus one real
//   project once approved) → people who take responsibility → what to bring and what happens next → contact.
// The plan and the evidence limits are in 00_control/home-review-v0.1/HOME_SLICE_02_ARCHITECTURE.md.
export default function Home() {
  return (
    <main id="main-content" data-palette="architectural-copper">
      <section className="hero" id="top">
        <div className="hero-media">
          <HomeHeroVideo />
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="hero-grid" aria-hidden="true" />
        <div className="shell hero-layout">
          <h1>
            Промислове будівництво — від окремих робіт до <em>комплексної реалізації</em> об’єкта
          </h1>
          <div className="hero-copy">
            {/* Objects, our own core, and where coordination starts — nothing wider than the owner has confirmed.
                Participation formats and responsibility details are explained on «Як працюємо». */}
            <p className="hero-lead">
              Будуємо промислові, складські й аграрні об’єкти. Основні роботи нашої команди — бетон і типові фундаменти,
              монтаж металоконструкцій, стінових і покрівельних панелей та покрівельні роботи. Спеціалізовані роботи координуємо
              з профільними виконавцями в погодженому обсязі.
            </p>
            {/* Stage 1 hypothesis (warm/referral visitors): talking to RUBIKON comes first, so the call is
                the primary action with the number printed on it; writing or leaving a request is the
                second step, and browsing the directions the third. */}
            <div className="hero-actions">
              <a className="button button-primary hero-call-primary" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
                <Phone aria-hidden="true" />
                <span><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
              </a>
              <a className="button button-outline" href="#inquiry">
                Написати або залишити запит <span aria-hidden="true">↗</span>
              </a>
              <a className="text-link" href={siteRoutes.directions}>
                Дивитися напрямки <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          {/* The written channels. The phone moved to the primary action, so the card no longer repeats it. */}
          <div className="hero-contact-card">
            <div className="hero-contact-kicker">
              <p>Або напишіть</p>
              <span>Відповідаємо особисто</span>
            </div>
            <div className="hero-contact-options">
              <MessengerLinks className="hero-messengers" showFullLabels />
              <a className="messenger-link hero-email" href={companyContactLinks.email}>
                <Mail aria-hidden="true" />
                <span>{company.email}</span>
              </a>
            </div>
          </div>
        </div>
        <div className="hero-signature" aria-hidden="true">RUBIKON / BUILD</div>
      </section>

      {/* Right after the hero: a visitor with a concrete task recognises it here before any abstract model. The
          cards are concept illustrations, each labelled «Ілюстрація» — the intro says so in words as well. */}
      <section className="directions section ghost-section" id="directions">
        <GhostWord word="STRUCTURE" tone="dark" align="start" />
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

      <HomeCapability proof={homeProofCase} />

      <TeamSection />

      <HomeFirstConversation />

      {/* Call first: the section's own contact list already leads with the phone, and the text says so. */}
      <InquirySection
        eyebrow="Почнемо з розмови"
        title={<>Розкажіть коротко<br className="contact-title-break" /> про завдання</>}
        text="Найшвидше — зателефонувати. Якщо зручніше писати — залиште контакт і коротко опишіть завдання: ми уточнимо вихідні дані та запропонуємо наступний крок."
      />
    </main>
  );
}
