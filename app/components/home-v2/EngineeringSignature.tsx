/* eslint-disable @next/next/no-img-element -- pre-generated WebP crops, same reason as ResponsiveImage. */
import type { CSSProperties, ReactNode } from 'react';
import type { HomeProofCase } from '../../data/homeProof';
import { siteRoutes } from '../../data/navigation';
import { leadership } from '../../data/people';
import { ProofContour } from './ProofContour';
import { ScopeCells } from './ScopeCells';

// HOME v2 — the signature block. Its rule: an illustration EXPLAINS, a photo PROVES.
//
// Order: the real object comes first, straight under the heading — since 04.10 (owner's decision, variant A «Калька»)
// ONE «Креслення» sheet: the photo («Фото об’єкта», its foreground retouch stated) and, right of a seam the visitor
// moves, the same frame as a tracing (ProofContour). Over the tracing, chosen in the title block: the lines and
// scale-free figures measured from eight photos of this hangar («Контур»), or — the default since 04.10 (owner: more
// on the right side, a test of what the frame could be) — a SCHEME of a frame of the type the owner names for this
// object, drawn inside its measured silhouette and labelled as a scheme without sizes («Каркас», «Сніг», «Вітер»). It is
// never this building's structure and never goes over the photo itself; the generated X-ray sketch that once stood
// beside the photo is gone from the page (only /?xray=sketch shows it, for the owner's comparison). Two explanation
// cards follow, each labelled as what it is («Ілюстрація», «Схема»).
//
// Nothing here names a product: no «digital twin», explorer, load-path software or building passport.

type Pin = { label: string; x: string; y: string; side?: 'left' };

function Pins({ pins }: Readonly<{ pins: readonly Pin[] }>) {
  return (
    <>
      {pins.map(({ label, x, y, side }) => (
        <span className={`hv2-pin${side === 'left' ? ' hv2-pin-left' : ''}`} style={{ '--x': x, '--y': y } as CSSProperties} key={label}>
          <i aria-hidden="true" />
          <span>{label}</span>
        </span>
      ))}
    </>
  );
}

// Card 03's drawing: a generic portal frame, not any real object — no dimensions, no numbers. The copper dashes run
// the way the load goes: from the roof, through the frame, into the foundations.
function LoadPathScheme() {
  const leftY = (x: number) => 172 - ((x - 108) * 60) / 132;
  const rightY = (x: number) => 112 + ((x - 240) * 60) / 132;
  const arrows = [128, 156, 184, 212, 240, 268, 296, 324, 352].map((x) => ({ x, y: x <= 240 ? leftY(x) : rightY(x) }));
  return (
    <svg className="hv2-scheme" viewBox="0 0 480 360" role="img" aria-label="Схема: навантаження з покрівлі передається через раму на фундаменти">
      <defs>
        <pattern id="hv2-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" className="hv2-scheme-grid" />
        </pattern>
        <marker id="hv2-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="hv2-scheme-arrowhead" />
        </marker>
        <marker id="hv2-arrow-flow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" className="hv2-scheme-flowhead" />
        </marker>
      </defs>
      <rect width="480" height="360" fill="url(#hv2-grid)" />
      <polyline className="hv2-scheme-load" points={arrows.map(({ x, y }) => `${x},${y - 44}`).join(' ')} />
      {arrows.map(({ x, y }) => (
        <line key={x} className="hv2-scheme-load" x1={x} y1={y - 44} x2={x} y2={y - 9} markerEnd="url(#hv2-arrow)" />
      ))}
      <line className="hv2-scheme-ground" x1="36" y1="292" x2="444" y2="292" />
      {[108, 372].map((x) => (
        <polygon key={x} className="hv2-scheme-footing" points={`${x - 16},292 ${x + 16},292 ${x + 16},300 ${x + 24},300 ${x + 24},318 ${x - 24},318 ${x - 24},300 ${x - 16},300`} />
      ))}
      <polyline className="hv2-scheme-frame" points="108,292 108,172 240,112 372,172 372,292" />
      <polyline className="hv2-scheme-frame-inner" points="116,292 116,178 240,121 364,178 364,292" />
      <path className="hv2-scheme-flow" d="M240 116 L110 175 L110 286" markerEnd="url(#hv2-arrow-flow)" />
      <path className="hv2-scheme-flow" d="M240 116 L370 175 L370 286" markerEnd="url(#hv2-arrow-flow)" />
      <line className="hv2-scheme-dim" x1="120" y1="340" x2="360" y2="340" />
      {[108, 372].map((x, i) => (
        <g key={x}>
          <circle className="hv2-scheme-axis" cx={x} cy="340" r="12" />
          <text className="hv2-scheme-axis-label" x={x} y="345" textAnchor="middle">{i === 0 ? 'А' : 'Б'}</text>
        </g>
      ))}
      <text className="hv2-scheme-label" x="240" y="42" textAnchor="middle">Покрівля</text>
      <text className="hv2-scheme-label" x="384" y="238">Рама</text>
      <text className="hv2-scheme-label" x="240" y="317" textAnchor="middle">Фундамент</text>
    </svg>
  );
}

const cards: readonly { number: string; title: ReactNode; text: string; tag: string; visual: ReactNode }[] = [
  {
    number: '01',
    title: 'Вузол у деталях',
    text: 'Окремо розбираємо важливі з’єднання, примикання й деталі виконання — те, чого після монтажу вже не видно.',
    tag: 'Ілюстрація',
    visual: (
      <>
        {/* sizes = the card's picture box (home-v2.css): full card width on a phone, the card's left half while the
            cards stack (761–1050 px), a quarter of the row beside each other */}
        <img
          src="/media/home-v2/concepts/card-node-1040w.webp"
          srcSet="/media/home-v2/concepts/card-node-640w.webp 640w, /media/home-v2/concepts/card-node-1040w.webp 1040w"
          sizes="(max-width: 760px) calc(100vw - 34px), (max-width: 1050px) 47vw, 24vw"
          alt="Ілюстрація: опорний вузол сталевої колони на бетонній основі"
          loading="lazy"
          decoding="async"
        />
        <Pins pins={[
          { label: 'Ребро жорсткості', x: '60%', y: '31%', side: 'left' },
          { label: 'Опорна плита', x: '80%', y: '66%', side: 'left' },
          { label: 'Анкерне кріплення', x: '53%', y: '82%', side: 'left' },
        ]} />
      </>
    ),
  },
  {
    number: '02',
    title: 'Як працює конструкція',
    text: 'Простою схемою пояснюємо логіку основних елементів: як навантаження з покрівлі передається через каркас на фундамент.',
    tag: 'Схема',
    visual: <LoadPathScheme />,
  },
];

const people = leadership;

function ProofStage({ proof }: Readonly<{ proof: HomeProofCase }>) {
  const { photo, scope } = proof;
  return (
    <div className="hv2-proof" id="real-object">
      <ProofContour photo={photo} />

      <div className="hv2-proof-facts">
        <div className="hv2-evidence-lead">
          <p className="hv2-kicker"><span aria-hidden="true" /> Реалізований об’єкт до створення RUBIKON BUILD</p>
          <h3>Ангар: каркас, стінові панелі, покрівля</h3>
          <p>{proof.attribution}</p>
          <ScopeCells items={scope.subject} />
        </div>
        {/* Roles sit next to the proof, compactly — no portraits (the generated ones were removed in #124). */}
        <div className="hv2-people">
          <p className="hv2-kicker"><span aria-hidden="true" /> Хто веде роботу</p>
          {people.map(({ name, role }) => (
            <div className="hv2-person" key={name}>
              <h4>{name}</h4>
              <p>{role}</p>
            </div>
          ))}
          <p className="hv2-people-note">Родинна компанія — два покоління в одній команді.</p>
          <a className="hv2-people-link" href={siteRoutes.about}>Про команду <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </div>
  );
}

export function EngineeringSignature({ proof }: Readonly<{ proof: HomeProofCase | null }>) {
  return (
    <section className="hv2-signature section" id="engineering" aria-labelledby="hv2-signature-title">
      <div className="hv2-signature-lines" aria-hidden="true" />
      <div className="shell">
        <header className="hv2-signature-head">
          <p className="hv2-kicker"><span aria-hidden="true" /> Інженерний погляд</p>
          <h2 id="hv2-signature-title">Як ми дивимося на об’єкт</h2>
          <p className="hv2-signature-support">
            Пояснюємо об’єкт через його конструкцію — на фото, кресленні чи простій схемі. Так легше разом визначити,
            які роботи потрібні.
          </p>
        </header>

        {proof && <ProofStage proof={proof} />}

        <div className="hv2-cards">
          {cards.map(({ number, title, text, tag, visual }) => (
            <article className="hv2-card" key={number}>
              <div className="hv2-card-visual">
                {visual}
                <span className="hv2-tag">{tag}</span>
              </div>
              <div className="hv2-card-body">
                <span className="hv2-card-number">{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </article>
          ))}
        </div>

        <p className="hv2-boundary">
          Ілюстрації та схеми пояснюють підхід і не замінюють проєкт: розрахунки та проєктні рішення — за проєктувальником.
        </p>
      </div>
    </section>
  );
}
