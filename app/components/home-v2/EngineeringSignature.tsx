import type { HomeProofCase } from '../../data/homeProof';
import { siteRoutes } from '../../data/navigation';
import { leadership } from '../../data/people';
import { ProofContour } from './ProofContour';
import { IslandBoundary } from '../IslandBoundary';
import { FrameTourIsland } from './FrameTourIsland';
import { ScopeCells, type ScopeFrame } from './ScopeCells';
import { keepHeadingWords } from '../../lib/typography';
import { Arrow } from '../Arrow';

// HOME v2 — the signature block. Its rule: an illustration EXPLAINS, a photo PROVES.
//
// Order: the real object comes first, straight under the heading — since 04.10 (owner's decision, variant A «Калька»)
// ONE «Креслення» sheet: the photo («Фото об’єкта», its foreground retouch stated) and, right of a seam the visitor
// moves, the same frame as a tracing (ProofContour). Over the tracing, chosen in the title block: the lines and
// scale-free figures measured from eight photos of this hangar («Контур»), or — the default since 04.10 (owner: more
// on the right side, a test of what the frame could be) — a SCHEME of a frame of the type the owner names for this
// object, drawn inside its measured silhouette and labelled as a scheme without sizes («Каркас», «Сніг», «Вітер»). It is
// never this building's structure and never goes over the photo itself; the generated X-ray sketch that once stood
// beside the photo is gone. Two explanation cards followed until 09.10; the second sheet («Вузол 1») left HOME after
// the block's audit — node В on the sheet shows the same column base, larger, taken apart and with its load.
//
// Since 02.11 (owner: the site's best motion stood at the end of /angary and a client may never reach it) the block opens
// on the frame tour, /angary's own drawing on the configurator's example, labelled «Приклад»; the real object follows it.
// Its scope is three frames of the same retouched file (a part no photo shows, the frame, comes from the scheme, stamped so).
//
// Nothing here names a product: no «digital twin», explorer, load-path software or building passport.

const people = leadership;

const frameOf = (name: string, kind: ScopeFrame['kind']): ScopeFrame => ({
  src: `/media/home-v2/scope-${name}-880w.webp`,
  srcSet: `/media/home-v2/scope-${name}-480w.webp 480w, /media/home-v2/scope-${name}-880w.webp 880w`,
  kind,
});
const SCOPE_FRAMES: Readonly<Record<string, ScopeFrame>> = {
  Каркас: frameOf('frame', 'Схема'),
  'Стінові панелі': frameOf('panels', 'Фото'),
  Покрівля: frameOf('roof', 'Фото'),
};

function ProofStage({ proof }: Readonly<{ proof: HomeProofCase }>) {
  const { photo, scope } = proof;
  return (
    <div className="hv2-proof" id="real-object">
      {/* The sheet is HOME's enhancement: if its code fails to load, the photo it traces stands in its place (CC-02) */}
      <IslandBoundary
        name="proof-contour"
        fallback={(
          <figure className="island-fallback-photo">
            {/* eslint-disable-next-line @next/next/no-img-element -- as ResponsiveImage: next/image resizing is a no-op in this build */}
            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
            <figcaption>Креслення не завантажилось — оновіть сторінку, щоб відкрити його.</figcaption>
          </figure>
        )}
      >
        <ProofContour photo={photo} />
      </IslandBoundary>

      <div className="hv2-proof-facts">
        <div className="hv2-evidence-lead">
          <p className="hv2-kicker"><span aria-hidden="true" /> Реалізований об’єкт до створення RUBIKON BUILD</p>
          <h3>Ангар: каркас, стінові панелі, покрівля</h3>
          {/* the provenance in full, under the sheet (its title block says only what the two halves are): before RUBIKON
              BUILD, and the photo's foreground retouched */}
          <p>{proof.attribution} Фото з ретушшю переднього плану.</p>
          <ScopeCells items={scope.subject} linked frames={SCOPE_FRAMES} />
        </div>
        {/* No portraits (the generated ones were removed in #124). */}
        <div className="hv2-people">
          <p className="hv2-kicker"><span aria-hidden="true" /> Хто веде роботу</p>
          <p className="hv2-people-note">Родинна компанія — два покоління в одній команді.</p>
          {people.map(({ name, role }) => (
            <div className="hv2-person" key={name}>
              <h4>{name}</h4>
              <p>{role}</p>
            </div>
          ))}
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
          <h2 id="hv2-signature-title">{keepHeadingWords('Як ми дивимося на об’єкт')}</h2>
          <div className="hv2-signature-support">
            <p>
              Пояснюємо об’єкт через його конструкцію — на фото, кресленні чи простій схемі. Так легше разом визначити,
              які роботи потрібні.
            </p>
            {proof && <a className="link-arrow hv2-proof-shortcut" href="#real-object">Фото реального ангара <Arrow to="down" /></a>}
          </div>
        </header>

        {/* The tour is an enhancement like the sheet: if its code fails, the block simply opens on the real object */}
        <div className="hv2-frame-room">
          <p className="hv2-kicker hv2-frame-label">Приклад каркаса</p>
          <IslandBoundary name="home-frame-tour" fallback={null}>
            <FrameTourIsland />
          </IslandBoundary>
        </div>
        <p className="hv2-frame-brief">
          {/* The way from the example to the visitor's own hangar, in the sheet's own words */}
          <a className="link-arrow hv2-people-link" href="/angary#configurator">Такий ангар, але ваш: сформувати бриф <Arrow to="right" /></a>
        </p>

        {proof && <ProofStage proof={proof} />}

        <div className="hv2-signature-foot">
          <p className="hv2-boundary">
            Ілюстрації та схеми пояснюють підхід і не замінюють проєкт: розрахунки та проєктні рішення — за проєктувальником.
          </p>
          {/* The one way on from the explanation to how the work itself is organised; the band's own link style */}
          <a className="link-arrow hv2-people-link hv2-process-link" href={siteRoutes.process}>Як працюємо <Arrow to="up-right" /></a>
        </div>
      </div>
    </section>
  );
}
