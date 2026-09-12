import { grainPage } from '../../data/grainPage';
import { SectionHeader } from '../SiteChrome';
import { GrainPlanner } from './GrainPlanner';

/** Band 02 (#planner): the consultation, introduced with the site's canonical section header. */
export function GrainPlannerBand() {
  return (
    <section id="planner" className="page-section grain-planner-root grain-planner-band">
      <div className="shell">
        <SectionHeader
          className="planner-section-header"
          eyebrow={grainPage.planner.eyebrow}
          title={grainPage.planner.title}
          supporting={grainPage.planner.supporting}
        />
        <GrainPlanner />
      </div>
    </section>
  );
}
