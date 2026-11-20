#!/usr/bin/env python3
"""Traces each direction hero's own photo into a line drawing that draws itself (owner, 20.11: prototype B, «Топова ідея»).

The first view of a direction page draws the photo's frame in lines — copper perspective lines first, then the structure
from the ground up, as it is built — and the photo develops from under a veil of the hero's own colour. The lines are
not drawn by hand: a line segment detector (OpenCV LSD) finds the straight edges of the photo itself, so the drawing
lies on the photo line for line. The blue-hour art shares the daylight art's geometry (96–99 % of its edges within
4 px, measured 20.11), so one drawing serves both themes; the page inverts its colours in the dark theme.

Each drawing is an SVG file the page shows in an <img> of the photo's own size, fit and position, so the browser lays it
on the photo exactly as it lays the photo, at every width and crop. Its animation is inside the file (CSS, no script).

    python3 scripts/generate-direction-hero-traces.py

Writes public/media-responsive/hero-trace-<direction>-<crop>.<hash>.svg — the 1536 × 1024 landscape art, the phone's
784 × 1024 window of it (DIRECTION_HERO_PORTRAIT_* in generate-direction-hero-images.py) and, for /pokrivelni-roboty,
the roof crop the phone shows instead (generate-roof-phone-crop.py) — and app/data/directionHeroTraceManifest.ts.
Needs opencv-python-headless and numpy (pip install opencv-python-headless numpy); built with OpenCV 5.1.0. A rerun on
the same OpenCV gives the same files.
"""
import ast
import hashlib
import math
import re
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/media-responsive'
MANIFEST = ROOT / 'app/data/directionHeroTraceManifest.ts'
DIRECTIONS = ['angary', 'zernoskhovyshcha', 'metalokonstruktsii', 'betonni-roboty', 'pokrivelni-roboty']

# The phone window's width and positions, read from the image generator itself so the two never disagree (it needs
# Pillow, this script does not, so it is read rather than imported)
_HERO = (ROOT / 'scripts/generate-direction-hero-images.py').read_text()
PORTRAIT_WIDTH = int(re.search(r'^DIRECTION_HERO_PORTRAIT_WIDTH = (\d+)$', _HERO, re.M).group(1))
PORTRAIT_POSITIONS = ast.literal_eval(re.search(r'^DIRECTION_HERO_PORTRAIT_POSITIONS = (\{[^}]*\})', _HERO, re.M).group(1))
ROOF_CROP = (429, 180, 1213, 1024)  # generate-roof-phone-crop.py

# How many lines a drawing keeps (the longest), and the timing: the guides, then the structure from the ground up
LINES = {'landscape': 200, 'portrait': 130}
GUIDE_AT, GUIDE_FOR = 0.0, 0.7
LINES_FROM, LINES_SPAN, LINE_FOR = 0.35, 1.25, 0.42


# On a phone the copy's overlay is nearly opaque from ~220 px down a ~844 px hero (phone-hero.css): a line wholly below
# this share of the phone drawing would draw unseen and leave the visible part blank for its first second (review, #323)
PHONE_VISIBLE = 0.40


def segments(image: np.ndarray, keep: int, visible: float = 1.0):
    """The photo's straight edges, longest first, without the ground's clutter or what lies wholly below `visible` of the
    height, each run on 3 % past its ends"""
    h, w = image.shape[:2]
    gray = cv2.bilateralFilter(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY), 7, 40, 7)
    found = np.asarray(cv2.createLineSegmentDetector(cv2.LSD_REFINE_STD).detect(gray)[0]).reshape(-1, 4)
    kept = []
    for x1, y1, x2, y2 in found.tolist():
        length = math.hypot(x2 - x1, y2 - y1)
        angle = abs(math.degrees(math.atan2(y2 - y1, x2 - x1))) % 180
        flat = min(angle, 180 - angle) < 12
        low = min(y1, y2) > h * 0.70
        if length < w * 0.03 or (low and (flat or length < w * 0.08)) or min(y1, y2) > h * visible:
            continue
        kept.append((x1, y1, x2, y2, length))
    kept.sort(key=lambda s: -s[4])
    out = []
    for x1, y1, x2, y2, length in kept[:keep]:
        dx, dy, run = (x2 - x1) / length, (y2 - y1) / length, length * 0.03
        out.append((x1 - dx * run, y1 - dy * run, x2 + dx * run, y2 + dy * run, length))
    return out


def guides(segs, w: int):
    """Two perspective lines: the longest edges between 10° and 45°, carried far on"""
    tilted = []
    for x1, y1, x2, y2, length in segs:
        angle = abs(math.degrees(math.atan2(y2 - y1, x2 - x1))) % 180
        if 10 < min(angle, 180 - angle) < 45:
            tilted.append((x1, y1, x2, y2, length))
    out = []
    for x1, y1, x2, y2, length in sorted(tilted, key=lambda s: -s[4])[:2]:
        dx, dy, run = (x2 - x1) / length, (y2 - y1) / length, w * 0.45
        out.append((x1 - dx * run, y1 - dy * run, x2 + dx * run, y2 + dy * run))
    return out


def svg(w: int, h: int, segs, guide_lines) -> str:
    rnd = np.random.default_rng(20251120)
    order = sorted(segs, key=lambda s: -max(s[1], s[3]))
    paths = []
    for i, (x1, y1, x2, y2) in enumerate(guide_lines):
        paths.append(f'<path class="g" d="M{x1:.0f} {y1:.0f}L{x2:.0f} {y2:.0f}" pathLength="1" style="animation-delay:{GUIDE_AT + i * .12:.2f}s"/>')
    for i, (x1, y1, x2, y2, _) in enumerate(order):
        at = LINES_FROM + i / len(order) * LINES_SPAN + rnd.random() * .08
        paths.append(f'<path d="M{x1:.0f} {y1:.0f}L{x2:.0f} {y2:.0f}" pathLength="1" style="animation-delay:{at:.2f}s"/>')
    style = (
        'path{fill:none;stroke:#3b3d3a;stroke-width:1.4;stroke-linecap:round;vector-effect:non-scaling-stroke;'
        f'stroke-dasharray:1 1;stroke-dashoffset:1;animation:d {LINE_FOR}s cubic-bezier(.4,0,.2,1) forwards}}'
        f'.g{{stroke:#b76432;stroke-width:1.6;animation-duration:{GUIDE_FOR}s}}'
        '@keyframes d{to{stroke-dashoffset:0}}'
        '@media (prefers-reduced-motion:reduce){path{animation:none;stroke-dashoffset:0}}'
    )
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">'
            f'<style>{style}</style>{"".join(paths)}</svg>\n')


def write(name: str, image: np.ndarray, kind: str) -> str:
    h, w = image.shape[:2]
    segs = segments(image, LINES[kind], PHONE_VISIBLE if kind == 'portrait' else 1.0)
    data = svg(w, h, segs, guides(segs, w)).encode()
    file = f'hero-trace-{name}.{hashlib.sha256(data).hexdigest()[:8]}.svg'
    for old in OUT.glob(f'hero-trace-{name}.*.svg'):
        old.unlink()
    (OUT / file).write_bytes(data)
    print(f'{file:52} {w}×{h} {len(segs):3} lines {len(data) / 1024:5.1f} KiB')
    return f'/media-responsive/{file}'


def main() -> None:
    entries = []
    for name in DIRECTIONS:
        art = cv2.imread(str(ROOT / f'design-assets/direction-hero-photo-variant/{name}.png'))
        landscape = write(f'{name}-1536w', art, 'landscape')
        left = round((art.shape[1] - PORTRAIT_WIDTH) * PORTRAIT_POSITIONS[name])
        portrait = write(f'{name}-portrait-784w', art[:, left:left + PORTRAIT_WIDTH], 'portrait')
        phone = None
        if name == 'pokrivelni-roboty':
            x1, y1, x2, y2 = ROOF_CROP
            phone = write(f'{name}-roof-mobile-784w', art[y1:y2, x1:x2], 'portrait')
        entries.append((name, landscape, portrait, phone))
    lines = [
        '// Generated by scripts/generate-direction-hero-traces.py — do not edit. The line drawing each direction hero\'s',
        '// first view draws on its own photo (DirectionHeroImage): the landscape art, the phone\'s 784 px window of it, and',
        '// the phone crop where a direction shows one instead.',
        'export type DirectionHeroTrace = { landscape: string; portrait: string; phoneCrop?: string };',
        '',
        'export const directionHeroTraces: Record<string, DirectionHeroTrace> = {',
    ]
    for name, landscape, portrait, phone in entries:
        crop = f", phoneCrop: '{phone}'" if phone else ''
        lines.append(f"  '{name}': {{ landscape: '{landscape}', portrait: '{portrait}'{crop} }},")
    lines.append('};')
    MANIFEST.write_text('\n'.join(lines) + '\n')
    print(f'wrote {MANIFEST.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
