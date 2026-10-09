#!/usr/bin/env python3
"""HOME v2 — derived WebP crops under public/media/home-v2/ (manual, not part of the build).

Crop and resize only: no retouching, no compositing, no generated pixels. Sources and boxes:

  concepts/hero-mobile-band media/directions-sequence-source/angary.png   (720, 84, 1472, 762) concept render, phone band
  hangar-wide               photos/serhii-prior-hangar.jpeg               (0, 440, 1550, 1060) the approved frame, sky/ground trimmed
  hangar-narrow             photos/serhii-prior-hangar.jpeg               (20, 455, 1020, 1122)
  conversation-bg           media/engineering-planning.jpg                (0, 600, 1800, 1800) decorative
  conversation-bg-portrait  media/engineering-planning.jpg                (0, 300, 1800, 2700) decorative

Iteration 3 (made once by hand, sources live outside the repo, so they are not in JOBS below):
  photos/serhii-prior-hangar-retouched.jpeg + hangar-retouched-{960,1536}w  owner-supplied CLEANED version of DSCF7654,
      rubikon-real-hangar-cleaned.png (1536×1024; loose items in front removed, whole frame re-rendered), box
      (0, 172, 1536, 960) = the same framing as (0, 700, 6240, 3900) on the original; saved without EXIF. The page
      labels it «Фото з ретушшю переднього плану».
  04.10: the owner re-exported the same retouch at 4416×2260 (DSCF7654_retouched_native_4416.jpg, outside the repo). It
      replaced these files and added hangar-retouched-{2304,3072,3840}w: one similarity warp onto the 1536×788 frame the
      contour lines are registered on (scale 0.347884, shift under 1 px, rms 0.68 px), then LANCZOS resizes; WebP q80,
      the JPEG q86. app/data/homeProofContour.ts pins every file's sha256.
  The X-ray sketch made here once (concepts/hangar-xray-{1100,1774}w) left HOME on 04.10: the owner's variant A
      «Калька» draws the lines measured from the photos and a labelled scheme instead. Its files stayed for the
      test-only comparison /?xray=sketch until the proof block's cleanup (09.10), which removed both.
  The two explanation cards' crops (concepts/card-photo-drawing, concepts/card-node) left with the cards (09.10).

Everything derived from a concept source sits in concepts/, so the existing «no concept image outside the direction
cards» check (tests/e2e/pr-critical.spec.ts) sees it. The callout positions in EngineeringSignature.tsx are
percentages of these exact boxes — change a box and they must be re-measured.

The phone hero still (≤760 px) used to be the full-height 4:5 crop (720, 0, 1472, 941). The page draws it with
object-fit: cover and object-position 50% 32% into a band whose height follows the viewport, so only a window of rows
is ever seen: measured in Chrome from 360×780 to 430×932 (and 375×667), every phone sees rows 85–761 of those 941 at
most. With a 32% position the windows nest, and a crop of height H whose top is 0.32 × (941 − H) shows exactly the same
window on every band up to H — so the band crop (84 … 762) changes no visible pixel on those phones and the CSS stays.
Bands squarer than 752:678 (a Fold cover screen, an iPad mini in portrait) are covered by zooming ~8 % instead.

Usage:  cd <repo root> && python3 scripts/generate-home-v2-crops.py   (requires Pillow)
"""
import os

from PIL import Image

SRC = 'public/'
OUT = 'public/media/home-v2/'

JOBS = [
    ('concepts/hero-mobile-band', 'media/directions-sequence-source/angary.png', (720, 84, 1472, 762), [480, 752], 80),
    ('hangar-wide', 'photos/serhii-prior-hangar.jpeg', (0, 440, 1550, 1060), [960, 1550], 80),
    ('hangar-narrow', 'photos/serhii-prior-hangar.jpeg', (20, 455, 1020, 1122), [640, 1000], 80),
    ('conversation-bg', 'media/engineering-planning.jpg', (0, 600, 1800, 1800), [960, 1600], 72),
    ('conversation-bg-portrait', 'media/engineering-planning.jpg', (0, 300, 1800, 2700), [720], 70),
]

for name, source, box, widths, quality in JOBS:
    image = Image.open(SRC + source).convert('RGB').crop(box)
    os.makedirs(os.path.dirname(OUT + name), exist_ok=True)
    for width in widths:
        height = round(image.height * width / image.width)
        resized = image if width == image.width else image.resize((width, height), Image.LANCZOS)
        path = f'{OUT}{name}-{width}w.webp'
        resized.save(path, 'WEBP', quality=quality, method=6)
        print(path, f'{os.path.getsize(path) // 1024} KB', f'{width}×{height}')
