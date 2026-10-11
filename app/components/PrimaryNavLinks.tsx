'use client';

import { usePathname } from 'next/navigation';
import { primaryNavigation } from '../data/navigation';

/**
 * The primary navigation's links, the one for the page in view marked `aria-current="page"` so a screen reader says
 * where the visitor is (review 11.10, phase 1). «Контакти» is the page's own #inquiry and never current. In the mobile
 * menu each link keeps its number, a mark for the eye only: it is not read out before the link's name.
 */
export default function PrimaryNavLinks({ numbered = false }: Readonly<{ numbered?: boolean }>) {
  const pathname = usePathname();
  return primaryNavigation.map((item, index) => (
    <a href={item.href} key={item.href} aria-current={item.href === pathname ? 'page' : undefined}>
      {numbered && <><small aria-hidden="true">{String(index + 1).padStart(2, '0')}</small>{' '}</>}
      {item.label}
    </a>
  ));
}
