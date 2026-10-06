import type { DirectionPageConfig } from '../../types/directionPage';
import { DirectionCostSection, DirectionEditorial, DirectionProcess } from '../DirectionDetail';

/**
 * The grain compositions' bands after their signature, through the site's own editorial system: «Як RUBIKON
 * реалізує» is DirectionEditorial with the building part as a tour of one drawing (DirectionNode), then the cost
 * factors where the config has them (the complex page), then DirectionProcess. A real-objects band joins here once
 * grainPage.cases holds confirmed objects; until then there is no band at all — no placeholders.
 */
export function GrainEditorialArchitecture({ config }: { config: DirectionPageConfig }) {
  return (
    <>
      <DirectionEditorial directionId={config.id} editorial={config.editorial} className="grain-implementation-band" />
      {/* the cost factors, with their line glyphs (since 06.10; the planner composition has none) */}
      {config.cost && <DirectionCostSection {...config.cost} directionId={config.id} />}
      <DirectionProcess {...config.process} className="grain-process-band" />
    </>
  );
}
