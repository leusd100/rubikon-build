import './scope-key.css';

// A drawing's key where its line types say who does what: a copper line for the building part RUBIKON does, a long
// graphite dash for the equipment and works of specialists (the drawing dictionary's «someone else's equipment»). Used
// under /zernoskhovyshcha's section (DirectionNode) and its three approaches.

export type ScopeKeyItem = { tone: 'own' | 'partner'; label: string };

export function ScopeKey({ items, className }: Readonly<{ items: readonly ScopeKeyItem[]; className?: string }>) {
  return (
    <ul className={['scope-key', className].filter(Boolean).join(' ')} aria-label="Умовні позначення">
      {items.map((item) => (
        <li key={item.tone} data-tone={item.tone}>
          <span className="scope-key-line" aria-hidden="true" />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
