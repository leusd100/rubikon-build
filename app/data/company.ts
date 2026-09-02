export const company = {
  name: 'RUBIKON BUILD',
  alternateNames: ['Rubikon Build', 'rubikonbuild', 'Рубікон Білд'],
  siteUrl: 'https://rubikonbuild.com',
  description:
    'Родинна будівельна компанія: комплексна реалізація промислових споруд та окремі роботи у форматі підряду й субпідряду.',
  serviceAreas: ['Дніпропетровська область', 'Україна'],
  founders: ['Леус Сергій Іванович', 'Леус Дмитро Сергійович'],
  // Single source of truth for "consent under which policy version" — bump this string
  // (and the matching date on the privacy policy page) whenever that page's content changes.
  privacyVersion: '2026-09-02',
  privacyUpdatedDisplay: '2 вересня 2026 року',
  phone: {
    digits: '380682614264',
    international: '+380682614264',
    display: '+38 068 261 42 64',
    encodedInternational: '%2B380682614264',
  },
} as const;

export const companyContactLinks = {
  phone: `tel:${company.phone.international}`,
  telegram: `https://t.me/+${company.phone.digits}`,
  whatsapp: `https://wa.me/${company.phone.digits}`,
  viber: `viber://chat?number=${company.phone.encodedInternational}`,
} as const;
