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
          {/* Iteration 3: shorter, so the call fits a narrow phone's first screen. The team's own core works and the
              limit on specialised works stay (P01); «в погодженому обсязі» and the object types are dropped on a phone —
              the object types return from 761 px up. */}
          <p className="hero-lead">
            <span className="hv2-lead-intro">Будуємо промислові, складські й аграрні об’єкти.</span>{' '}
            Бетон і типові фундаменти, монтаж металоконструкцій і панелей, покрівельні роботи. Спеціалізовані роботи
            координуємо з профільними виконавцями.
          </p>
          <div className="hero-actions" data-hero-actions>
            <a className="button button-primary hero-call-primary" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
              <Phone aria-hidden="true" />
              <span><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
            </a>
            <a className="button button-outline" href="#inquiry" data-open-inquiry="">
              Написати або залишити запит <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>
      </div>
      {/* Only the ≤760 still is a concept image; the desktop footage is process footage, not an object. */}
      <span className="hv2-hero-provenance">Ілюстрація</span>
    </section>
  );
}
