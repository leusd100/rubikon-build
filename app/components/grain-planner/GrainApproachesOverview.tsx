import { GRAIN_SCOPE_KEY, grainPage } from '../../data/grainPage';
import { candidateCatalog, type CandidateKey } from '../../lib/planner/grain';
import { ScopeKey } from '../directions/ScopeKey';
import { ApproachCard } from '../planner/ApproachCard';
import { ResultHeading } from '../planner/ResultHeading';
import { GrainCandidateVisual } from './GrainCandidateVisual';

const ORDER: CandidateKey[] = ['silo', 'framed', 'arch'];

/**
 * The result band before a consultation: the three approaches the planner compares, described
 * neutrally. Server-rendered, so the page carries this content for visitors who only scroll and
 * for search engines; the personalised result replaces it in place after reveal.
 */
export function GrainApproachesOverview() {
  return (
    <div className="planner-overview">
      <ResultHeading
        id="grain-overview-title"
        eyebrow="Що ми порівнюємо"
        heading="Три підходи до зерносховища — і жоден не обирається наосліп."
        lead="Силосна система, каркасне та арочне підлогові сховища. Пройдіть консультацію вище — і планувальник покаже, які з них доречні саме для вашої задачі та чому."
      />
      {/* On a phone the row scrolls sideways, so it takes keyboard focus (axe: scrollable-region-focusable). The cards draw
          in once in view (data-motion); no category line over the drawing — it only repeated the title under it. */}
      <section className="planner-approach-grid is-count-3" aria-label="Три підходи до зерносховища" tabIndex={0} data-motion="">
        {ORDER.map((key) => (
          <ApproachCard
            key={key}
            title={candidateCatalog[key].title}
            summary={grainPage.approaches[key]}
            visual={<GrainCandidateVisual type={key} />}
          />
        ))}
      </section>
      <ScopeKey items={GRAIN_SCOPE_KEY} className="planner-overview-key" />
      <a className="planner-overview-link" href="#planner">Сформувати задачу <span aria-hidden="true">↑</span></a>
    </div>
  );
}
