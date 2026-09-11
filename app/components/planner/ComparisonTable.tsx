/** Side-by-side comparison as a real table, scrollable inside its own box on narrow screens. */
export function ComparisonTable({
  caption,
  cornerLabel,
  columns,
  rows,
}: {
  caption: string;
  cornerLabel: string;
  columns: readonly string[];
  rows: readonly { label: string; cells: readonly string[] }[];
}) {
  return (
    <div className="planner-comparison" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="planner-sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{cornerLabel}</th>
            {columns.map((column) => <th scope="col" key={column}>{column}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.cells.map((cell, index) => <td key={`${row.label}-${index}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
