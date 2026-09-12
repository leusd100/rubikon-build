# RUBIKON Brand Logo Integration — 12 September 2026

## Scope and starting point

The implementation branch starts at `3b3dc69808f983e3daac0921facda1bcf94cfe35`, the reviewed
HEAD of PR #89 (`feat/company-email`). The change is limited to brand assets, shared site chrome,
metadata, the internal logo review page, and brand-specific tests. Grain Planner and Hangar files
are unchanged.

## Inventory

- Header and footer use one shared `Brand` component in `app/components/SiteChrome.tsx`.
- The previous identity is stored as seven SVG/PNG pairs under `public/brand`.
- Platform artwork includes SVG and ICO favicons, 16/32/48 PNG favicons, Apple touch artwork,
  192/512 app icons, and a maskable 512 icon.
- Manifest, root metadata, and Organization structured data carry versioned icon URLs.
- `public/og.jpg` is the active Open Graph/Twitter image; `public/og.png` is retained as a lossless
  export.
- `/logo-variants` is an internal, noindex review/download surface.
- The general site screenshot suite has pre-existing baseline drift and is intentionally not a CI
  gate. Brand coverage therefore lives in its own focused visual suite.

## Asset architecture

`scripts/generate-brand-assets.mjs` is the single vector source of truth. It contains one outlined
R master shared by the horizontal lockup and platform icons, plus outlined RUBIKON/BUILD lettering.
There is no production font dependency and no AI-generated raster master.

New production exports:

- `rubikon-build-horizontal-dark.svg/.png` — header, footer, and dark surfaces;
- `rubikon-build-horizontal-light.svg/.png` — light surfaces;
- `rubikon-mark-dark.svg/.png` — compact mark on dark surfaces;
- `rubikon-mark-light.svg/.png` — compact mark on light surfaces;
- platform favicon/app-icon sizes generated from the same R master;
- refreshed `og.jpg` and `og.png`, preserving the approved hall image and existing subtitle.

The compact mark deliberately has no enclosing circle. Normal icons fill 74% of the canvas,
16 px uses a slightly larger 78% optical size, and the maskable icon stays inside a 58% safe zone.
OS/browser masks can therefore apply their own circle or rounded-square shape without shrinking R
twice.

All prior SVG/PNG assets remain in place during migration. New filenames prevent accidental
replacement by an unreviewed downstream consumer.

## Validation

- ESLint passes.
- Production build passes (the existing large-chunk warning remains).
- 723 unit tests pass, including five new asset-contract tests.
- 8 focused brand visual tests pass at 390, 1001, 1181, and 1440 px, plus footer, light/dark,
  compact-mark, and native favicon coverage.
- 24 PR #89 compatibility/overflow checks pass; 4 project-specific skips behave as designed.
- 36 desktop/mobile public-route smoke tests pass; 6 media-specific skips behave as designed.
- `tsc --noEmit` still reports the pre-existing SVG/HTMLElement `click()` typing issue in the
  unchanged `tests/e2e/grain-planner-stabilization.spec.ts:83`. It was not changed because Grain
  Planner is explicitly out of scope; the production build and all unit/e2e checks above pass.

No deployment or merge was performed.
