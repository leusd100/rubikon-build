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

// The model's second axis — what the visitor already has. It sets where the work starts, not how RUBIKON
// participates. It lives in HOME's «Перша розмова» block (not under the formats), where it answers «з чим прийти»;
// not a picker, and every state is a valid way to start.
export function EntryPointsNote() {
  return (
    <div className="entry-axis">
      <p className="entry-axis-title">Можна почати з того, що вже є</p>
      <ul>
        {entryPoints().map(({ id, label }) => <li key={id}>{label}</li>)}
      </ul>
      <p className="entry-axis-note">Від цього залежить, з якого етапу почнемо, — а не формат участі.</p>
    </div>
  );
}

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
