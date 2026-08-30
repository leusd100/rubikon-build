#!/usr/bin/env python3
"""Regenerates the Step 02 responsive WebP variants under public/media-responsive/.

Not wired into `pnpm build` — this is a one-time/manual generation step. Run it again
by hand whenever one of the 12 source JPEGs listed below is replaced, then commit the
new output files (their content-hashed names mean stale variants left behind are
simply orphaned, not silently served — delete old files for that source manually).

Requires Pillow (`pip install Pillow`) — not a project dependency, this script is not
part of the app's own build/runtime.

Widths (480 / 768 / 1200) are not arbitrary: they were derived from the actual
measured CSS/grid rendered widths across the 3 affected call sites
(DirectionCards.tsx, DirectionDetail.tsx, pro-nas/page.tsx) — see the Step 02 design
report for the full breakpoint-by-breakpoint math. Output filenames carry an 8-char
content hash of the encoded bytes, so they are safe for the immutable, 1-year
Cache-Control rule in public/_headers (unlike the unhashed originals, which use a
moderate 7-day cache instead).

Usage:
    cd <repo root>
    python3 scripts/generate-step02-responsive-images.py
"""
import hashlib
import io
import os

from PIL import Image

SRC_DIR = "public/media/concepts"
OUT_DIR = "public/media-responsive"
WIDTHS = [480, 768, 1200]
QUALITY = 78

FILES = [
    "direction-hangars-v2.jpg",
    "direction-grain-v2.jpg",
    "direction-steel-v2.jpg",
    "direction-concrete-v2.jpg",
    "direction-roofing-v2.jpg",
    "detail-hangars-v2.jpg",
    "detail-grain-v2.jpg",
    "detail-steel-v2.jpg",
    "detail-concrete-v2.jpg",
    "detail-roofing-v2.jpg",
    "about-experience-v2.jpg",
    "about-shared-approach-v2.jpg",
]


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []

    for fname in FILES:
        src_path = os.path.join(SRC_DIR, fname)
        base = fname.rsplit(".", 1)[0]
        im = Image.open(src_path).convert("RGB")
        src_w, src_h = im.size

        for w in WIDTHS:
            target_w = min(w, src_w)  # never upscale past the source's own resolution
            target_h = round(src_h * (target_w / src_w))
            resized = im.resize((target_w, target_h), Image.LANCZOS)

            buf = io.BytesIO()
            resized.save(buf, format="WEBP", quality=QUALITY, method=6)
            data = buf.getvalue()
            content_hash = hashlib.sha256(data).hexdigest()[:8]

            out_name = f"{base}-{w}w.{content_hash}.webp"
            with open(os.path.join(OUT_DIR, out_name), "wb") as f:
                f.write(data)

            results.append((fname, out_name, len(data)))

    total_bytes = sum(r[2] for r in results)
    print(f"Generated {len(results)} files, total {total_bytes / 1024:.1f} KB\n")
    for source, out_name, size in results:
        print(f"{source:38s} -> {out_name:55s} {size / 1024:7.1f} KB")
    print(
        "\nReminder: after running this, regenerate "
        "app/data/responsiveImageManifest.ts to match the new filenames "
        "(the hash changes whenever a source image's content changes)."
    )


if __name__ == "__main__":
    main()
