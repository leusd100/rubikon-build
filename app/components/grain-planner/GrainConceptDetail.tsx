import type { Candidate } from '../../lib/planner/grain';
import { WhyBlock } from '../planner/WhyBlock';
import { GrainCandidateVisual } from './GrainCandidateVisual';

/** One approach in depth: why it is in the comparison and what needs careful work. */
export function GrainConceptDetail({ candidate }: { candidate: Candidate }) {
  return (
    <div className="planner-concept">
      <div className="planner-concept-visual">
        <GrainCandidateVisual type={candidate.key} />
        <span>Концептуально · без масштабу</span>
      </div>
      <div className="planner-concept-copy">
        <p className="planner-concept-category">{candidate.category}</p>
        <h3>{candidate.title}</h3>
        <span className="planner-status">{candidate.label}</span>
        <WhyBlock heading="Чому ми її показуємо" reasons={candidate.reasons} />
        <div className="planner-careful">
          <h4>Що потрібно уважно опрацювати</h4>
          <ul>{candidate.careful.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
