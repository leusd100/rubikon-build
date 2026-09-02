import type { DirectionId } from './directions';

/**
 * Which directions genuinely meet on the same object, and why — the relation is the point,
 * not the link count. Every pair below is a real construction sequence the site already
 * describes on /napryamky ("ангар може одночасно включати бетонну основу, металевий каркас
 * і покрівлю"), so this block reads as navigation between adjacent stages of one project
 * rather than a reciprocal link list. Pairs are deliberately NOT symmetric: a direction only
 * appears here when it is actually the neighbouring stage from that page's point of view.
 */
export type RelatedDirection = {
  id: DirectionId;
  /** Why this direction is adjacent, phrased from the current page's object. */
  relation: string;
};

export const relatedDirections: Record<DirectionId, readonly RelatedDirection[]> = {
  angary: [
    { id: 'betonni-roboty', relation: 'Основа під каркас: фундаменти та промислова підлога споруди.' },
    { id: 'metalokonstruktsii', relation: 'Несучий каркас ангара — колони, ригелі, ферми та вузли.' },
    { id: 'pokrivelni-roboty', relation: 'Покрівельний контур споруди, його вузли та примикання.' },
  ],
  zernoskhovyshcha: [
    { id: 'betonni-roboty', relation: 'Бетонні основи під силоси, каркас і технологічне обладнання.' },
    { id: 'metalokonstruktsii', relation: 'Несучі елементи, майданчики та опорні конструкції.' },
  ],
  metalokonstruktsii: [
    { id: 'angary', relation: 'Готова споруда, для якої виготовляється й монтується каркас.' },
    { id: 'zernoskhovyshcha', relation: 'Каркас і опорні конструкції в будівельній частині зерносховища.' },
  ],
  'betonni-roboty': [
    { id: 'angary', relation: 'Споруда, яку зводять на підготовленій основі.' },
    { id: 'zernoskhovyshcha', relation: 'Основи під силоси як частина будівельного обсягу.' },
  ],
  'pokrivelni-roboty': [
    { id: 'angary', relation: 'Споруда, для якої монтується покрівельний контур.' },
    { id: 'metalokonstruktsii', relation: 'Несуча основа, на яку спирається покрівельна система.' },
  ],
};
