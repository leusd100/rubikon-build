/* eslint-disable @next/next/no-img-element -- pre-generated WebP crops, same reason as ResponsiveImage. */
import type { CSSProperties, ReactNode } from 'react';
import { homeProofWebpSrcSet, type HomeProofCase } from '../../data/homeProof';
import { siteRoutes } from '../../data/navigation';

// HOME v2 — the signature block. Its rule: an illustration EXPLAINS, a photo PROVES.
//
// Order (iteration 3): the real object comes first, straight under the heading, beside an X-ray illustration of a
// similar view. They are two separate images with two different labels: the photo is evidence («Фото об’єкта», with
// its foreground retouch stated), the X-ray is a generated sketch that does not match the photo literally and invents
// the frame behind the cladding («Ілюстративна схема конструкції») — never called a drawing, no sizes, nodes or
// calculations. The arrow between them reads «до принципу»: from the object to the principle, not into its insides.
// Two explanation cards follow; the old card 01 («Фото → конструкція») is what the X-ray now shows, so it is gone.
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
        <img
          src="/media/home-v2/concepts/card-node-1040w.webp"
          srcSet="/media/home-v2/concepts/card-node-640w.webp 640w, /media/home-v2/concepts/card-node-1040w.webp 1040w"
          sizes="(max-width: 760px) 100vw, 25vw"
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

// The copper load path baked into the X-ray sketch, measured on its 1774×887 pixels (orange-pixel scan): ridge
// (1052, 113) → along the rafter → eave (1418, 268) → corner → down the column at x ≈ 1490 → arrowhead at y ≈ 646;
// the footing glow sits at (1491, 700). The overlay only adds a travelling pulse on top of that path.
const XRAY_PATH = 'M1052 113 L1418 268 L1450 293 L1482 303 L1490 326 L1490 646';

const people = [
  { name: 'Сергій Іванович Леус', role: 'Будівельний напрям, організація виконання' },
  { name: 'Дмитро Сергійович Леус', role: 'Робота з клієнтами, розвиток RUBIKON' },
] as const;

function ProofStage({ proof }: Readonly<{ proof: HomeProofCase }>) {
  const { photo, scope } = proof;
  return (
    <div className="hv2-proof" id="real-object">
      <div className="hv2-proof-pair">
        <figure className="hv2-proof-photo">
          <div className="hv2-proof-media">
            <picture>
              <source type="image/webp" srcSet={homeProofWebpSrcSet} sizes="(max-width: 900px) 100vw, 42vw" />
              <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
            </picture>
            <span className="hv2-tag hv2-tag-photo">Фото об’єкта</span>
          </div>
          <figcaption><b>Реальний об’єкт.</b> Фото з ретушшю переднього плану.</figcaption>
        </figure>
        <figure className="hv2-proof-xray">
          <div className="hv2-proof-media">
            <img
              src="/media/home-v2/concepts/hangar-xray-1774w.webp"
              srcSet="/media/home-v2/concepts/hangar-xray-1100w.webp 1100w, /media/home-v2/concepts/hangar-xray-1774w.webp 1774w"
              sizes="(max-width: 900px) 170vw, 58vw"
              alt="Ілюстративна схема: ангар, у якого частину обшивки замінено умовним каркасом, зі шляхом навантаження від покрівлі до фундаменту"
              loading="lazy"
              decoding="async"
            />
            <svg className="hv2-xray-flow" viewBox="0 0 1774 887" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">
              <defs>
                <radialGradient id="hv2-xray-glow-fill">
                  <stop offset="0" stopColor="#ffb27a" stopOpacity=".95" />
                  <stop offset=".45" stopColor="#cc8455" stopOpacity=".45" />
                  <stop offset="1" stopColor="#cc8455" stopOpacity="0" />
                </radialGradient>
              </defs>
              <path className="hv2-xray-pulse-halo" d={XRAY_PATH} pathLength={1} />
              <path className="hv2-xray-pulse" d={XRAY_PATH} pathLength={1} />
              <ellipse className="hv2-xray-glow" cx="1491" cy="700" rx="70" ry="34" fill="url(#hv2-xray-glow-fill)" />
            </svg>
            <span className="hv2-proof-arrow" aria-hidden="true"><i>→</i><span>до принципу</span></span>
            <span className="hv2-tag hv2-tag-scheme">Ілюстративна схема конструкції</span>
          </div>
          <figcaption>
            <b>Ілюстрація принципу:</b> каркас і шлях навантаження від покрівлі до фундаменту. Це не креслення цього
            ангара — його прихована конструкція, розміри й вузли тут не показані.
          </figcaption>
        </figure>
      </div>

      <div className="hv2-proof-facts">
        <div className="hv2-evidence-lead">
          <p className="hv2-kicker"><span aria-hidden="true" /> Реалізований об’єкт до створення RUBIKON BUILD</p>
          <h3>Ангар: каркас, стінові панелі, покрівля</h3>
          <p>{proof.attribution}</p>
          <ul className="hv2-scope-chips" aria-label="Роботи на цьому об’єкті">
            {scope.subject.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
        {/* Roles sit next to the proof, compactly — no portraits (the generated ones were removed in #124). */}
        <div className="hv2-people">
          <p className="hv2-people-title">Хто веде роботу</p>
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
