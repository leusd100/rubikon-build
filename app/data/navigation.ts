export const siteRoutes = {
  home: '/',
  directions: '/napryamky',
  process: '/#how-we-work',
  about: '/pro-nas',
  // Page-relative on purpose (no leading "/"): every page now has its own #inquiry section
  // (homepage's own contact form, or a per-page InquirySection) — this lets the same nav
  // link jump to whichever page's local form the visitor is already on, instead of always
  // bouncing back to the homepage and losing their direction context.
  contact: '#inquiry',
  privacy: '/polityka-konfidentsiinosti',
} as const;

export const primaryNavigation = [
  { label: 'Напрямки', href: siteRoutes.directions },
  { label: 'Як працюємо', href: siteRoutes.process },
  { label: 'Про компанію', href: siteRoutes.about },
  { label: 'Контакти', href: siteRoutes.contact },
] as const;
