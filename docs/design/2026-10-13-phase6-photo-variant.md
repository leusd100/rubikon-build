# Phase 6 — photo variant for direction heroes

This is a local visual candidate for the five direction detail pages. The
previous drawing-overlay concept is preserved in commit `dfe7690`; this branch
shows a photo-led alternative. The generated scenes are **illustrations**, not
photographs of RUBIKON projects. The existing `Ілюстрація` stamp remains on
every hero.

## Source and output

- Edit targets: `public/media/direction-hero-source/{direction}.png`.
- Edited 1536 × 1024 PNGs: `design-assets/direction-hero-photo-variant/`.
- Responsive delivery files: `public/media-responsive/direction-hero-photo-variant-*.webp`, generated with `python3 scripts/generate-direction-hero-images.py --only direction-hero-photo-variant`.
- The generated PNGs are outside `public/` so the site serves only the smaller WebP variants.

## Prompt set

All five images were edited with the built-in ImageGen tool. Each original hero
was the edit target and composition reference. The shared direction was:

> Re-render this image as one continuous, believable editorial architectural
> photograph for a Ukrainian industrial construction website. Preserve the
> subject, broad perspective and charcoal/steel/copper mood. Keep enough
> quieter space for a white headline. Replace every collage inset, diagonal
> panel, technical drawing, number, icon, orange stripe and graphic texture
> with plausible continuation of the scene. No diagram, blueprint overlay,
> text, logo, watermark, people or impossible construction detail. Landscape
> composition near 3:2 for responsive cropping.

Direction-specific subjects and invariants:

| Direction | Subject kept in the render |
| --- | --- |
| Angary | Large exposed steel-frame warehouse under construction, long receding bays, low three-quarter view and warm light from the right. |
| Zernoskhovyshcha | Four galvanized grain silos with conical roofs, overhead conveyor gallery, service towers and site paving. |
| Metalokonstruktsii | Erected industrial steel frame with a coherent grid of columns, roof trusses, bolted joints and neatly stacked beams. |
| Betonni roboty | Industrial foundation and floor works with reinforced concrete columns, rebar, formwork and a partly poured slab. |
| Pokrivelni roboty | Continuous standing-seam metal roof with receding seams, modest roof vent and plausible railing. |

## Review focus

Judge the images in the page layout at desktop and phone widths. The photo
should stay legible behind the heading, show enough of the actual building
element, and avoid the visual noise of the prior composite artwork. If a
direction feels too theatrical or technically implausible, re-render that one
image while keeping the other four.
