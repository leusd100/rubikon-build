'use client';

import Image from 'next/image';
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
      <Image
        className="messenger-brand-icon"
        src={viber.icon}
        width={24}
        height={24}
        alt=""
        aria-hidden="true"
      />
      <span>{showFullLabel ? viber.name : viber.shortName}</span>
    </button>
  );
}
