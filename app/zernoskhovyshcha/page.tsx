import { DirectionPage } from '../components/DirectionDetail';
import { GrainPlannerPage } from '../components/grain-planner/GrainPlannerPage';
import { releaseFlags } from '../data/releaseFlags';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import './grain-planner.css';
import './grain-editorial.css';

export const metadata = createDirectionMetadata('zernoskhovyshcha');

/**
 * The Grain Planner composition since Phase 5. With the flag off this page renders the previous
 * direction page again — the rollback path, kept until the cleanup PR — and the two stylesheets above
 * go with it (tests/unit/planner/preview.test.ts guards both directions).
 */
export default function GrainStoragePage() {
  if (releaseFlags.grainPlannerOnZernoskhovyshcha) return <GrainPlannerPage />;
  return <DirectionPage config={getDirectionPage('zernoskhovyshcha')} />;
}
