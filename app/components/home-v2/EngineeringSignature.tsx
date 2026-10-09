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
// beside the photo is gone. Two explanation cards followed until 09.10; the second sheet («Вузол 1») left HOME after
// the block's audit — node В on the sheet shows the same column base, larger, taken apart and with its load.
//
// Nothing here names a product: no «digital twin», explorer, load-path software or building passport.

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
          {/* the provenance in full, under the sheet (its title block says only what the two halves are): before RUBIKON
              BUILD, and the photo's foreground retouched */}
          <p>{proof.attribution} Фото з ретушшю переднього плану.</p>
          <ScopeCells items={scope.subject} linked />
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

        <p className="hv2-boundary">
          Ілюстрації та схеми пояснюють підхід і не замінюють проєкт: розрахунки та проєктні рішення — за проєктувальником.
        </p>
        {/* The one way on from the explanation to how the work itself is organised; the band's own link style */}
        <a className="hv2-people-link hv2-process-link" href={siteRoutes.process}>Як працюємо <span aria-hidden="true">↗</span></a>
      </div>
    </section>
  );
}
