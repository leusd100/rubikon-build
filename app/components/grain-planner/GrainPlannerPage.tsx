import { grainPage } from '../../data/grainPage';
import { grainPlannerPresentation } from '../../data/grainPlannerPresentation';
import { DirectionPage } from '../DirectionDetail';
import { AttachedBriefCta } from '../inquiry/AttachedBriefCta';
import { InquiryAttachmentProvider } from '../inquiry/InquiryAttachmentProvider';
import { GrainEditorialArchitecture } from '../zernoskhovyshcha/GrainEditorialArchitecture';
import { GrainApproachesOverview } from './GrainApproachesOverview';
import { GrainPlannerBand } from './GrainPlannerBand';
import { GrainPlannerProvider } from './GrainPlannerProvider';
import { GrainResultBand } from './GrainResultBand';

/**
 * The future /zernoskhovyshcha: hero (01), the planner (02) and its standalone result (03),
 * «Як RUBIKON реалізує» (04), the process after the brief (05), FAQ v2 (07), related directions
 * (08) and the site's one #inquiry form (09), which receives the brief through the shared
 * InquiryAttachmentProvider. Content: app/data/grainPage.ts. Rendered by /planner-preview, and
 * by /zernoskhovyshcha once releaseFlags.grainPlannerOnZernoskhovyshcha is on (Phase 5).
 * The page stylesheets (grain-planner.css, grain-editorial.css) are imported by those routes.
 */
export function GrainPlannerPage() {
  const config = grainPage.direction;

  return (
    <InquiryAttachmentProvider>
      <GrainPlannerProvider>
        <DirectionPage
          config={config}
          signatureExperience={(
            <>
              <GrainPlannerBand />
              <GrainResultBand generic={<GrainApproachesOverview />} />
            </>
          )}
          editorialArchitecture={<GrainEditorialArchitecture config={config} />}
        />
        {grainPlannerPresentation.handoff.mobileCta && (
          <AttachedBriefCta gate="[data-planner-brief]" className="grain-handoff-cta" />
        )}
      </GrainPlannerProvider>
    </InquiryAttachmentProvider>
  );
}
