// /yak-pratsyuiemo «З чого можна почати» — three small line drawings for three starting states: a loose sketch (задум),
// a dimensioned drawing (проєкт), a structural detail (конкретний обсяг). Decoration beside the words, hidden from
// assistive technology.
export type StartKind = 'idea' | 'drawing' | 'scope';

export function StartGlyph({ kind }: Readonly<{ kind: StartKind }>) {
  return (
    <svg className={`start-glyph start-glyph-${kind}`} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {kind === 'idea' && (
        <>
          <path className="sg-soft" d="M10 44 C14 42 16 46 20 44 S28 42 32 44 S42 46 54 43" pathLength={1} />
          <path className="sg-main" d="M14 43 L15 27 L32 15 L50 27 L49 42" pathLength={1} />
          <path className="sg-soft sg-dash" d="M24 43 L24 32 L32 30 L40 32 L40 43" pathLength={1} />
        </>
      )}
      {kind === 'drawing' && (
        <>
          <rect className="sg-soft" x="9" y="9" width="46" height="46" rx="1" pathLength={1} />
          <path className="sg-grid" d="M9 22 H55 M9 35 H55 M22 9 V55 M35 9 V55" pathLength={1} />
          <path className="sg-main" d="M16 46 L16 28 L32 20 L48 28 L48 46 Z" pathLength={1} />
          <path className="sg-main sg-dim" d="M16 51 H48 M16 49 V53 M48 49 V53" pathLength={1} />
        </>
      )}
      {kind === 'scope' && (
        <>
          <path className="sg-main" d="M26 8 V44 M38 8 V44 M22 8 H42 M22 44 H42" pathLength={1} />
          <path className="sg-main" d="M14 44 H50 V50 H14 Z" pathLength={1} />
          <path className="sg-soft" d="M10 56 H54" pathLength={1} />
          <circle className="sg-bolt" cx="20" cy="47" r="1.6" />
          <circle className="sg-bolt" cx="44" cy="47" r="1.6" />
        </>
      )}
    </svg>
  );
}
