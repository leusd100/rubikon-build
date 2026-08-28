export const siteRoutes = {
  home: '/',
  directions: '/napryamky',
  process: '/#how-we-work',
  about: '/pro-nas',
  contact: '/#contact',
  privacy: '/polityka-konfidentsiinosti',
} as const;

export const primaryNavigation = [
  { label: 'Напрямки', href: siteRoutes.directions },
  { label: 'Як працюємо', href: siteRoutes.process },
  { label: 'Про компанію', href: siteRoutes.about },
  { label: 'Контакти', href: siteRoutes.contact },
] as const;
