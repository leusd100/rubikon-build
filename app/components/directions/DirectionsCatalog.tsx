import type { DirectionId } from '../../data/directions';
import { CatalogDrawing } from './CatalogDrawing';

// /napryamky — the five directions as a catalogue of drawing sheets. Each row is the link to its page (the route
// list's markup, so the shared tests keep holding) and carries its own small sheet: a line scheme of what the
// direction physically is (CatalogDrawing) over a one-line title block, «Аркуш NN · Схема», with the kinds of work
// its page lists under the text (from 761 px).
// Until 05.10 a wide screen had a sticky preview with a generated illustration beside the rows, and the sheets were
// the phone's substitute for it; the owner asked to try the sheets everywhere. So the rows hold no image at any width,
// the page downloads none for this list, and the component needs no client code: a server component.
// Copy comes from the directions' own data. The key plan above the list (DirectionsKey, in the section's header)
// lights the part of the row pointed at.

export type CatalogItem = {
  id: DirectionId;
  number: string;
  href: string;
  title: string;
  routeText: string;
  kinds: readonly string[];
};

export function DirectionsCatalog({ items }: Readonly<{ items: readonly CatalogItem[] }>) {
  return (
    <div className="dcat">
      <div className="route-service-list dcat-list">
        {items.map((item) => (
          <a className="route-service" href={item.href} id={item.id} key={item.id}>
            {/* The row's own sheet — a scheme and its title block, no image; it plots in when it comes into view */}
            <span className="dcat-thumb" aria-hidden="true" data-motion>
              <CatalogDrawing id={item.id} />
              <span className="dcat-strip">
                <span>Аркуш {item.number}</span>
                <span>Схема</span>
              </span>
            </span>
            <span>{item.number}</span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.routeText}</p>
              {/* The kinds repeat the direction page's own list; hidden from the link's name so it stays short */}
              <ul className="dcat-kinds dcat-kinds-row" aria-hidden="true">
                {item.kinds.map((kind) => <li key={kind}>{kind}</li>)}
              </ul>
            </div>
            <b aria-hidden="true">↗</b>
          </a>
        ))}
      </div>
    </div>
  );
}
