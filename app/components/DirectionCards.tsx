import { DraftingCompass, Hammer, Layers3, Warehouse, Wheat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { directions, type DirectionId } from '../data/directions';
import ResponsiveImage from './ResponsiveImage';

const directionIcons: Record<DirectionId, LucideIcon> = {
  angary: Warehouse,
  zernoskhovyshcha: Wheat,
  metalokonstruktsii: DraftingCompass,
  'betonni-roboty': Layers3,
  'pokrivelni-roboty': Hammer,
};

export function DirectionServiceCards() {
  return (
    <div className="service-list">
      {directions.map((direction) => {
        const Icon = directionIcons[direction.id];

        return (
          <a className="service-card" href={direction.href} key={direction.id}>
            <span className="service-number">{direction.number}</span>
            <Icon className="service-icon" aria-hidden="true" />
            <h3>{direction.serviceTitle}</h3>
            <p>{direction.serviceText}</p>
            <span className="service-arrow" aria-hidden="true">↗</span>
          </a>
        );
      })}
    </div>
  );
}

export function DirectionImageCards() {
  return (
    <div className="direction-grid">
      {directions.map((direction) => (
        <a className={`direction-card ${direction.cardClassName}`} href={direction.href} key={direction.id}>
          <ResponsiveImage
            src={direction.image}
            alt={direction.imageAlt}
            sizes={direction.cardClassName === 'wide' ? '(max-width: 800px) 100vw, 65vw' : '(max-width: 800px) 100vw, 35vw'}
          />
          <span className="direction-shade" />
          <span className="direction-number">{direction.number}</span>
          <span className="direction-copy">
            <strong>{direction.cardTitle}</strong>
            <small>{direction.cardText}</small>
          </span>
          <span className="direction-arrow" aria-hidden="true">↗</span>
        </a>
      ))}
    </div>
  );
}

export function DirectionRouteList() {
  return (
    <div className="route-service-list">
      {directions.map((direction) => (
        <a className="route-service" href={direction.href} id={direction.id} key={direction.id}>
          <span>{direction.number}</span>
          <div>
            <h3>{direction.serviceTitle}</h3>
            <p>{direction.routeText}</p>
          </div>
          <b aria-hidden="true">↗</b>
        </a>
      ))}
    </div>
  );
}
