import { useId, type ReactNode } from 'react';

// /pro-nas «Принципи, які видно в роботі» (owner 06.10: the three icon cards were «як у всіх»): each principle is the mark
// an engineer actually puts on a sheet for it — a revision cloud with its delta for a change that is talked through, a
// node callout with its detail for a key decision kept under control, and a scope boundary for who answers for what.
// On the dark band: copper is the mark itself (RUBIKON's part), graphite the drawing it sits on, long dash someone
// else's (the networks). Decorative: each card's title and text say the same.

export type PrincipleMarkKind = 'revision' | 'node' | 'boundary';

/** A revision cloud around a box: scallops of about `r` bulging outward, clockwise from the top-left corner. */
function cloud(x: number, y: number, w: number, h: number, r: number) {
  const side = (from: [number, number], to: [number, number]) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.max(1, Math.round(len / (2 * r)));
    const arc = len / n / 2;
    let d = '';
    for (let i = 1; i <= n; i += 1) {
      const px = from[0] + ((to[0] - from[0]) * i) / n;
      const py = from[1] + ((to[1] - from[1]) * i) / n;
      d += `A${arc.toFixed(2)} ${arc.toFixed(2)} 0 0 1 ${px.toFixed(2)} ${py.toFixed(2)}`;
    }
    return d;
  };
  const a: [number, number] = [x, y];
  const b: [number, number] = [x + w, y];
  const c: [number, number] = [x + w, y + h];
  const e: [number, number] = [x, y + h];
  return `M${x} ${y}${side(a, b)}${side(b, c)}${side(c, e)}${side(e, a)}Z`;
}

function Revision() {
  return (
    <>
      <path className="pm-ink" d="M14 104H214M38 104V54L118 28L198 54V104" />
      {/* the gate opening the change added to the wall */}
      <path className="pm-ink" d="M94 104V66H142V104M118 66V104" />
      <path pathLength={1} className="pm-own" d={cloud(82, 56, 72, 54, 6)} />
      {/* the revision delta, its leader to the cloud */}
      <path pathLength={1} className="pm-own" d="M174 26L186 46H162Z" />
      <text className="pm-delta" x="174" y="42.5">1</text>
      <path pathLength={1} className="pm-own pm-thin" d="M166 47L155 56" />
      {/* the sheet's revision table: the change is written down and agreed */}
      <path className="pm-ink" d="M226 62H306V104H226ZM226 76H306M226 90H306M246 62V104M286 62V104" />
      <path className="pm-ink pm-text-line" d="M252 69H278M252 97H272" />
      <path pathLength={1} className="pm-own" d="M236 79L241 88H231Z" />
      <path className="pm-ink pm-text-line" d="M252 83H280" />
      <path pathLength={1} className="pm-own" d="M291 83l3 3l6 -7" />
    </>
  );
}

function NodeCallout({ clipId }: Readonly<{ clipId: string }>) {
  return (
    <>
      {/* the frame's knee: column, haunched rafter */}
      <path className="pm-ink" d="M14 104H126M32 104H58M40 104V34M50 104V58M40 34L134 10M50 46L134 24M50 60L78 39" />
      <circle pathLength={1} className="pm-own" cx="47" cy="42" r="20" />
      <path pathLength={1} className="pm-own pm-thin" d="M57 59.5L200 64" />
      <circle className="pm-dot" cx="57" cy="59.5" r="2" />
      <text className="pm-label" x="128" y="84">Вузол 1</text>
      {/* the node at scale: column flange, end plate, rafter flanges, four bolts */}
      <clipPath id={clipId}>
        <circle cx="246" cy="64" r="44" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        <path className="pm-ink" d="M218 0V128M228 0V128" />
        <path className="pm-cut" d="M232 26H240V102H232Z" />
        <path className="pm-ink" d="M240 34L300 18M240 50L300 34M240 98L300 62" />
        {[42, 56, 76, 90].map((y) => (
          <g key={y}>
            <circle pathLength={1} className="pm-own" cx="236" cy={y} r="3" />
            <path className="pm-own pm-thin" d={`M231 ${y}H241`} />
          </g>
        ))}
      </g>
      <circle pathLength={1} className="pm-own" cx="246" cy="64" r="44" />
    </>
  );
}

function Boundary() {
  return (
    <>
      <path className="pm-ink" d="M14 104H306" />
      {/* RUBIKON's part: the building */}
      <path pathLength={1} className="pm-own pm-fill" d="M36 104V58L100 32L164 58V104Z" />
      <path className="pm-ink" d="M58 104V80H82V104M118 76H146V92H118Z" />
      {/* someone else's: the networks and their pole */}
      <path className="pm-partner" d="M270 104V34M256 42H284M258 44Q220 70 164 74" />
      {/* the boundary agreed before the work, the connection point on it */}
      <path pathLength={1} className="pm-own pm-line" d="M200 16V112" />
      <circle className="pm-dot" cx="200" cy="66.3" r="3.2" />
      <text className="pm-label pm-label-own" x="100" y="18">RUBIKON</text>
      <text className="pm-label" x="252" y="18">Інші учасники</text>
    </>
  );
}

const MARKS: Record<PrincipleMarkKind, (clipId: string) => ReactNode> = {
  revision: () => <Revision />,
  node: (clipId) => <NodeCallout clipId={clipId} />,
  boundary: () => <Boundary />,
};

export function PrincipleMark({ kind }: Readonly<{ kind: PrincipleMarkKind }>) {
  const clipId = `pm-${useId().replace(/:/g, '')}`;
  return (
    <svg className="principle-mark" viewBox="0 0 320 120" aria-hidden="true" focusable="false">
      {MARKS[kind](clipId)}
    </svg>
  );
}
