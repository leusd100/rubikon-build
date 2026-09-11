/** Why an approach is in the comparison — in the client's own answers. */
export function WhyBlock({ heading, reasons }: { heading: string; reasons: readonly string[] }) {
  return (
    <div className="planner-why">
      <h4>{heading}</h4>
      <ol>
        {reasons.map((reason, index) => (
          <li key={reason}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{reason}</li>
        ))}
      </ol>
    </div>
  );
}
