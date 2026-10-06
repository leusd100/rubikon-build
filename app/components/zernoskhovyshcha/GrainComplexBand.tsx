import { grainPage } from '../../data/grainPage';
import { SectionHeader } from '../SiteChrome';
import { GrainComplexBuilder } from './GrainComplexBuilder';

/**
 * Band 02 of /zernoskhovyshcha since 06.10 (owner: «клієнт це заповнювати не буде… спростити і зробити дійсно вау
 * ефект»): the complex assembled on a drawing instead of the planner's five themes. The planner composition stays on
 * the noindex /planner-preview.
 */
export function GrainComplexBand() {
  const { eyebrow, title, supporting } = grainPage.complex;
  return (
    <section id="kompleks" className="page-section gc-band" aria-labelledby="grain-complex-title">
      <div className="shell">
        <SectionHeader className="page-heading" eyebrow={eyebrow} title={title} supporting={supporting} titleId="grain-complex-title" />
        <GrainComplexBuilder />
      </div>
    </section>
  );
}
