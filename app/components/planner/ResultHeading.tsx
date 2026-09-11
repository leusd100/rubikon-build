/** The result band's heading: what kind of answer the planner reached. */
export function ResultHeading({ id, eyebrow, heading, lead }: { id: string; eyebrow: string; heading: string; lead: string }) {
  return (
    <header className="planner-result-heading" data-planner-anchor>
      <p className="eyebrow"><span /> {eyebrow}</p>
      <h2 id={id} tabIndex={-1} data-planner-focus>{heading}</h2>
      <p className="planner-result-lead">{lead}</p>
    </header>
  );
}
