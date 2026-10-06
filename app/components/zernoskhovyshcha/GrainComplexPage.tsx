import { grainPage } from '../../data/grainPage';
import { DirectionPage } from '../DirectionDetail';
import { DirectionEntry } from '../directions/DirectionEntry';
import { GrainComplexBand } from './GrainComplexBand';
import { GrainEditorialArchitecture } from './GrainEditorialArchitecture';

/**
 * /zernoskhovyshcha since 06.10: hero, the complex on a drawing (02), the situations people come with (03), the
 * building part as a drawing tour (04), the cost factors (05), the process (06), the FAQ, related directions and the
 * site's one #inquiry form. Content: app/data/grainPage.ts (complexDirection). The planner composition
 * (GrainPlannerPage) stays on the noindex /planner-preview.
 */
export function GrainComplexPage() {
  const config = grainPage.complexDirection;
  return (
    <DirectionPage
      config={config}
      signatureExperience={(
        <>
          <GrainComplexBand />
          {config.entry && <DirectionEntry entry={config.entry} />}
        </>
      )}
      editorialArchitecture={<GrainEditorialArchitecture config={config} />}
    />
  );
}
