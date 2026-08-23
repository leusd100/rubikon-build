'use client';

import Image from 'next/image';

const viberUrl = 'viber://chat?number=%2B380682614264';

export default function ViberContactButton() {
  return (
    <button
      className="messenger-link messenger-viber"
      type="button"
      data-contact-method="viber"
      aria-label="Написати у Viber"
      title="Написати у Viber"
      onClick={() => window.location.assign(viberUrl)}
    >
      <Image
        className="messenger-brand-icon"
        src="/brands/viber.svg"
        width={24}
        height={24}
        alt=""
        aria-hidden="true"
      />
      <span>VB</span>
    </button>
  );
}
