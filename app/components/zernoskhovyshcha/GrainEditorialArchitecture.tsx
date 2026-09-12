import type { DirectionPageConfig } from '../../types/directionPage';
import { DirectionEditorial, DirectionProcess } from '../DirectionDetail';

/**
 * Bands 04–05 of the grain composition, through the site's own editorial system: «Як RUBIKON
 * реалізує» is the media-first DirectionEditorial with the work points, «Після брифу» is
 * DirectionProcess. Band 06 (real objects) joins here once grainPage.cases holds confirmed
 * objects; until then there is no band at all — no placeholders.
 */
export function GrainEditorialArchitecture({ config }: { config: DirectionPageConfig }) {
  return (
    <>
      <DirectionEditorial directionId={config.id} editorial={config.editorial} className="grain-implementation-band" />
      <DirectionProcess {...config.process} className="grain-process-band" />
    </>
  );
}
