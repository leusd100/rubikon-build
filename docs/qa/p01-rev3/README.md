# P01 rev 3 — public copy visual review

Production build reviewed at 375, 768 and 1440 px. Captures use the existing illustration assets; these are QA screenshots, not project proof. No new site media was added.

## Material blocks

| Width | Concrete and grain introduction | Grain process and hangar | Roofing and steel |
|---|---|---|---|
| 375 px | [Screenshots](services-375-1.jpg) | [Screenshots](services-375-2.jpg) | [Screenshots](services-375-3.jpg) |
| 768 px | [Screenshots](services-768-1.jpg) | [Screenshots](services-768-2.jpg) | [Screenshots](services-768-3.jpg) |
| 1440 px | [Screenshots](services-1440-1.jpg) | [Screenshots](services-1440-2.jpg) | [Screenshots](services-1440-3.jpg) |

HOME and delivery screenshots are the reviewed test baselines:

- [HOME responsibility — phone](../../../tests/e2e/visual.spec.ts-snapshots/homepage-formats-mobile-375-linux.png), [tablet](../../../tests/e2e/visual.spec.ts-snapshots/homepage-formats-tablet-768-linux.png), [desktop](../../../tests/e2e/visual.spec.ts-snapshots/homepage-formats-desktop-1440-linux.png).
- [First conversation — phone](../../../tests/e2e/visual.spec.ts-snapshots/homepage-first-conversation-mobile-375-linux.png), [tablet](../../../tests/e2e/visual.spec.ts-snapshots/homepage-first-conversation-tablet-768-linux.png).
- [Delivery matrix — phone](../../../tests/e2e/visual.spec.ts-snapshots/delivery-responsibility-mobile-375-linux.png), [tablet](../../../tests/e2e/visual.spec.ts-snapshots/delivery-responsibility-tablet-768-linux.png), [desktop](../../../tests/e2e/visual.spec.ts-snapshots/delivery-responsibility-desktop-1440-linux.png).
- [Own work / specialist boundaries](../../../tests/e2e/visual.spec.ts-snapshots/delivery-who-desktop-1440-linux.png).

## Review findings

- All eight affected public routes checked for overflow at phone, tablet and desktop widths. No horizontal overflow.
- Existing HOME six-section sequence, call-first actions, empty proof slot and direction title wrapping retained.
- Steel process heading shortened after a tablet capture split the long word «металоконструкціями». The final heading fits the existing columns.
- Expected larger blocks: HOME responsibility columns, delivery matrix and capability list. Expanded copy remains readable without clipping or overlap.
- macOS baselines included stale images predating merged HOME work. Each changed image was compared with a freshly built `801c6ec` main baseline before acceptance. 48 website visual checks then passed.
- Linux images were reviewed individually against their previous baselines. Downstream unchanged blocks can move by a fractional pixel when earlier copy changes height; the footer logo image was recaptured with unchanged artwork and geometry.
- No visual thresholds were relaxed. No Planner behavior, candidate data or result wording was changed.
