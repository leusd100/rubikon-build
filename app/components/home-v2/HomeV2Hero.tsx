import { Phone } from 'lucide-react';
import { HomeV2HeroMedia } from './HomeV2HeroMedia';
import { company, companyContactLinks } from '../../data/company';

// HOME v2 hero: one image, one headline, one line of what we build, two actions (call first). The written
// channels, the «RUBIKON / BUILD» signature and the coordination sentence left the first screen — the channels
// live once in the final conversation block, and responsibility boundaries on «Як працюємо».
export function HomeV2Hero() {
  return (
    <section className="hero hv2-hero" id="top">
      <div className="hero-media">
        <HomeV2HeroMedia />
      </div>
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />
      <div className="shell hero-layout hv2-hero-layout">
        <h1>
          Промислове <span className="hv2-nowrap">будівництво —</span> від окремих робіт до <em>комплексної реалізації</em> об’єкта
        </h1>
        <div className="hero-copy">
          {/* The team's own core works, as already published. The second sentence is kept verbatim: it is the pinned
              P01 limit on «комплексної реалізації» in the H1 (pr-critical), so dropping it would widen the claim. */}
          <p className="hero-lead">
            Будуємо промислові, складські й аграрні об’єкти: бетон і типові фундаменти, монтаж металоконструкцій,
            стінових і покрівельних панелей, покрівлі. Спеціалізовані роботи координуємо з профільними виконавцями
            в погодженому обсязі.
          </p>
          <div className="hero-actions">
            <a className="button button-primary hero-call-primary" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
              <Phone aria-hidden="true" />
              <span><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
            </a>
            <a className="button button-outline" href="#inquiry">
              Написати або залишити запит <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
      {/* Only the ≤760 still is a concept image; the desktop footage is process footage, not an object. */}
      <span className="hv2-hero-provenance">Ілюстрація</span>
    </section>
  );
}
