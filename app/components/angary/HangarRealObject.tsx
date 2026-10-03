import type { HomeProofCase } from '../../data/homeProof';
import { DrawingSheet } from '../DrawingSheet';
import { ScopeCells } from '../home-v2/ScopeCells';

// /angary right after «Каркас вашого ангара» (owner, 03.10): the drawing above is the visitor's frame as a scheme, this
// is a built one as a photo — the one real hangar the site may show, HOME's proof record (app/data/homeProof.ts). Only
// the record's words and HOME's: the photo on the «Креслення» sheet with its retouch said in the title block, the
// record's attribution verbatim and its confirmed scope. No size, place, year or client, and never a RUBIKON BUILD
// project: the eyebrow says whose experience it is, as on HOME.

/** HOME's eyebrow for this provenance; a RUBIKON record would get only «Реальний об’єкт», its title block's words */
const EYEBROW: Record<HomeProofCase['provenance'], string> = {
  'serhii-prior': 'Реалізований об’єкт до створення RUBIKON BUILD',
  rubikon: 'Реальний об’єкт',
};

export function HangarRealObject({ proof }: Readonly<{ proof: HomeProofCase }>) {
  const { photo, scope } = proof;
  // HOME's heading for the same record («Ангар: каркас, стінові панелі, покрівля»), built from the confirmed scope
  const title = `Ангар: ${scope.subject.map((item) => item.toLowerCase()).join(', ')}`;

  return (
    <section className="page-section angary-real" id="real-object" aria-labelledby="angary-real-title">
      <div className="shell angary-real-grid">
        <DrawingSheet
          className="angary-real-sheet"
          imageClassName="angary-real-media"
          cells={[
            { tone: 'note', label: 'Об’єкт', value: <><b>Реальний об’єкт.</b> {proof.caption}. Фото з ретушшю переднього плану.</> },
            { label: 'Зображення', value: 'Фото об’єкта' },
          ]}
        >
          {/* HOME's WebP crops of the record's photo. sizes = the width the photo is drawn at: on a phone the sheet crops it
              to 4 : 3 (angary-editorial.css), so the 1536 × 788 frame is drawn 1.46 × the sheet's picture wide — the page
              less 66 px of margins — and a 3× phone takes the 1536w as HOME does (04.10: it took the 960w); the page width
              less the sheet's margins while the row stacks (≤ 1023 px); about half the window beside the facts */}
          <picture>
            <source
              type="image/webp"
              srcSet="/media/home-v2/hangar-retouched-960w.webp 960w, /media/home-v2/hangar-retouched-1536w.webp 1536w"
              sizes="(max-width: 760px) calc((100vw - 66px) * 1.46), (max-width: 1023px) calc(100vw - 76px), 50vw"
            />
            <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" />
          </picture>
        </DrawingSheet>
        <div className="angary-real-facts">
          <p className="eyebrow"><span /> {EYEBROW[proof.provenance]}</p>
          <h2 id="angary-real-title">{title}</h2>
          <p>{proof.attribution}</p>
          <ScopeCells items={scope.subject} />
        </div>
      </div>
    </section>
  );
}
