/** Who is responsible for what, in the page's one wording — shown under the decision boundary. */
export function ResponsibilityNote({ label, statement }: { label: string; statement: string }) {
  return (
    <p className="planner-responsibility"><b>{label}</b> {statement}</p>
  );
}
