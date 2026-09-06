# Approved Frame identity — 6 September 2026

Replaces the previous engineering-node mark with the user-approved concept 01, Frame.
The horizontal lockup and lettering are outlined SVG, with transparent PNG exports and
separate monochrome and light-background versions. This is a clean vector interpretation
of the approved image, without generated glow or texture.

The shared header/footer use one 1.7 KB SVG (no added runtime dependency, font or JavaScript).
The brand link retains its accessible name and home destination. Explicit aspect ratio
reserves the logo's layout before loading. Responsive widths are 256/226/210/188 px.
The internal noindex /logo-variants page now shows the approved asset variants rather than
claiming the former concept is selected.

SVG and ICO favicon, legacy PNG sizes, Apple touch icon, normal and maskable app icons,
manifest and structured organization logo are updated. Existing icon URLs have a version
query in metadata/manifest; the implicit app/icon.svg is also replaced. Existing social
preview artwork is preserved.

Validation:
- main 77d3942 has exactly the same source tree as live Sites version 130, source 77c99bd.
- ESLint and TypeScript pass.
- 427 unit tests pass.
- 36 desktop/mobile route smoke tests pass; 6 platform-specific tests skip as designed.
- Production build passes; existing lazy Three chunk warning remains.
- Browser inspection at 320, 390, 768, 1024 and 1440 px: logo fits, no page overflow or
  logo/menu overlap; header and footer display the same asset.
- Reviewed native favicon sizes, light/dark variants and circular maskable presentation.

The reproducible asset generator is scripts/generate-brand-assets.mjs. Raster output uses
Sharp already present through Next's dependencies. No package or lockfile changes.
