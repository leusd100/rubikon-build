import { SectionHeader } from '../SiteChrome';
import { GrainPlanner } from './GrainPlanner';

/** Band 02 (#planner): the consultation, introduced with the site's canonical section header. */
export function GrainPlannerBand() {
  return (
    <section id="planner" className="page-section grain-planner-root grain-planner-band">
      <div className="shell">
        <SectionHeader
          className="planner-section-header"
          eyebrow="Починаємо з вашої задачі"
          title="Який зерновий об’єкт вам насправді потрібен?"
          supporting="Відповіді формують інженерний контекст — без передчасного вибору будівлі."
        />
        <GrainPlanner />
      </div>
    </section>
  );
}
