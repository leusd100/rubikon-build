import type { DirectionItem } from '../../types/directionPage';

export function HangarDecisionChapter({ items }: { items: readonly DirectionItem[] }) {
  return (
    <section className="page-section hangar-decision-section" aria-labelledby="hangar-decisions-title">
      <div className="shell hangar-decision-grid">
        <header className="hangar-decision-heading">
          <p className="eyebrow"><span /> Технічна логіка</p>
          <h2 id="hangar-decisions-title">Що визначає майбутній ангар</h2>
          <p>
            Конфігурація дає стартову рамку. Остаточне рішення формується з функції споруди,
            навантажень, умов майданчика та потрібної комплектації.
          </p>
        </header>

        <ol className="hangar-decision-list">
          {items.map(([number, title, text]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
