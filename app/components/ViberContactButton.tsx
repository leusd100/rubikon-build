'use client';

import { messengerContacts } from '../data/contactMethods';

const viber = messengerContacts.viber;

export default function ViberContactButton({ showFullLabel = false }: { showFullLabel?: boolean }) {
  return (
    <button
      className="messenger-link messenger-viber"
      type="button"
      data-contact-method="viber"
      aria-label={viber.label}
      title={viber.label}
      onClick={() => window.location.assign(viber.href)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a 24 px SVG; see MessengerLinks in SiteChrome.tsx */}
      <img
        className="messenger-brand-icon"
        src={viber.icon}
        width={24}
        height={24}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <span>{showFullLabel ? viber.name : viber.shortName}</span>
    </button>
  );
}
