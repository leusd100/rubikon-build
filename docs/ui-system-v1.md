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
(`HomeV2HeroMedia`, `AboutHeroVideo`) — an orientation-aware media decision, not a CSS breakpoint.
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

**The arrow link (W3-06, PDO-56).** Every «words + arrow» way on that is not a button or a card is one
`.link-arrow` (`globals.css`): the action label (Manrope 800, 13 px, .06em, capitals), a 44 px target with
its words and a 1 px `--color-accent` rule at its foot, the arrow in `--color-accent-strong`. Hover and
keyboard focus change its colour — to `--color-accent-strong`, or to `--link-hover-ink` where the link
already rests in copper (`.faq-ask-write` → `--color-text`, `.angary-route-brief-action` on graphite →
`--color-dark-text`) — and nudge the arrow the way its span's `data-arrow` says (`up-right` 3 / −3 px,
`down`, `up`, `right` 3 px). Under reduced motion the arrow stays and the colour is the only answer, so
every arrow link's hover and focus colour differs from its rest colour (`links-buttons-focus.spec.ts`).
The page's class (`.section-link`, `.text-link`, `.faq-ask-write`, …) keeps only its place and, where the
link is quieter or louder than its text, its ink through `--link-ink`. `display` is in `:where()`, so a rule
that hides one copy of a link always wins. A one-line link is as wide as its words: in a column that
stretches its children it takes `align-self: flex-start` (or no `flex-grow`), or its rule runs across the
column. A link stretched over its card (`.gs-card`: its `::after` covers the card) takes no press transform
(`transform: none` on `:active`) — a transform would make the link the containing block of that `::after`
and the card would stop taking the press. In a row centred on a button or a number the link takes
`margin-top: -10px`, so its words meet theirs on one line; after a block's content `.section-link` takes
`calc(var(--rhythm-cta) - 16px)`, so its words and rule stay where the 29 px link had them. A phone
number (`.faq-ask-call`, `.angary-stamp-phone`) is not an arrow link.

**Adjacent CTAs must agree on geometry.** If two CTA boxes sit next to or stacked on each other
(like `.hero-actions`'s button + text-link pair), their arrows must use the *same* mechanic —
mixing in-flow and pinned-absolute in the same row/stack is what produced the mobile hero arrow
bug this branch fixed. When adding a second CTA next to an existing one, copy its arrow mechanic,
not just its visual style.

## 6. Motion v1

**The site scrolls into life.** «Сайт має появу під час скролу — п'ять жестів, один раз, перший екран не ховається
(рішення власника 26.10; скасовує попереднє правило "No sitewide scroll-reveal")». The earlier rule of this section
(«No sitewide scroll-reveal … an explicit non-goal») is withdrawn.

Motion is one system, built in CSS on tokens, with no motion library (the owner's decision, 26.10; the full design is
`docs/design/2026-10-26-motion-v1-design.md`, PR #253). It lands in waves, and each part of this section says where it
stands:

- **In the code (M1-1).** The tokens of 6.1 and 6.2, the choreography blocks of 6.6 and the guard of 6.7. Every number of
  time and every curve that was written out in a `transition*` / `animation*` declaration now reads a token or its file's
  choreography variable, with the **value unchanged** — the computed `transition-*` / `animation-*` of every element of
  the nine public pages, at 390 and 1440 px, are the same before and after (`scripts/motion/motion-diff.mjs`,
  `scripts/motion/computed-motion.mjs`).
- **Next (M1-2 … M1-4).** The pace by roles (the reveals of 360 / 420 ms → `--motion-enter`, the keyword `ease` on colour →
  `--ease-standard`, the literal curves → the table of 6.2, the HOME cards no longer lift), Lenis at rest (rule 8), one
  rule for the auto-shows (rule 7).
- **Then (M2, M3).** The five gestures of 6.3 and the controller of 6.5, the three signature moments.

### 6.1 Duration and distance tokens

`app/globals.css` `:root`; the phone value of `--motion-rise` is in its `@media (max-width: 760px)` `:root` block.

| Role | Token | Value | Where |
|---|---|---|---|
| Response | `--motion-micro` | 200 ms | hover, focus, press, colour |
| Interface | `--motion-ui` | 360 ms | menus, FAQ, switches, panels |
| Reveal | `--motion-enter` | 700 ms | blocks, headings, cards, leads |
| Pen | `--motion-draw` | 900 ms | the lines of a drawing, the photo wipe, the copper rule |
| Long pen | `--motion-draw-long` | 1400 ms | large drawings, the camera of the tours, the hero media settling |
| Media | `--motion-media-fade` | 800 ms | crossfades of photos and video |
| Group step | `--motion-stagger` | 80 ms | the delay between the items of a group, never more than 4 |
| Distance | `--motion-rise` | 16 px; 10 px up to 760 px | the lift of a reveal |

`--duration-fast` (= `--motion-micro`) and `--duration-medium` (= `--motion-ui`) stay as aliases, so nothing that reads
them breaks. `--motion-reveal` (420 ms) had no use and is gone. The pages' own variables keep their values for now: in
M1-2 only the three `--m-reveal` (`about.css`, `delivery.css`, `direction-template.css`) and `--region-reveal` move onto
`--motion-enter`; `--m-draw` (the pen: 900 ms on /yak, 1100 ms on the direction pages) and the rest of `--region-*` are
decided in M1-2, not moved by default.

### 6.2 Curves

| Token | Value | Role | Literals that move onto it (M1-2) |
|---|---|---|---|
| `--ease-premium` | `cubic-bezier(.2, .7, .1, 1)` | reveals, response, a camera that «arrives» | `(.3,.7,.2,1)` ×12, `(.2,.7,.2,1)` ×1, `(.2,.8,.25,1)` ×1, `(.3,.6,.3,1)` ×1 |
| `--ease-plot` | `cubic-bezier(.55, 0, .25, 1)` | an even pen, the wipe, the camera's move between steps | `(.45,0,.2,1)` ×6, `(.65,0,.25,1)` ×2 |
| `--ease-standard` | `cubic-bezier(.4, 0, .2, 1)` | crossfades, state changes, colour | the keyword `ease` on colour, background and border transitions |
| `--ease-signature` | `cubic-bezier(.3, 1.5, .5, 1)` | a slight overshoot: the signature moments (M3) and the three existing «clicks» of a mark | `(.3,1.5,.5,1)` ×2, `(.3,1.6,.5,1)` ×1 (`catalog-drawing.css`, `resp-matrix.css`, `change-sheets.css`) |

`linear` stays where the motion is mechanical by meaning (the formats' march, a progress bar). `ease-out` / `ease-in-out`
become `--ease-premium` / `--ease-standard` by role. Until M1-2 each of the eight literal curves lives, with its value, in
the `--<prefix>-curve-*` variable of the file that uses it; M1-2 re-points those variables, one place per file.

### 6.3 The five gestures

All of them animate `transform`, `opacity` and `clip-path` only, run once per page view, and end in the look of the page
without motion. They arrive with M2-1; the table is the contract.

| Gesture | `data-motion` | Start → end | Time · curve |
|---|---|---|---|
| Reveal | `rise` | `opacity: 0; translateY(var(--motion-rise))` → `1; none` | enter · premium |
| Reveal as a group | `rise-group` | the same for the first 4 direct children, each delayed by `i × --motion-stagger`; with more than 4 children the whole container reveals as one `rise` | enter · premium |
| Heading mask | `mask` | `clip-path: inset(-.25em -.25em 100% -.25em); translateY(100%)` → `inset(-.25em); none` — the text rises from under its own bottom edge as one block, never split into lines; the negative inset keeps «Й», «Ї» and descenders from being cut | enter · premium |
| Photo wipe | `wipe` | the box: `clip-path: inset(0 100% 0 0)` → `inset(0)`; its content (`img`, `picture`, `video`, `svg`): `scale(1.06)` → `none` | draw · plot (box), draw-long · premium (content) |
| Copper rule | `rule` | `transform: scaleX(0)`, `transform-origin: left` → `none` | draw · plot |
| Response | — (CSS `:hover`, `:focus-visible`, `:active`) | border colour → copper; the arrow shifts 3 px (`globals.css`, `.link-arrow`); no card lift | micro · premium |

### 6.4 Rules

1. **The first screen hides nothing.** A block of a new gesture that is in the window when the controller arms gets `on` at
   once, without animating (6.5). The existing drawings with no gesture value in `data-motion` behave as they do.
2. **Once.** A block is never hidden again when it leaves the window.
3. **Compositor properties only:** `transform`, `opacity`, `clip-path`. No `width`, `height`, `top`, `left` or `margin` in a
   transition.
4. **Groups:** no more than 4 items take a step; more than that is one block.
5. **Paragraphs** appear as a block, not by line or by word.
6. **Choreography** (the tours of the drawings, X-Ray, the 3D build-up, `frame-tour.css`): its internal times stay as they
   are, but live in the block of custom properties at the top of the component's file (6.6): `--<prefix>-at-*` for moments,
   `--<prefix>-for-*` for durations, a comment over each group saying what the times are for, the values word for word
   (a `calc()` from the tokens only where a later step makes the time a token's multiple). It is the one place a number is
   allowed.
7. **Auto-shows (W4-04, PDO-55):** one hook, `app/hooks/useFirstViewWalk.ts`, for `CostFactorsFigure`, `CapabilityFigure`,
   `ChangeSheets` and the formats walk of `FormatsScope`: it starts when at least 50 % of the block is in the window, runs
   once, a step of at least 2.2 s (OD-PX-34 (a)) or 3 s (OD-PX-34 (b), the owner decides in the M1 brief); any action of a
   person stops the show for good; it pauses off screen; one show plays at a time; no endless loops (`dfmt-march` is
   `1.4s linear 3`, not `infinite`). Pending (M1-4).
8. **Lenis at rest (W4-02, PDO-95 only):** `autoRaf: false` and an own rAF loop only while moving; `wake()` on `wheel`, on an
   anchor click and after `scrollTo`; before the first frame after a rest `lenis.time = t − 1000/60`; `lerp .18`, the anchors
   and `stopInertiaOnNavigate` unchanged. The keyboard part of X-Ray (PDO-37) is not in it. Pending (M1-3).
9. **Reduced motion:** the end state at once. The sitewide `@media (prefers-reduced-motion: reduce)` block in
   `globals.css` (it sets every animation and transition to `.01ms !important` and `scroll-behavior: auto`) is already
   correct and does not change. It catches CSS only: any JS-driven motion (a `setTimeout` stagger, a timer-driven tour)
   needs its **own** check, `matchMedia('(prefers-reduced-motion: reduce)')`. This is the specific trap flagged for the
   Signature Configurator's build-up animation.

### 6.5 Mechanism (M2-1)

- **One controller, `ProcessMotion`** (`app/components/process/ProcessMotion.tsx`). Without JS the markup is complete; it
  sets `data-motion-ready` (`arming`, then `on` two frames later) on the page's root and switches each `[data-motion]` to
  `data-motion-state="on"` once, when the block is clearly in the window (30 % of it, or a third of the window's height).
  Under `reduce` it switches nothing on. The attribute `data-motion` gets the gesture as its value — `rise`,
  `rise-group`, `mask`, `wipe`, `rule`; an empty value keeps the behaviour that exists, so the 24 existing places do not
  change.
- **The first screen:** before `data-motion-ready="arming"` the controller measures `getBoundingClientRect()` of every block
  with a new gesture and puts `on` on those that cross the window. This also covers an anchor jump, «Back» to the middle of
  a page and a scroll restored before hydration. A scroll restored late (after the controller is on) simply reveals the
  blocks of the new window by the usual rule; nothing stays hidden.
- **Keyboard:** `focusin` inside a block that is not yet `on` puts `on` at once, so focus never rests on something
  invisible. **Find in page:** the browser scrolls to the match, the observer fires, the block is `on`.
- **Print (part of W4-05):** `app/components/PrintComplete.tsx` beside `SmoothScroll` in `layout.tsx`: on `beforeprint`
  every `[data-motion]` becomes `on`; `@media print` has no transitions.
- **CSS of the gestures:** a new `app/motion.css`, imported in `app/layout.tsx`, about 2 KB, its rules only under
  `:where([data-motion-ready])`: without JS and under `reduce` nothing is hidden. No new JS: the same IntersectionObserver.

### 6.6 A number: a token, or the file's choreography

A time, a delay or a curve in a `transition*` / `animation*` declaration is never a literal. It is one of two things.

**A token** (6.1, 6.2), only where the **value and the animated property** both match the table. For `animation*` the animated
property is the properties of its `@keyframes`.

| Value | Becomes | Only when the animated property is… |
|---|---|---|
| 200 ms / .2 s | `var(--motion-micro)` | `color`, `background-color`, `border-color`, `outline-color`, `text-decoration-color`, `fill`, `stroke`, `box-shadow` — or the rule has `:hover`, `:focus`, `:focus-visible` or `:active` in its selector |
| 800 ms / .8 s | `var(--motion-media-fade)` | `opacity` / `filter` on a selector with the word `hero`, `media`, `image`, `img`, `video`, `poster`, `photo` or `picture` |
| 900 ms / .9 s | `var(--motion-draw)` | `stroke-dashoffset`, `clip-path` |
| 1400 ms / 1.4 s | `var(--motion-draw-long)` | `stroke-dashoffset`, `clip-path` |
| anything else | the file's choreography variable | — |

The same number on another property (a `.2s` on `transform`, a `.9s` on `opacity`) is **not** the token: it is the file's own
time, and stays a choreography variable until a visible step (M1-2) decides it.

**Choreography** — a block at the top of the file (after the header comment), in a top-level `:root` (`globals.css` has one `:root` only, so its `--site-*` variables sit at the end of it, after the tokens):

```css
/* Choreography (Motion v1, ui-system §6): this file's own times and curves */
:root {
  /* a format switch: the words slide to their new columns row by row, their tint follows the format */
  --rm-for-slide: 640ms;                         /* a duration */
  --rm-curve-slide: cubic-bezier(.3, .7, .2, 1); /* a curve no token carries yet (until M1-2) */
  --rm-at-row-step: 22ms;                        /* the step of a cascade: calc(var(--i, 0) * var(--rm-at-row-step)) */
}
```

- Names are `--<prefix>-for-<what>` (durations), `--<prefix>-at-<what>` (delays, and the steps of cascades) and
  `--<prefix>-curve-<what>` (curves). Delays and steps are always `--<prefix>-at-*`, whatever their value (a delay is a
  moment of the file's own timeline, not a role).
- The prefix is the file's own — short, and used by no other file. One name is one value, declared once, read only in its file.
- Values move over word for word (`.3s` stays `.3s`, `300ms` stays `300ms`), so a reverse substitution of the variables gives
  back the file as it was.
- The pages' own local variables (`--m-reveal`, `--m-draw`, `--m-ease`, `--region-*`) are not touched here.
- Not in this rule: an intermediate custom property of any other name, and the inline styles of TSX.

### 6.7 The guard

`tests/unit/motion-tokens.test.ts` scans every `app/**/*.css` and fails when:

- a `transition*` or `animation*` declaration holds a time literal or a `cubic-bezier(`;
- a Motion v1 token is missing, has another value, or is declared twice or outside `globals.css` `:root` (the one other
  declaration allowed is the phone `--motion-rise`); any other `--motion-*`, `--ease-*` or `--duration-*` declaration;
  `--motion-reveal` comes back;
- a motion variable cannot be resolved in its own file (a token may come from `globals.css` or `theme.css`);
- a choreography variable is declared twice in a file, declared in two files, declared outside a top-level `:root`, or read
  with a fallback (`var(--rm-for-row, 300ms)` would hide a missing declaration behind a number).

`scripts/motion/motion-diff.mjs [--base <ref>] --expect-none` compares the resolved and normalised declarations of a tree with
a base ref, so a refactor that moves values proves it moved none; `scripts/motion/computed-motion.mjs --base <url> --head <url>`
compares what the browser computes for every element of the nine public pages (390 and 1440 px) in two builds.

### 6.8 Out of scope

A new motion library; parallax; cursor effects; animating text by line or by word; scroll-scrubbed animation; the phone menu;
«the drawing becomes the building». The choreography of the tours, X-Ray and the 3D build-up is not changed: only its numbers
move into the blocks of 6.6.

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

## 9. Role tokens (Wave 03, W3-01)

`app/globals.css` `:root` (phones in its `@media (max-width: 760px)` `:root` block) names the roles the
Wave 03 steps build on. W3-01 declared them with the values already in use, so nothing moved; the
visible steps change the values in one place. A rule takes a token only where its value is that
token's today; other literals move onto a token when their file changes for a visible step.
`tests/unit/design-tokens.test.ts` keeps the names resolvable and the type roles in `rem`.

| Family | Tokens | Who changes the values |
|---|---|---|
| Type (rem) | `--type-display-home`, `--type-h1`, `--type-h2`, `--type-h2-compact`, `--type-h2-minor`, `--type-h3`, `--hero-lead` | W3-02 (T4 scale) |
| Labels | `--type-label-ui-*`, `--type-action-*`, `--type-label-tech-*` (`-weight`, `-size`, `-track` each; letter-spacing has no place in `font`) | W3-02 |
| Rhythm | `--rhythm-label`, `--rhythm-lead`, `--rhythm-header`, `--rhythm-cta`; `--section-space(-compact)` | W3-03 |
| Spacing | `--space-1` … `--space-10` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px; `--card-pad`, `--card-gap` | W3-03, then file by file |
| Buttons | `--button-h-l` 56 px (page buttons, the conversation's call), `--button-h-m` 48 px (a button in a sheet or a tool: the grain sheet, the configurator's summary, HOME's brief); the 50 / 46 px of short laptop windows stay as compact modes | W3-06 |
| Header | `--header-h` 101 px (the fixed header from 761 px) | PDO-98's next step (short windows, tablets) |
| Motion | `--motion-micro`, `--motion-ui`, `--motion-enter`, `--motion-draw`, `--motion-draw-long`, `--motion-media-fade`, `--motion-stagger`, `--motion-rise` (16 px, 10 px on a phone); `--ease-premium`, `--ease-plot`, `--ease-standard`, `--ease-signature`; aliases `--duration-fast`, `--duration-medium` — see §6 | M1-2 (Motion v1: the pace by roles; the pages' local `--m-*` and the choreography curves move onto them) |
| Colour (theme.css) | `--color-load`, `--color-wind` — the loads on a drawing, one pair for both modes | — |

The type roles are in `rem`: at the default 16 px root the px are the same as before, and a larger
browser text size now reaches them (the header and the other px rules stay as they were).

**W3-02 values (T4, 25.10).** Three H2 levels and one display H3 per width:

| Role | Value | 1440 / 768 / 390 | Takes it |
|---|---|---|---|
| `--type-h2` | `clamp(2.375rem, 4.5vw, 4.5rem)` | 64.8 / 38 / 28.86 | section headers, FAQ, /angary sections |
| `--type-h2-compact` | `clamp(2.25rem, 3.6vw, 3.25rem)`; phone `var(--type-h2)` | 51.84 / 36 / 28.86 | a title beside a figure or a form: direction node, grain band, /pro-nas story, /angary configurator (but see the minor level), the inquiry block |
| `--type-h2-minor` | `clamp(1.75rem, 2.5vw, 2.25rem)`; phone `clamp(1.625rem, 7vw, 1.75rem)` | 36 / 28 / 27.3 | «Пов’язані напрямки», /angary's real object; the /angary configurator's title on a short laptop window (from 1024 px wide, up to 760 px tall), where it gives its room to the step |
| `--type-h3` (Fixel) | `clamp(1.5rem, 1.95vw, 1.75rem)`; phone `1.5rem` | 28 / 24 / 24 | HOME evidence, direction entries, /napryamky formats, the /yak formats switch from 1051 px |

Labels, three roles (each rule keeps its own family and line-height):

| Role | Weight / size / tracking | Family | Takes it |
|---|---|---|---|
| UI | 800 / 12 px / .10em | Manrope | eyebrows, crumbs, kickers (conversation, form, HOME, configurator), the form's group titles, the footer's group titles, «Зателефонувати» over a number, table and builder group titles, a person's role over the name |
| action | 800 / 13 px / .06em | Manrope | `.button`, `.text-link`, `.section-link`, the form toggle, field labels and legends, reply-method choices, entry and principle links |
| technical | 700 / 12 px / .08em | IBM Plex Sans Condensed | «Ілюстрація» stamps (box reserved at 8.75em against the late swap), «Ви / Ми», the process key, a step's result, drawing captions, sheet heads, the /angary stamp |

The floor (PDO-16): no text outside a drawing under 12 px; actions and field labels 13 px; inside a
drawing-like HTML sheet (stamps, the /yak change sheet, HOME's direction strips, the configurator's
section callout) 11 px. Form fields are 16 px at every width. H1–H3 glue the short words of set (b)
and leads those of set (a) at render (`app/lib/typography.ts`: `keepHeadingWords`, `keepShortWords`),
never in metadata, JSON-LD or aria-labels.

**W3-03 values (rhythm, 25.10, OD-PX-17 A).** A section's entry and its spaces, from 761 px / phone:

| Role | Value | Takes it |
|---|---|---|
| `--rhythm-label` | 20 / 16 px | label → H2 in a section header (`.section-header-copy .eyebrow`) |
| `--rhythm-lead` | 24 / 20 px | H2 → lead in a section header (its `gap`, and its space over its rule), the direction node's and /angary's leads |
| `--rhythm-header` | 40 / 32 px | section header → its content (`.section-header`, `.page-heading`, the /pro-nas team) |
| `--section-space` | `clamp(92px, 8vw, 128px)` / **72 px** | every section; no page sets its own on a phone. Never under 72 (KEEP 38: 64 is not offered) |
| `--section-space-compact` | `clamp(72px, 6vw, 96px)` / **56 px** | the seam of two neighbours of one tone (cost → FAQ on metal, concrete and roofing), /angary's closing «Пов’язані» and every grain band from 761 px (its height budget); on a phone the grain bands keep 72 on both sides of every seam |

- **One rule.** When the content under a section header opens with its own top edge (the cost list,
  the grain complex sheet, the /pro-nas ledger and principles, the /yak formats and responsibility
  switch, HOME's directions), the header loses its rule and the space above it
  (`.section-header:has(+ :is(…))`). Content with that edge only up to a width is named with its
  width: the grain situations up to 760 px (card frames; wider they are open columns) and the /yak
  cost factors up to 1050 px (the drawing's frame; wider the columns open with its caption and the
  list). Without `:has()` the header keeps its rule (HOME's phone directions drop it in that case too,
  as before: `@supports not selector(:has(*))`). A list ruled only between its rows (the /napryamky
  catalogue) keeps the header's rule as its top. Content that opens with a label or an open column
  keeps it as well.
- **The tail of a direction page.** On metal, concrete and roofing the FAQ leads straight into the form;
  «Пов’язані напрямки» close the page after it with the compact space (`related.placement:
  'after-inquiry'`, as /angary).
- **Not a section seam (documented exceptions).** The /angary configurator's phone padding, 48 / 82 px
  (`angary-editorial.css`): a composed join, not a section's space — the stage opens right under the
  hero, and under it the real object follows with no top padding and its own rule, so the 82 is the
  configurator's bottom margin to that rule. The /pro-nas team's bottom (64 px and the stories' own
  64) is the same kind of join. Neither moves onto `--section-space`.
- Not on the tokens yet: the other eyebrows (heroes, FAQ, sticky and editorial headings) keep 24 px;
  `--rhythm-cta` keeps 34 px; the laptop conversation keeps its 16 / 16.

## Accessibility (already in place, keep it that way)

Global `:focus-visible` ring (3px outline at 4px, 2px box-shadow gap) on every interactive element,
and one other form of it: the inner ring (3px at -4px) for what fills its row or frame — a cell, a
segment, a tab, a full-width row or a fixed full-width bar (W3-06, PDO-88); form fields show a copper halo
instead (W3-07). A ring next to an `overflow: hidden` edge takes the inner form rather than being cut; a frame
with positioned children takes the outer one, as they paint over an inner ring (the planner's tab panel).
lucide icons share
one stroke, `svg.lucide { stroke-width: 1.75 }` (PDO-89); a crop lucide lacks is drawn on its 24 grid
(`CornCobIcon`). The tour controls (`.motion-control`) and the step rows (`.step-option`) are shared
rules in `globals.css` (PDO-99);
`--control-min-height: 44px` for touch targets (spot-checked on form choice inputs and messenger
links); the single reduced-motion block above; a `forced-colors:active` block that hides
decorative-only grid textures. New interactive elements should inherit these automatically through
the existing base selectors — check they do before adding element-specific overrides.
