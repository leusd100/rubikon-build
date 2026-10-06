import type { CSSProperties } from 'react';
import type { DirectionPageConfig } from '../../types/directionPage';
import { SectionHeader } from '../SiteChrome';
import { PrefillInquiryLink } from '../directions/PrefillInquiryLink';

// «Яка у вас ситуація?» on /zernoskhovyshcha (owner, 06.10: «можна поцікавіше зробити цей блок»): the four situations of
// DirectionEntry, each over a small drawing of itself in the page's key — copper for the building part RUBIKON does,
// long dash for the specialists', short dash for what is not there yet, the grain in its colour. The whole card is the
// way into the form (its link is stretched over it); pointing at it draws its copper part again. Decorative drawings:
// the card's words say the same.

type Kind = 'new' | 'silo-base' | 'existing' | 'expand';
const KINDS: readonly Kind[] = ['new', 'silo-base', 'existing', 'expand'];
const GROUND = 128;

function SituationDrawing({ kind }: Readonly<{ kind: Kind }>) {
  return (
    <svg className="gs-drawing" viewBox="0 0 320 150" aria-hidden="true" focusable="false">
      <path className="gs-ground" d={`M8 ${GROUND}H312`} />
      <path className="gs-hatch" d={[18, 30, 42, 278, 290, 302].map((x) => `M${x} ${GROUND}l-7 10`).join('')} />
      {kind === 'new' && (
        <>
          {/* a free plot: the future store only as an outline, its footings and slab going in */}
          <path className="gs-future" d={`M74 ${GROUND - 6}V66L160 34L246 66V${GROUND - 6}`} />
          <path pathLength={1} className="gs-own" d={`M66 ${GROUND - 6}H254V${GROUND}H66Z`} />
          <path pathLength={1} className="gs-own" d={`M62 ${GROUND}H86V${GROUND + 12}H62ZM234 ${GROUND}H258V${GROUND + 12}H234ZM148 ${GROUND}H172V${GROUND + 12}H148Z`} />
          <path className="gs-ink" d="M286 128V92M286 92l14 6-14 6" />
        </>
      )}
      {kind === 'silo-base' && (
        <>
          {/* the specialists' silo over the foundation we cast for it, anchors into the slab */}
          <path className="gs-grain" d={`M112 ${GROUND - 14}V64L160 50L208 64V${GROUND - 14}Z`} />
          <path className="gs-partner" d={`M108 ${GROUND - 12}V58L160 26L212 58V${GROUND - 12}M152 26V18H168V26`} />
          <path pathLength={1} className="gs-own" d={`M94 ${GROUND - 12}H226V${GROUND + 8}H94Z`} />
          <path pathLength={1} className="gs-own gs-line" d={`M110 ${GROUND - 18}V${GROUND + 2}M210 ${GROUND - 18}V${GROUND + 2}M106 ${GROUND - 18}H114M206 ${GROUND - 18}H214`} />
        </>
      )}
      {kind === 'existing' && (
        <>
          {/* a store that already stands, grain against its walls, and the pressure they must take */}
          <path className="gs-grain" d={`M84 ${GROUND}V104L160 72L236 104V${GROUND}Z`} />
          <path className="gs-ink" d={`M76 ${GROUND}V70L160 34L244 70V${GROUND}`} />
          {/* the retaining walls a store needs inside to take that pressure: the part we would build */}
          <path pathLength={1} className="gs-own" d={`M82 ${GROUND}V98H90V${GROUND}ZM230 ${GROUND}V98H238V${GROUND}Z`} />
          <g className="gs-press">
            {[106, 114, 122].map((y, index) => (
              <path key={y} d={`M${96 + index * 6} ${y}H82M88 ${y - 4}L82 ${y}L88 ${y + 4}M${224 - index * 6} ${y}H238M232 ${y - 4}L238 ${y}L232 ${y + 4}`} />
            ))}
          </g>
        </>
      )}
      {kind === 'expand' && (
        <>
          {/* two silos at work, two more beside them as the second stage, the new slab ours */}
          <path className="gs-grain" d={`M48 ${GROUND}V70L76 60L104 70V${GROUND}ZM116 ${GROUND}V70L144 60L172 70V${GROUND}Z`} />
          <path className="gs-ink" d={`M44 ${GROUND}V66L76 46L108 66V${GROUND}M112 ${GROUND}V66L144 46L176 66V${GROUND}`} />
          <path className="gs-partner" d={`M192 ${GROUND - 10}V66L224 46L256 66V${GROUND - 10}M260 ${GROUND - 10}V66L292 46L324 66V${GROUND - 10}`} transform="translate(-14 0)" />
          <path pathLength={1} className="gs-own" d={`M170 ${GROUND - 10}H312V${GROUND + 6}H170Z`} />
          <path className="gs-ink" d="M150 18H174M162 6V30" />
        </>
      )}
    </svg>
  );
}

export function GrainSituations({ entry }: Readonly<{ entry: NonNullable<DirectionPageConfig['entry']> }>) {
  return (
    <section className="page-section direction-entry gs" aria-labelledby="direction-entry-title">
      <div className="shell">
        <SectionHeader className="page-heading" eyebrow={entry.eyebrow} title={entry.title} supporting={entry.text} titleId="direction-entry-title" />
        <ol className="direction-entry-list gs-list" data-motion>
          {entry.items.map((item, index) => (
            <li key={item.situation} className="gs-card" style={{ '--i': index } as CSSProperties}>
              <SituationDrawing kind={KINDS[index] ?? 'new'} />
              <h3>{item.situation}</h3>
              <p>{item.text}</p>
              <p className="direction-entry-start"><b>Почнемо з</b> {item.start}</p>
              <PrefillInquiryLink className="direction-entry-link" text={`${item.situation}. `}>
                Обговорити <span aria-hidden="true">↓</span>
              </PrefillInquiryLink>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
