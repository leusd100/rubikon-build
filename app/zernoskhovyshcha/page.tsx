import { DirectionPage } from '../components/DirectionDetail';
import { GrainPlannerPage } from '../components/grain-planner/GrainPlannerPage';
import { releaseFlags } from '../data/releaseFlags';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';

export const metadata = createDirectionMetadata('zernoskhovyshcha');

/**
 * With the flag off (Phase 4) this page renders exactly what it always has; the new composition is
 * reviewed on /planner-preview. Switching the flag on (Phase 5) also adds this route's
 * `import './grain-planner.css'` and `import './grain-editorial.css'` — kept out until then so the
 * live page ships no extra CSS (tests/unit/planner/preview.test.ts guards both directions).
 */
export default function GrainStoragePage() {
  if (releaseFlags.grainPlannerOnZernoskhovyshcha) return <GrainPlannerPage />;
  return <DirectionPage config={getDirectionPage('zernoskhovyshcha')} />;
}
