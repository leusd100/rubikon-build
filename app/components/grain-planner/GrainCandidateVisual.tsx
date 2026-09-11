import type { CandidateKey } from '../../lib/planner/grain';

const titles: Record<CandidateKey, string> = {
  silo: 'силосної системи',
  framed: 'каркасного підлогового сховища',
  arch: 'безкаркасного арочного сховища',
};

/**
 * Conceptual line drawing of an approach — no scale, no dimensions. Geometry from the prototype.
 * Named with aria-label rather than a useId-linked <title>: the generic overview renders this
 * inside a server component handed to a client band, and generated ids there could mismatch on
 * hydration.
 */
export function GrainCandidateVisual({ type }: { type: CandidateKey }) {
  return (
    <svg className="planner-approach-visual" viewBox="0 0 360 170" role="img" aria-label={`Концептуальна схема ${titles[type]}`}>
      <path className="ground" d="M20 140H340" />
      {type === 'silo' && (
        <>
          <g className="silo-shape">
            <ellipse cx="103" cy="60" rx="35" ry="12" /><path d="M68 60V126M138 60V126" /><ellipse cx="103" cy="126" rx="35" ry="12" />
            <ellipse cx="180" cy="50" rx="42" ry="14" /><path d="M138 50V126M222 50V126" /><ellipse cx="180" cy="126" rx="42" ry="14" />
            <ellipse cx="266" cy="66" rx="32" ry="11" /><path d="M234 66V126M298 66V126" /><ellipse cx="266" cy="126" rx="32" ry="11" />
          </g>
          <path className="accent-line" d="M103 48V31H266V55" />
        </>
      )}
      {type === 'framed' && (
        <>
          <path className="building-shape" d="M46 130V62L180 20L314 62V130Z" />
          <path className="structure" d="M82 130V64L180 34L278 64V130M124 130V51M180 130V34M236 130V51" />
          <path className="accent-line" d="M46 62L180 20L314 62" />
        </>
      )}
      {type === 'arch' && (
        <>
          <path className="building-shape" d="M52 132C52 62 108 25 180 25S308 62 308 132Z" />
          <path className="structure" d="M77 132C77 76 123 45 180 45S283 76 283 132M105 132C105 91 138 66 180 66S255 91 255 132" />
          <path className="accent-line" d="M52 132C52 62 108 25 180 25S308 62 308 132" />
        </>
      )}
    </svg>
  );
}
