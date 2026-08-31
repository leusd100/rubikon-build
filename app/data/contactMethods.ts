import { companyContactLinks } from './company';

export type ContactMethod = 'Дзвінок' | 'Telegram' | 'WhatsApp' | 'Viber';

export const contactMethodOptions: ReadonlyArray<readonly [string, ContactMethod]> = [
  ['Дзвінок', 'Дзвінок'],
  ['Telegram', 'Telegram'],
  ['WhatsApp', 'WhatsApp'],
  ['Viber', 'Viber'],
];

export const messengerContacts = {
  telegram: {
    name: 'Telegram',
    label: 'Написати в Telegram',
    href: companyContactLinks.telegram,
    icon: '/brands/telegram.svg',
    shortName: 'TG',
  },
  whatsapp: {
    name: 'WhatsApp',
    label: 'Написати в WhatsApp',
    href: companyContactLinks.whatsapp,
    icon: '/brands/whatsapp.svg',
    shortName: 'WA',
  },
  viber: {
    name: 'Viber',
    label: 'Написати у Viber',
    href: companyContactLinks.viber,
    icon: '/brands/viber.svg',
    shortName: 'VB',
  },
} as const;
