/**
 * Narrow screens only: the planner's current understanding next to the question that changed it.
 * The full panel is not in the flow there, so this strip carries the live region instead; above
 * 1050 px it is hidden and the panel carries it. Only one of the two is ever rendered visibly.
 */
export function LiveStrip({ label, synthesis, latestFact }: { label: string; synthesis: string; latestFact: string | null }) {
  return (
    <div className="planner-live-strip" aria-live="polite">
      <p>{label}</p>
      <b key={synthesis}>{synthesis}</b>
      {latestFact && <span key={latestFact}>+ {latestFact}</span>}
    </div>
  );
}
