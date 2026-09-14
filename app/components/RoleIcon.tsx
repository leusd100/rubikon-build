import type { ReactNode } from 'react';

// RUBIKON's role icons: one construction object per semantic role, so a role reads the same on
// every page that shows it (/yak-pratsyuiemo first, the competency pages later). An icon only ever
// sits beside its role's text label — never instead of it — and is hidden from assistive tech.
// Line drawings on a 24 px grid; stroke and colour come from CSS (.role-icon), so an icon takes a
// quiet tone of its label and adds no colour of its own. See docs/role-icons.md.

export const ROLES = ['rubikon', 'client', 'partner', 'result', 'documents', 'scope', 'schedule', 'why'] as const;
export type Role = (typeof ROLES)[number];

const GLYPHS: Record<Role, ReactNode> = {
  // RUBIKON: an I-beam in section, the load-bearing core.
  rubikon: <path d="M4 4.5h16M4 19.5h16M12 4.5v15M4 4.5v2M20 4.5v2M4 19.5v-2M20 19.5v-2" />,
  // Client and inputs: an arrow entering a bracket.
  client: <path d="M2.5 12h12M10.5 8l4 4-4 4M17 4.5h4v15h-4" />,
  // Partners and interfaces: two plates bolted together.
  partner: (
    <>
      <path d="M3 8h11v10H3zM10 5h11v10H10z" />
      <circle cx="12" cy="9.5" r="1.1" />
      <circle cx="12" cy="13.5" r="1.1" />
    </>
  ),
  // Result: a level mark, the height reached.
  result: <path d="M2.5 15h19M8 7.5h8L12 15zM12 15v5" />,
  // Documents: a sheet with a drawing's title block.
  documents: <path d="M5 2.5h14v19H5zM11 21.5v-6h8M11 18.5h8M8 6.5h8M8 9.5h8" />,
  // Responsibility: a dimension line with ticks, the limits of a scope.
  scope: <path d="M4 6v12M20 6v12M4 12h16M2.8 13.8l2.4-3.6M18.8 13.8l2.4-3.6" />,
  // Budget and time: bars of a schedule on its axes.
  schedule: <path d="M3 21h18M3 3v18M6 5.5h8v3H6zM10 10.5h8v3h-8zM13 15.5h7v3h-7z" />,
  // Why it matters: a plumb bob, checked true.
  why: <path d="M7 3h10M12 3v7M12 10l-3.5 3.5L12 21l3.5-7.5z" />,
};

export default function RoleIcon({ role }: Readonly<{ role: Role }>) {
  return (
    <svg className={`role-icon role-icon-${role}`} viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
      {GLYPHS[role]}
    </svg>
  );
}
