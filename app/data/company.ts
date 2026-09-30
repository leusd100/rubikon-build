const geographyBeyond = 'Проєкти в інших регіонах України розглядаємо, якщо їх формат і умови дозволяють якісно організувати виконання.';

export const company = {
  name: 'RUBIKON BUILD',
  alternateNames: ['Rubikon Build', 'rubikonbuild', 'Рубікон Білд'],
  siteUrl: 'https://rubikonbuild.com',
  description:
    'Будівництво для промислового, аграрного й комерційного бізнесу в Дніпропетровській області: комплексна реалізація в погодженому обсязі або окремі роботи.',
  serviceAreas: ['Дніпропетровська область'],
  geography: `Працюємо переважно в Дніпропетровській області. ${geographyBeyond}`,
  /** The second half of `geography`, for a page that names the main region on its own line (/pro-nas). */
  geographyBeyond,
  founders: ['Леус Сергій Іванович', 'Леус Дмитро Сергійович'],
  // Single source of truth for "consent under which policy version" — bump this string
  // (and the matching date on the privacy policy page) whenever that page's content changes.
  privacyVersion: '2026-09-19',
  privacyUpdatedDisplay: '19 вересня 2026 року',
  phone: {
    digits: '380682614264',
    international: '+380682614264',
    display: '+38 068 261 42 64',
    encodedInternational: '%2B380682614264',
  },
  // The one public mailbox. Other role addresses are not public channels yet.
  email: 'office@rubikonbuild.com',
} as const;

export const companyContactLinks = {
  phone: `tel:${company.phone.international}`,
  email: `mailto:${company.email}`,
  telegram: `https://t.me/+${company.phone.digits}`,
  whatsapp: `https://wa.me/${company.phone.digits}`,
  viber: `viber://chat?number=${company.phone.encodedInternational}`,
} as const;
