/* eslint-disable @next/next/no-img-element -- pre-generated WebP crops, same reason as ResponsiveImage. */
import type { CSSProperties, ReactNode } from 'react';
import type { HomeProofCase } from '../../data/homeProof';
import { siteRoutes } from '../../data/navigation';

// HOME v2 — the signature block. Its rule: an illustration EXPLAINS, a photo PROVES. The three cards are
// illustrations (labelled as such) of how we explain an object; the one real object below them is evidence and is
// labelled as a photo. Neither is dressed as the other.
//
// Nothing here names a product: no «digital twin», explorer, load-path software or building passport. The cards
// describe what the customer is shown in a conversation. The note under them keeps the P01 boundary: schemes do
// not replace the design, and the designer owns calculations.

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

function CardImage({ base, alt }: Readonly<{ base: string; alt: string }>) {
  return (
    <img
      src={`/media/home-v2/concepts/${base}-1040w.webp`}
      srcSet={`/media/home-v2/concepts/${base}-640w.webp 640w, /media/home-v2/concepts/${base}-1040w.webp 1040w`}
      sizes="(max-width: 760px) 100vw, 34vw"
      alt={alt}
      loading="lazy"
      decoding="async"
    />
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
      {/* distributed load */}
      <polyline className="hv2-scheme-load" points={arrows.map(({ x, y }) => `${x},${y - 44}`).join(' ')} />
      {arrows.map(({ x, y }) => (
        <line key={x} className="hv2-scheme-load" x1={x} y1={y - 44} x2={x} y2={y - 9} markerEnd="url(#hv2-arrow)" />
      ))}
      {/* ground and footings */}
      <line className="hv2-scheme-ground" x1="36" y1="292" x2="444" y2="292" />
      {[108, 372].map((x) => (
        <polygon key={x} className="hv2-scheme-footing" points={`${x - 16},292 ${x + 16},292 ${x + 16},300 ${x + 24},300 ${x + 24},318 ${x - 24},318 ${x - 24},300 ${x - 16},300`} />
      ))}
      {/* frame */}
      <polyline className="hv2-scheme-frame" points="108,292 108,172 240,112 372,172 372,292" />
      <polyline className="hv2-scheme-frame-inner" points="116,292 116,178 240,121 364,178 364,292" />
      {/* load path */}
      <path className="hv2-scheme-flow" d="M240 116 L110 175 L110 286" markerEnd="url(#hv2-arrow-flow)" />
      <path className="hv2-scheme-flow" d="M240 116 L370 175 L370 286" markerEnd="url(#hv2-arrow-flow)" />
      {/* axes */}
      <line className="hv2-scheme-dim" x1="120" y1="340" x2="360" y2="340" />
      {[108, 372].map((x, i) => (
        <g key={x}>
          <circle className="hv2-scheme-axis" cx={x} cy="340" r="11" />
          <text className="hv2-scheme-axis-label" x={x} y="344" textAnchor="middle">{i === 0 ? 'А' : 'Б'}</text>
        </g>
      ))}
      <text className="hv2-scheme-label" x="240" y="44" textAnchor="middle">Покрівля</text>
      <text className="hv2-scheme-label" x="384" y="236">Рама</text>
      <text className="hv2-scheme-label" x="140" y="314">Фундамент</text>
    </svg>
  );
}

const cards: readonly { number: string; title: ReactNode; text: string; tag: string; visual: ReactNode }[] = [
  {
    number: '01',
    title: <>Фото <span aria-hidden="true">→</span><span className="hv2-sr">і</span> конструкція</>,
    text: 'На фото чи кресленні показуємо, з яких основних елементів складається об’єкт і як вони пов’язані між собою.',
    tag: 'Ілюстрація',
    visual: (
      <>
        <CardImage base="card-cutaway" alt="Ілюстрація: ангар із вирізом в обшивці, під яким видно каркас" />
        <Pins pins={[
          { label: 'Покрівля', x: '68%', y: '31%', side: 'left' },
          { label: 'Каркас', x: '46%', y: '57%' },
          { label: 'Стінові панелі', x: '13%', y: '69%' },
        ]} />
      </>
    ),
  },
  {
    number: '02',
    title: 'Вузол у деталях',
    text: 'Окремо розбираємо важливі з’єднання, примикання й деталі виконання — те, чого після монтажу вже не видно.',
    tag: 'Ілюстрація',
    visual: (
      <>
        <CardImage base="card-node" alt="Ілюстрація: опорний вузол сталевої колони на бетонній основі" />
        <Pins pins={[
          { label: 'Ребро жорсткості', x: '60%', y: '31%', side: 'left' },
          { label: 'Опорна плита', x: '80%', y: '66%', side: 'left' },
          { label: 'Анкерне кріплення', x: '53%', y: '76%', side: 'left' },
        ]} />
      </>
    ),
  },
  {
    number: '03',
    title: 'Як працює конструкція',
    text: 'Простою схемою пояснюємо логіку основних елементів: як навантаження з покрівлі передається через каркас на фундамент.',
    tag: 'Схема',
    visual: <LoadPathScheme />,
  },
];

// Where each confirmed scope line sits in the two crops of the approved frame (percent of the crop). Measured on the
// original 1800×1200 frame: gable apex (365, 598), side-wall panel (920, 800) / gable panel (640, 820), roof
// (1150, 665) / (800, 632). Wide crop = y 390–1110; narrow crop = x 30–1080, y 420–1120. A scope line with no
// entry here simply has no marker.
const evidencePins: Record<string, { wide: [string, string]; narrow: [string, string] }> = {
  Каркас: { wide: ['20.3%', '28.9%'], narrow: ['31.9%', '25.4%'] },
  'Стінові панелі': { wide: ['51.1%', '56.9%'], narrow: ['58.1%', '57.1%'] },
  Покрівля: { wide: ['63.9%', '38.2%'], narrow: ['73.3%', '30.3%'] },
};

function EvidenceObject({ proof }: Readonly<{ proof: HomeProofCase }>) {
  const { photo, scope } = proof;
  return (
    <figure className="hv2-evidence">
      <div className="hv2-evidence-media">
        <picture>
          <source media="(max-width: 760px)" type="image/webp" srcSet="/media/home-v2/hangar-narrow-640w.webp 640w, /media/home-v2/hangar-narrow-1050w.webp 1050w" sizes="100vw" />
          <source type="image/webp" srcSet="/media/home-v2/hangar-wide-960w.webp 960w, /media/home-v2/hangar-wide-1440w.webp 1440w, /media/home-v2/hangar-wide-1800w.webp 1800w" sizes="(max-width: 1440px) 92vw, 1296px" />
          <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
        </picture>
        {scope.subject.map((item, index) => {
          const pin = evidencePins[item];
          if (!pin) return null;
          const style = { '--x': pin.wide[0], '--y': pin.wide[1], '--mx': pin.narrow[0], '--my': pin.narrow[1] } as CSSProperties;
          return (
            <span className="hv2-evidence-pin" style={style} key={item}>
              <i aria-hidden="true">{index + 1}</i>
              <span>{item}</span>
            </span>
          );
        })}
        <span className="hv2-tag hv2-tag-photo">Фото об’єкта</span>
      </div>
      <figcaption className="hv2-evidence-facts">
        <div className="hv2-evidence-lead">
          <p className="hv2-kicker"><span aria-hidden="true" /> Реалізований об’єкт до створення RUBIKON BUILD</p>
          <h3>Ангар: каркас, стінові панелі, покрівля</h3>
          <p>{proof.attribution}</p>
        </div>
        <dl>
          <div>
            <dt>Роботи</dt>
            <dd>
              <ol className="hv2-evidence-scope">
                {scope.subject.map((item, index) => <li key={item}><i aria-hidden="true">{index + 1}</i>{item}</li>)}
              </ol>
            </dd>
          </div>
          <div>
            <dt>На фото</dt>
            <dd>{proof.caption}</dd>
          </div>
          {proof.context && (
            <div>
              <dt>Контекст</dt>
              <dd>{proof.context}</dd>
            </div>
          )}
        </dl>
      </figcaption>
    </figure>
  );
}

// No portraits: the generated ones were removed on purpose (#124) and there are no real ones yet.
const people = [
  { name: 'Сергій Іванович Леус', role: 'Будівельний напрям, організація виконання' },
  { name: 'Дмитро Сергійович Леус', role: 'Робота з клієнтами, розвиток RUBIKON' },
] as const;

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
          Ілюстрації пояснюють підхід і не замінюють проєкт: розрахунки та проєктні рішення — за проєктувальником.
          <strong> Нижче — фото реального об’єкта.</strong>
        </p>

        {proof && <EvidenceObject proof={proof} />}

        <div className="hv2-people">
          <div className="hv2-people-head">
            <p className="hv2-people-title">Хто веде роботу</p>
            <p className="hv2-people-note">Родинна компанія — два покоління в одній команді.</p>
          </div>
          {people.map(({ name, role }) => (
            <div className="hv2-person" key={name}>
              <h3>{name}</h3>
              <p>{role}</p>
            </div>
          ))}
          <a className="hv2-people-link" href={siteRoutes.about}>Про команду <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
