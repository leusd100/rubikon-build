import { directions } from '../data/directions';
import ResponsiveImage from './ResponsiveImage';
import { Arrow } from './Arrow';

/** On a computer HOME's cards stand in one row (home-v2.css) and a closed one can be narrower than these two long titles */
const breakable = (title: string) => title.replace('Метало', 'Метало\u00AD').replace('Зерно', 'Зерно\u00AD');

export function DirectionImageCards() {
  // HOME's 4:5 phone cards are 84% of (100vw - 32px), or 88% at <=340px.
  // The hangar source is also 4:5. The other sources are 3:2: object-fit:cover
  // scales their width by 1.875 before cropping. Account for that to keep Retina
  // detail instead of requesting an undersized landscape image.
  const portraitPhoneSizes = '(max-width: 340px) calc(88vw - 28.16px), (max-width: 760px) calc(84vw - 26.88px)';
  const landscapePhoneSizes = '(max-width: 340px) calc(165vw - 52.8px), (max-width: 760px) calc(157.5vw - 50.4px)';
  // From 1181 px the five cards stand in one row (home-v2.css): an open card is 2.25fr of 6.25fr, a shut one 1fr, and
  // the row is min(560px, 62vh) tall. Every picture covers its card's height, so what it needs is set by the height:
  // measured on production 20.11 (1181 × 800 … 2560 × 1440), the hangar's 4:5 picture needs 397–504 px (it was asked
  // for at 65vw, so a 1200w file came down where a 480w does), and a 3:2 picture 669–840 px in a 168–224 px card (it
  // was asked for at 35vw, so a 1280 px laptop drew a 480w file across 744 px). Asked for at the file that covers that
  // need within 1.1× (480w: 504 px at most is 1.05×; 768w: 840 px is 1.09×) — the next file up, 1200w, weighs about
  // twice as much for a difference a cover crop of a dimmed card does not show.
  const rowPortraitSizes = '480px';
  const rowLandscapeSizes = '760px';

  return (
    <div className="direction-grid">
      {directions.map((direction) => (
        <a className={`direction-card ${direction.cardClassName}`} href={direction.href} key={direction.id}>
          <ResponsiveImage
            src={direction.image}
            alt={direction.imageAlt}
            sizes={`${direction.id === 'angary' ? portraitPhoneSizes : landscapePhoneSizes}, ${direction.cardClassName === 'wide' ? '(max-width: 800px) 100vw, (max-width: 1180px) 65vw' : '(max-width: 800px) 100vw, (max-width: 1180px) 35vw'}, ${direction.id === 'angary' ? rowPortraitSizes : rowLandscapeSizes}`}
          />
          <span className="direction-shade" />
          <span className="direction-number">{direction.number}</span>
          <span className="direction-provenance">Ілюстрація</span>
          <span className="direction-copy">
            <strong>{breakable(direction.cardTitle)}</strong>
            <small>{direction.cardText}</small>
          </span>
          <Arrow to="up-right" className="direction-arrow" />
        </a>
      ))}
    </div>
  );
}
