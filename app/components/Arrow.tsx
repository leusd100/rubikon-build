import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowUp, MoveUpRight, type LucideIcon } from 'lucide-react';

export type ArrowWay = 'up-right' | 'down' | 'up' | 'right' | 'left' | 'left-right';

const ICONS: Record<ArrowWay, LucideIcon> = {
  // lucide's ArrowUpRight is a corner in the middle 10 units, a size under the capitals beside it; this one spans 14 as
  // the straight arrows do
  'up-right': MoveUpRight,
  down: ArrowDown,
  up: ArrowUp,
  right: ArrowRight,
  left: ArrowLeft,
  'left-right': ArrowLeftRight,
};

/**
 * The site's arrow: a drawn icon in the interface's stroke and its holder's colour, never a text glyph. ↗ and ↔ are in
 * none of the site's fonts, and iOS draws them from Apple Color Emoji — a blue tile in a copper button (26.10); ↓ ↑ → came
 * from whichever face had them, each at its own size and weight. The span is decoration (the link's words name the way)
 * and carries data-arrow, which an arrow link (.link-arrow, globals.css) nudges the way it points. The icon is drawn in
 * the middle 14 of its 24 units across, so its box is as wide as its drawing.
 */
export function Arrow({ to, className }: Readonly<{ to: ArrowWay; className?: string }>) {
  const Icon = ICONS[to];
  return (
    <span className={className} aria-hidden="true" data-arrow={to}>
      <Icon focusable="false" viewBox="5 0 14 24" />
    </span>
  );
}
