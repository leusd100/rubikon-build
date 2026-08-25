export const company = {
  name: 'RUBIKON BUILD',
  alternateName: 'Рубікон Білд',
  siteUrl: 'https://rubikonbuild.com',
  description:
    'Родинна будівельна компанія: промислові споруди під ключ та окремі роботи у форматі підряду й субпідряду.',
  serviceAreas: ['Дніпропетровська область', 'Україна'],
  founders: ['Леус Сергій Іванович', 'Леус Дмитро Сергійович'],
  phone: {
    digits: '380682614264',
    international: '+380682614264',
    display: '+38 068 261 42 64',
    encodedInternational: '%2B380682614264',
  },
} as const;

export const companyContactLinks = {
  phone: `tel:${company.phone.international}`,
  telegram: `tg://resolve?phone=${company.phone.digits}`,
  whatsapp: `https://wa.me/${company.phone.digits}`,
  viber: `viber://chat?number=${company.phone.encodedInternational}`,
} as const;
