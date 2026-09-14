import type { LucideIcon } from 'lucide-react';
import { ClipboardList, Handshake, Layers3 } from 'lucide-react';
import { directions } from '../data/directions';
import { entryPoints, formatCards } from '../lib/deliveryModelPresentation';
import type { DeliveryFormatId } from '../types/deliveryModel';
import ResponsiveImage from './ResponsiveImage';

const formatIcons: Record<DeliveryFormatId, LucideIcon> = {
  comprehensive: Layers3,
  'work-package': ClipboardList,
  subcontract: Handshake,
};

// Homepage "Формат участі" cards: the three Delivery Model formats. Labels and summaries come
// from the model; only the number and the icon are presentation. Reuses the light, non-link
// `.cost-grid` treatment in a three-column variant, since formats don't each point at a page.
export function EngagementFormatCards() {
  return (
    <div className="cost-grid format-grid">
      {formatCards().map(({ id, number, title, text }) => {
        const Icon = formatIcons[id];
        return (
          <article key={id}>
            <span>{number}</span>
            <Icon className="card-icon" aria-hidden="true" />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        );
      })}
    </div>
  );
}

// «Що у вас уже є» — the model's second axis, stated as a principle under the formats: it sets
// where the work starts, not how RUBIKON participates. Not a picker; the route map comes later.
export function EntryPointsNote() {
  return (
    <div className="entry-axis">
      <p className="entry-axis-title">Що у вас уже є</p>
      <ul>
        {entryPoints().map(({ id, label }) => <li key={id}>{label}</li>)}
      </ul>
      <p className="entry-axis-note">Від цього залежить, з якого етапу почнемо, — а не формат участі.</p>
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
