import { directions } from '../data/directions';
import { engagementFormats } from '../data/engagementFormats';
import ResponsiveImage from './ResponsiveImage';

// Homepage "Формат участі" (Services) cards — reuses the existing `.cost-grid` treatment
// (light, 4-column, non-link info cards) rather than `.service-card`, since these formats don't
// each point at a page the way directions do. See `data/engagementFormats.ts` for why this is a
// separate data shape instead of another view of `directions`.
export function EngagementFormatCards() {
  return (
    <div className="cost-grid">
      {engagementFormats.map(({ number, title, text, icon: Icon }) => (
        <article key={number}>
          <span>{number}</span>
          <Icon className="card-icon" aria-hidden="true" />
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
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
