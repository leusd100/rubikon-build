import { DirectionPage } from '../components/DirectionDetail';
import { GrainComplexPage } from '../components/zernoskhovyshcha/GrainComplexPage';
import { grainPlannerRouteMode, releaseFlags } from '../data/releaseFlags';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import './grain-planner.css';
import './grain-editorial.css';

export const metadata = createDirectionMetadata('zernoskhovyshcha');

/**
 * The complex on a drawing since 06.10 (the Grain Planner composition before it stays on /planner-preview). With the
 * flag off this page renders the previous direction page again — the rollback path, kept until the cleanup PR — and the
 * two stylesheets above go with it (tests/unit/planner/preview.test.ts guards both directions).
 */
export default function GrainStoragePage() {
  if (grainPlannerRouteMode(releaseFlags.grainPlannerOnZernoskhovyshcha) === 'planner') return <GrainComplexPage />;
  return <DirectionPage config={getDirectionPage('zernoskhovyshcha')} />;
}
