# RUBIKON BUILD — UI System v1

Practical rules for the CSS in `app/globals.css`, written down so the next feature (Signature
Configurator included) doesn't have to rediscover them from scratch. Not a design-token library,
not a component framework — this documents the system that already exists in the code, plus the
small set of fixes landed alongside this doc (see `chore/ui-system-v1`).

Source of truth for the audit that produced this: the "UI System Audit" artifact/read-only pass
that preceded this branch. This file is the durable, practical residue of that audit — the audit
itself was a point-in-time report, this is meant to stay current.

## 1. Breakpoint principle

Breakpoints correspond to a real, observable layout transition — never a device label ("tablet",
"phone") picked in the abstract. Current width tiers, each with a reason:

| Range | What changes there |
|---|---|
| ≤380px | Smallest-phone micro-adjustments (brand mark, footer contact stack) |
| ≤520px | `.hero-actions` drops to 1 column |
| ≤600px | `.person-photo` aspect changes |
| ≤760px | The mobile tier — most of the file's responsive rules live here |
| ≤960px | Footer's tablet 3-column composition starts |
| ≤1000px | Desktop header switches to the mobile hamburger menu (its own, deliberately
  different threshold from 960 — see the comment above `@media (max-width:960px)` in
  `globals.css`) |
| ≤1180px | Compact-but-still-full desktop header (smaller brand mark, tighter nav gaps);
  `.contact-grid` single-column |
| >1180px | Full desktop |

Plus a **separate, orthogonal height axis** (`max-height:700/820/900px`) for laptop-height
compaction of the hero and contact sections — this is not a device tier, it's "is there enough
vertical room," and can combine with any width tier.

**Before adding a new breakpoint:** check whether an existing one already marks the transition you
need. Before merging two that look similar, diff their actual declarations — don't merge on the
number alone (two blocks with nearby numbers can be answering genuinely different questions; see
the 960/1000 case above, kept deliberately separate).

**Not the layout system:** `app/hooks/useViewportVariant.ts` (`phone` ≤600 / `tablet` 601–1100px
*and* portrait / else `desktop`) exists only to pick which hero video file loads
(`HomeHeroVideo`, `AboutHeroVideo`) — an orientation-aware media decision, not a CSS breakpoint.
Don't extend it to gate layout, and don't expect it to match the width tiers above.

## 2. Hero grammar

One shared skeleton, deliberately different content per page:

```
media layer → overlay gradient → engineering-grid texture → breadcrumb (inner pages only)
→ eyebrow (inner pages only) → H1 (text-wrap:balance, no forced line-break, no trailing period)
→ optional lead paragraph → CTA row (1–2 actions) → optional page-specific extra
```

Known, intentional variants — don't "fix" these into matching each other:
- **Home** (`.hero`): cinematic, 2 CTAs (primary button + text-link), the only hero with a
  persistent quick-contact card. **Deliberately has no eyebrow.** The eyebrow's job everywhere
  else is orientation — "you are within X part of the site" (`/napryamky`'s "Сфери компетенції",
  `/pro-nas`'s "Родинна справа", each direction's "Напрямок 0N"). Home has no parent context to
  orient within — it's the root. Adding one just to match the other three would be noise with no
  new information, not consistency. Confirmed as an intentional exception, not a gap — don't add
  eyebrow markup here even though every other hero has one.
- **`/napryamky`** (`.subhero.directions-subhero`): technical — crossfading still-image sequence,
  not video.
- **`/pro-nas`** (`.subhero.about-subhero`): story-driven — the only genuinely single-column hero.
- **Direction pages** (`.service-subhero`): utilitarian — breadcrumb + "Напрямок 0N" eyebrow, one
  CTA, hand-tuned per-direction photo focal points (`directionHeroImageManifest.ts`).

## 3. Section header

One canonical component: `SectionHeader` (`app/components/SiteChrome.tsx`) → `.section-header`.
Eyebrow + heading + a single supporting-copy paragraph is the default and, as of this doc, the
*only* live variant — used on Services, Directions, Team, Process, EstimateBrief, and every
direction page's Overview/Process/Cost heading.

Don't add an image/diagram/metadata companion variant speculatively. If a future section has a
genuine content reason for one (a real diagram, not decoration), add it scoped to that section —
don't turn `SectionHeader` into a multi-variant component for a need that doesn't exist yet.

`DirectionFaq`'s heading is the one deliberate exception (no support paragraph — the FAQ items
themselves are the content). That's fine as a one-off; it's not evidence the default needs a
"no-copy" variant.

## 4. Grid rules

| Item count | Rule |
|---|---|
| 2 | Flex/left-aligned is fine — a short, intentionally left-aligned row (see `.related-grid`'s default). Don't force a full-width stretch. |
| 3 | Either a **fixed 3-column grid verified at every breakpoint it's used** (`.use-case-grid`, `.values-grid`), or an **explicit `data-count`/class variant** if it has to share a class family with a 4-item sibling (`.related-grid[data-count="3"]`). Never let a 3-item set silently inherit an even-column responsive override from a shared class — that produces the "2 then 1 alone" orphan bug this branch fixed twice. |
| 4 | `repeat(4,1fr)` → `repeat(2,1fr)` at ≤1050px → `1fr` at ≤760px. Already the consistent, correct pattern (`.detail-steps`, `.cost-grid`) — the canonical 4-item rule. |
| 5 | No fixed-column grid on the site currently has 5 items, but Signature Configurator's object templates likely will. **Never feed 5 items into a 4-column grid.** Decide explicitly: `repeat(5,1fr)` with a real tablet fallback, or a deliberate asymmetric composition — per instance, not by accident. |

When reusing a card-family class across a different item count (like `.values-grid` reusing
`.detail-grid`'s bordered-card look), use `minmax(0, 1fr)` rather than bare `1fr` for equal-width
columns — bare `1fr` has an implicit `minmax(auto,1fr)` and will grow unevenly around whichever
card has the widest content.

## 5. CTA / link / arrow

One glyph, `↗`, always `aria-hidden`, always paired with a text label. Three positioning
mechanics, each tied to a context — pick the one that matches, don't invent a fourth:

- **Inline-trailing** — `.button`, `.text-link`, `.section-link`: arrow in-flow, part of an
  `inline-flex` group with the label, spaced via `gap`.
- **Circular badge** — `.direction-arrow` on the homepage's dark image cards: a separate bordered
  circle, absolutely positioned, fills with the accent color on hover.
- **Corner mark** — `.related-card > span`, `.route-service > b`: plain accent-colored glyph,
  grid-positioned or right-aligned, no border.

**Adjacent CTAs must agree on geometry.** If two CTA boxes sit next to or stacked on each other
(like `.hero-actions`'s button + text-link pair), their arrows must use the *same* mechanic —
mixing in-flow and pinned-absolute in the same row/stack is what produced the mobile hero arrow
bug this branch fixed. When adding a second CTA next to an existing one, copy its arrow mechanic,
not just its visual style.

## 6. Motion

- **Micro** (hover/focus color, background, border-color, small icon transforms): `var(--duration-fast)`
  (200ms) + `ease`. This is the dominant, already-consistent interaction speed sitewide.
- **Scene/media** (image zoom on card hover, promise-visual hover): keep purpose-specific
  durations (currently `.45s`/`.65s`/`1s` depending on the element) — these are intentionally
  varied, not drift. Use `var(--ease-premium)` for the curve if it's the same
  `cubic-bezier(.2,.7,.1,1)` the rest of the site's scene transforms use.
- **A ~250ms family exists too** (nav underline sweep, bordered-card hover, chevron rotate) that
  doesn't cleanly map to either `--duration-fast` (200ms) or `--duration-medium` (360ms) — left as
  a literal on purpose rather than forced into an ill-fitting token. If a genuine 360ms use case
  shows up, that's when `--duration-medium` gets its first real consumer; don't invent one just to
  use the token.
- **No sitewide scroll-reveal.** The only scroll-linked motion is the existing desktop-only Lenis
  smooth scroll and the hero/direction image crossfades — both already shipped, both already
  respect `prefers-reduced-motion`. Don't add a new scroll-triggered-reveal pattern without a
  specific reason; it's an explicit non-goal, not an oversight.
- `@media (prefers-reduced-motion: reduce)` is global and already correct (zeroes all
  animation/transition durations, forces `scroll-behavior:auto`). Any new JS-driven motion (a
  `setTimeout` stagger, for instance) needs its **own** JS-level reduced-motion check — the global
  CSS rule only catches CSS transitions/animations, not JS timers. This is the specific trap
  flagged for the Signature Configurator's build-up animation.

## 7. Footer

Desktop (4 content-sized columns, `justify-content:space-between`), tablet (≤960px: 3 columns —
brand full-width row, nav/directions/contact below) and mobile (≤760px: brand full-width, nav +
directions side-by-side, contact stack) are each a small, self-contained grid. The tablet tier's
`.footer-grid > .brand-link` must span the full width (`grid-column: 1 / -1`), not just column 1 —
that was the actual bug this branch fixed; the mobile tier already did this correctly and was the
reference for the fix.

`.footer-nav`'s 2-up mobile layout is calibrated for exactly 4 `primaryNavigation` items (2 tidy
rows). **Adding or removing a primary nav item requires re-checking that grid** — 5 items in a
2-column layout produces the same "orphan" pattern documented in §4 above, it doesn't fix itself.
`.footer-directions`'s single-column layout has no such assumption (safe at any count).

## 8. Responsive media

Don't touch the `ResponsiveImage`/`responsiveImageManifest.ts` system without a strong reason —
it's a deliberate, already-documented workaround for `next/image` optimization being a no-op on
this Cloudflare deployment (see the component's own header comment and the earlier tech audit).
Direction hero images already have real per-photo focal-point art direction
(`directionHeroImageManifest.ts`'s `focalPosition`/`mobileFocalPosition`) — reuse that pattern for
any new hero image rather than a single generic `object-position`.

## Accessibility (already in place, keep it that way)

Global `:focus-visible` ring (3px outline, 2px box-shadow gap) on every interactive element;
`--control-min-height: 44px` for touch targets (spot-checked on form choice inputs and messenger
links); the single reduced-motion block above; a `forced-colors:active` block that hides
decorative-only grid textures. New interactive elements should inherit these automatically through
the existing base selectors — check they do before adding element-specific overrides.
