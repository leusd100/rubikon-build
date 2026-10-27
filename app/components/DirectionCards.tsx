import { directions } from '../data/directions';
import ResponsiveImage from './ResponsiveImage';
import { Arrow } from './Arrow';

export function DirectionImageCards() {
  // HOME's 4:5 phone cards are 84% of (100vw - 32px), or 88% at <=340px.
  // The hangar source is also 4:5. The other sources are 3:2: object-fit:cover
  // scales their width by 1.875 before cropping. Account for that to keep Retina
  // detail instead of requesting an undersized landscape image.
  const portraitPhoneSizes = '(max-width: 340px) calc(88vw - 28.16px), (max-width: 760px) calc(84vw - 26.88px)';
  const landscapePhoneSizes = '(max-width: 340px) calc(165vw - 52.8px), (max-width: 760px) calc(157.5vw - 50.4px)';

  return (
    <div className="direction-grid">
      {directions.map((direction) => (
        <a className={`direction-card ${direction.cardClassName}`} href={direction.href} key={direction.id}>
          <ResponsiveImage
            src={direction.image}
            alt={direction.imageAlt}
            sizes={`${direction.id === 'angary' ? portraitPhoneSizes : landscapePhoneSizes}, ${direction.cardClassName === 'wide' ? '(max-width: 800px) 100vw, 65vw' : '(max-width: 800px) 100vw, 35vw'}`}
          />
          <span className="direction-shade" />
          <span className="direction-number">{direction.number}</span>
          <span className="direction-provenance">Ілюстрація</span>
          <span className="direction-copy">
            <strong>{direction.cardTitle}</strong>
            <small>{direction.cardText}</small>
          </span>
          <Arrow to="up-right" className="direction-arrow" />
        </a>
      ))}
    </div>
  );
}
