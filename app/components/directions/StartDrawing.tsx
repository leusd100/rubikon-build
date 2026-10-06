import type { ReactNode } from 'react';

// /napryamky «Що у вас уже є» (owner 06.10: «зробити блок набагато цікавішим»): what a visitor comes with, drawn — a sketch
// with a question, the plot's plan with its north, a massing sketch of the building, a set of sheets under a title block.
// Graphite at rest; the chosen one plots in copper, and its small copy rides the track to the stage the work starts from.
// Solid lines carry pathLength 1 so they can plot; the dashed ones (boundary, hidden edges) fade instead — a pathLength
// dash would turn them solid.
// Decorative: each card's label says the same.

const DRAWINGS: Record<string, ReactNode> = {
  // just the task: a hand sketch on a sheet, and the open question
  'task-only': (
    <>
      <path className="sd-faint" d="M20 6H86L98 18V66H20ZM86 6V18H98" />
      <path pathLength={1} className="sd-ink" d="M31 56c0-6 1-12 0-18c7-5 14-9 21-13c6 4 13 8 20 12c-1 6 0 12 0 19M28 56.5c15 .8 31-.6 47 .2" />
      <text className="sd-mark" x="84" y="54">?</text>
    </>
  ),
  // the initial data and the site: the plot's boundary, the access, the north
  'site-inputs': (
    <>
      <path className="sd-faint" d="M8 66H112M14 66V60" />
      <path className="sd-boundary" d="M16 58L24 12L92 16L98 56Z" />
      <path className="sd-faint" d="M40 30H70V44H40Z" />
      <path pathLength={1} className="sd-ink" d="M98 56L112 62" />
      <path pathLength={1} className="sd-ink" d="M108 30V8M103 14L108 8L113 14" />
      <text className="sd-letter" x="108" y="40">Пн</text>
    </>
  ),
  // a concept: the building's massing, sketched in axonometry
  concept: (
    <>
      <path pathLength={1} className="sd-ink" d="M18 64V40L38 28L58 40V64ZM38 28L74 14L94 26L58 40M94 26V50L58 64" />
      <path className="sd-hidden" d="M18 40L54 26L74 14M54 26V50L18 64" />
    </>
  ),
  // the project or working drawings: a set of sheets, the top one with its section and title block
  'design-docs': (
    <>
      <path className="sd-faint" d="M34 4H104V54H34ZM27 9H97V59H27Z" />
      <path pathLength={1} className="sd-ink sd-sheet" d="M20 14H90V66H20Z" />
      <path className="sd-faint" d="M30 50V36L46 27L62 36V50M27 50H66" />
      <path pathLength={1} className="sd-ink" d="M66 56H90M66 56V66M78 56V66" />
    </>
  ),
};

export function StartDrawing({ kind, className = 'start-drawing' }: Readonly<{ kind: string; className?: string }>) {
  const drawing = DRAWINGS[kind];
  if (!drawing) return null;
  return (
    <svg className={className} viewBox="0 0 120 72" aria-hidden="true" focusable="false">
      {drawing}
    </svg>
  );
}
