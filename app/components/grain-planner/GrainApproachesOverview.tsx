import { candidateCatalog, type CandidateKey } from '../../lib/planner/grain';
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
      <div className="planner-approach-grid is-count-3">
        {ORDER.map((key) => (
          <ApproachCard
            key={key}
            category={candidateCatalog[key].category}
            title={candidateCatalog[key].title}
            summary={candidateCatalog[key].summary}
            visual={<GrainCandidateVisual type={key} />}
          />
        ))}
      </div>
      <a className="planner-overview-link" href="#planner">Сформувати задачу <span aria-hidden="true">↑</span></a>
    </div>
  );
}
