import { CircleHelp } from 'lucide-react';
import type { ReactNode } from 'react';

/** A follow-up question that appears inside a theme once an answer makes it relevant. */
export function Clarifier({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return (
    <div className="planner-clarifier">
      <p className="planner-clarifier-label"><CircleHelp aria-hidden="true" /> {label}</p>
      <h4>{title}</h4>
      {children}
    </div>
  );
}
