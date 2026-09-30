#!/usr/bin/env python3
"""HOME v2 — derived WebP crops under public/media/home-v2/ (manual, not part of the build).

Crop and resize only: no retouching, no compositing, no generated pixels. Sources and boxes:

  concepts/hero-mobile      media/directions-sequence-source/angary.png   (720, 0, 1472, 941)  concept render, 4:5
  concepts/card-photo-drawing media/direction-hero-source/metalokonstruktsii.png (470, 230, 1482, 989) concept photo + drawings, 4:3
  concepts/card-node        media/concepts/about-experience-v2.jpg        (0, 620, 1440, 1700) concept image, 4:3
  hangar-wide               photos/serhii-prior-hangar.jpeg               (0, 440, 1550, 1060) the approved frame, sky/ground trimmed
  hangar-narrow             photos/serhii-prior-hangar.jpeg               (20, 455, 1020, 1122)
  conversation-bg           media/engineering-planning.jpg                (0, 600, 1800, 1800) decorative
  conversation-bg-portrait  media/engineering-planning.jpg                (0, 300, 1800, 2700) decorative

Iteration 3 (made once by hand, sources live outside the repo, so they are not in JOBS below):
  photos/serhii-prior-hangar-retouched.jpeg + hangar-retouched-{960,1536}w  owner-supplied CLEANED version of DSCF7654,
      rubikon-real-hangar-cleaned.png (1536×1024; loose items in front removed, whole frame re-rendered), box
      (0, 172, 1536, 960) = the same framing as (0, 700, 6240, 3900) on the original; saved without EXIF. The page
      labels it «Фото з ретушшю переднього плану».
  concepts/hangar-xray-{1100,1774}w  the owner-approved X-ray sketch rubikon-hangar-xray-concept-v2-clean.png (1774×887),
      resized only. It is a generated illustration, labelled «Ілюстративна схема конструкції» on the page.

Everything derived from a concept source sits in concepts/, so the existing «no concept image outside the direction
cards» check (tests/e2e/pr-critical.spec.ts) sees it. The callout positions in EngineeringSignature.tsx are
percentages of these exact boxes — change a box and they must be re-measured.

Usage:  cd <repo root> && python3 scripts/generate-home-v2-crops.py   (requires Pillow)
"""
import os

from PIL import Image

SRC = 'public/'
OUT = 'public/media/home-v2/'

JOBS = [
    ('concepts/hero-mobile', 'media/directions-sequence-source/angary.png', (720, 0, 1472, 941), [480, 752], 80),
    ('concepts/card-photo-drawing', 'media/direction-hero-source/metalokonstruktsii.png', (470, 230, 1482, 989), [640, 1012], 80),
    ('concepts/card-node', 'media/concepts/about-experience-v2.jpg', (0, 620, 1440, 1700), [640, 1040], 80),
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
