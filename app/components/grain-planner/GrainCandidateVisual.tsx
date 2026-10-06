import type { CandidateKey } from '../../lib/planner/grain';

const titles: Record<CandidateKey, string> = {
  silo: 'силосної системи',
  framed: 'каркасного підлогового сховища',
  arch: 'безкаркасного арочного сховища',
};

/**
 * An approach as a small section in the page's drawing language (owner, 06.10): the grain at its slope in its own colour,
 * copper for the building part RUBIKON does — the silos' foundation slab; the whole framed store; the arch's base — and a
 * long graphite dash for the specialists' part — the silos and their gallery, the arched shell (the page's ScopeKey says
 * so under the cards). No scale, no dimensions. Named with aria-label rather than a useId-linked <title>: the generic
 * overview renders this inside a server component handed to a client band, and generated ids there could mismatch on
 * hydration; for the same reason it carries no element ids (the result can show it twice).
 */
export function GrainCandidateVisual({ type }: { type: CandidateKey }) {
  return (
    <svg className="planner-approach-visual" viewBox="0 0 360 170" role="img" aria-label={`Концептуальна схема ${titles[type]}`}>
      <path className="gcv-ground" d="M12 140H348" />
      <path className="gcv-hatch" d="M22 140l-7 10M34 140l-7 10M332 140l-7 10M344 140l-7 10" />
      {type === 'silo' && (
        <>
          <path className="gcv-grain" d="M56 134V76L110 62L164 76V134ZM196 134V76L250 62L304 76V134Z" />
          <path pathLength={1} className="gcv-grain-line" d="M56 76L110 62L164 76" />
          <path pathLength={1} className="gcv-grain-line" d="M196 76L250 62L304 76" />
          <path className="gcv-partner" d="M54 134V60L110 38L166 60V134M194 134V60L250 38L306 60V134M84 20H276M84 26H276M110 26V38M250 26V38" />
          <path pathLength={1} className="gcv-own" d="M40 134H320V146H40Z" />
        </>
      )}
      {type === 'framed' && (
        <>
          <path className="gcv-grain" d="M50 134V112L180 66L310 112V134Z" />
          <path pathLength={1} className="gcv-grain-line" d="M50 112L180 66L310 112" />
          <path pathLength={1} className="gcv-own" d="M32 140H58V152H32ZM302 140H328V152H302Z" />
          <path pathLength={1} className="gcv-own" d="M40 104H50V140H40ZM310 104H320V140H310Z" />
          <path pathLength={1} className="gcv-own" d="M50 134H310V140H50Z" />
          <path pathLength={1} className="gcv-own gcv-line" d="M45 104V80M315 104V80" />
          <path pathLength={1} className="gcv-own gcv-line" d="M36 79L180 43L324 79M50 86L180 53L310 86" />
        </>
      )}
      {type === 'arch' && (
        <>
          <path className="gcv-grain" d="M66 134L180 70L294 134Z" />
          <path pathLength={1} className="gcv-grain-line" d="M66 134L180 70L294 134" />
          <path className="gcv-partner" d="M42 132C42 66 102 26 180 26S318 66 318 132M60 132C60 78 112 44 180 44S300 78 300 132" />
          <path pathLength={1} className="gcv-own" d="M30 132H54V150H30ZM306 132H330V150H306Z" />
          <path pathLength={1} className="gcv-own" d="M54 134H306V140H54Z" />
        </>
      )}
    </svg>
  );
}
