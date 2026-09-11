import { getDirectionPage } from '../../lib/directions';
import { DirectionPage } from '../DirectionDetail';
import { GrainApproachesOverview } from './GrainApproachesOverview';
import { GrainPlannerBand } from './GrainPlannerBand';
import { GrainPlannerProvider } from './GrainPlannerProvider';
import { GrainResultBand } from './GrainResultBand';

/**
 * The Grain Planner page composition: the /zernoskhovyshcha direction template with the planner
 * band and the standalone result band in its signature slot, then FAQ, related directions and the
 * site's one #inquiry form. Rendered by /planner-preview now; /zernoskhovyshcha adopts it behind
 * releaseFlags in Phase 4.
 *
 * `editorialArchitecture={false}`: bands 04–05 («Як RUBIKON реалізує», process after the brief)
 * arrive with their copy in Phase 4. `false`, not `null` — DirectionPage falls back to the old
 * overview/editorial/process/cost sections on a nullish value, and the planner replaces those.
 */
export function GrainPlannerPage() {
  return (
    <GrainPlannerProvider>
      <DirectionPage
        config={getDirectionPage('zernoskhovyshcha')}
        signatureExperience={(
          <>
            <GrainPlannerBand />
            <GrainResultBand generic={<GrainApproachesOverview />} />
          </>
        )}
        editorialArchitecture={false}
      />
    </GrainPlannerProvider>
  );
}
