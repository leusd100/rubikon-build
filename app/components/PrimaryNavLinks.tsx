'use client';

import { usePathname } from 'next/navigation';
import { primaryNavigation, siteRoutes } from '../data/navigation';

/**
 * The primary navigation's links, the one for the page in view marked `aria-current="page"` so a screen reader says
 * where the visitor is (review 11.10, phase 1). A direction's own page sits under «Напрямки», which is marked as its
 * section (`aria-current="true"`, PDO-57; `directionPaths` from the server, so the directions data stays out of this
 * client chunk), and the copper rule under the marked link stays on the screen for the eye. «Контакти» is the page's own
 * #inquiry and never current. In the mobile menu each link keeps its number, a mark for the eye only: it is not read out
 * before the link's name.
 */
export default function PrimaryNavLinks({
  numbered = false,
  directionPaths = [],
}: Readonly<{ numbered?: boolean; directionPaths?: readonly string[] }>) {
  const pathname = usePathname();
  const current = (href: string) => {
    if (href === pathname) return 'page';
    return href === siteRoutes.directions && directionPaths.includes(pathname) ? 'true' : undefined;
  };
  return primaryNavigation.map((item, index) => (
    <a href={item.href} key={item.href} aria-current={current(item.href)}>
      {numbered && <><small aria-hidden="true">{String(index + 1).padStart(2, '0')}</small>{' '}</>}
      {item.label}
    </a>
  ));
}
