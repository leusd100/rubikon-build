import { RegionMap } from './RegionMap';
import { company } from '../../data/company';
import { regionMap } from '../../data/regionMap';

// The main region, as one block shared by /pro-nas (closing its directions) and /napryamky: one copper line with the
// region on it, «Базуємося в Дніпрі» with the other-regions sentence, and the oblast's real outline (RegionMap,
// credited). Styles: app/components/about/region.css, imported by each page that shows it. It plays once inside a
// ProcessMotion root ([data-motion]); without motion everything stands complete.
export function RegionBlock({ className }: Readonly<{ className?: string }>) {
  return (
    <div className={`region-block${className ? ` ${className}` : ''}`} data-motion>
      <p className="region-bond"><span>Основний регіон — {company.serviceAreas[0]}</span></p>
      <div className="region-layout">
        <div className="region-copy">
          <p className="region-base">Базуємося в Дніпрі</p>
          <p className="region-note">{company.geographyBeyond}</p>
        </div>
        <figure className="region-figure">
          <RegionMap label={`Мапа: ${company.serviceAreas[0]}, позначено місто Дніпро`} />
          <figcaption>{regionMap.attribution}</figcaption>
        </figure>
      </div>
    </div>
  );
}
