#!/usr/bin/env python3
"""Generate responsive WebP variants for full-bleed hero artwork (direction pages, /yak-pratsyuiemo).

The approved source images live in public/media/*-source/. The Phase 6 photo
variant sources live in design-assets/ so they are not deployed as PNGs.
Landscape variants preserve the complete source. The /napryamky sequence also
gets portrait crops for tall screens, and the direction page photos get phone
crops in WebP and AVIF; source artwork is never modified.
Output filenames are content-hashed for the immutable media-responsive cache policy.
"""

import hashlib
import io
import os
import sys

from PIL import Image


OUT_DIR = "public/media-responsive"
WIDTHS = [480, 768, 1200, 1536]
# 85, not 90: measured 2026-10-01 on all ten sources × four widths, q85 is 23 % smaller than q90 (7.15 → 5.48 MB) at
# SSIM 0.975–0.985 against the lossless resize (q90: 0.983–0.990); 1:1 crops show no visible difference, while q80
# already smooths the fine grain in dark areas. The heroes are also shown desaturated under a dark overlay.
QUALITY = 85
# Horizontal object-position within the excess width of a 3:4 portrait crop.
# Keep the frame, silos, reinforcement and roof detail visible on tall screens.
SEQUENCE_PORTRAIT_POSITIONS = {
    "angary": .66,
    "zernoskhovyshcha": .65,
    "metalokonstruktsii": .64,
    "betonni-roboty": .78,
    "pokrivelni-roboty": .67,
}
SEQUENCE_CONCEPT_PORTRAIT_POSITIONS = {
    # The new panoramic compositions reserve the left side for desktop copy.
    # Portrait crops move toward the structure so it remains legible on phones.
    "angary": .72,
    "zernoskhovyshcha": .70,
    "metalokonstruktsii": .70,
    "betonni-roboty": .70,
    "pokrivelni-roboty": .69,
}
# Phones draw a direction hero by its height (object-fit: cover): up to 440 px wide its box is at most 0.755 as wide as
# tall (the hero is at least 660 − 77 = 583 px tall where its height is fixed, more where its copy sets it), so a phone
# only ever sees a window of the 1536 × 1024 art no wider than 784 px (0.766). That window is shipped at native size:
# the same pixels, without the half a phone crops away. Placed at x of the spare width, it holds every narrower window
# that object-position: x% picks from the whole art, so x = mobileFocalPosition in app/data/directionHeroImageManifest.ts.
DIRECTION_HERO_PORTRAIT_WIDTH = 784
DIRECTION_HERO_PORTRAIT_POSITIONS = {
    "angary": .58,
    "zernoskhovyshcha": .62,
    "metalokonstruktsii": .58,
    "betonni-roboty": .55,
    "pokrivelni-roboty": .57,
}
# AVIF twins of the portrait crops, at the lowest quality whose rendered SSIM is not below the WebP's (Stage 03, 13.10):
# the daylight WebP is q85, the blue-hour WebP q90.
DIRECTION_HERO_PORTRAIT_AVIF_QUALITY = {"direction-hero-photo-variant": 75, "direction-hero-blue-hour": 85}
IMAGE_SETS = [
    ("design-assets/direction-hero-blue-hour", "direction-hero-blue-hour", [
        "angary.png",
        "zernoskhovyshcha.png",
        "metalokonstruktsii.png",
        "betonni-roboty.png",
        "pokrivelni-roboty.png",
    ]),
    ("public/media/direction-hero-source", "direction-hero", [
        "angary.png",
        "zernoskhovyshcha.png",
        "metalokonstruktsii.png",
        "betonni-roboty.png",
        "pokrivelni-roboty.png",
    ]),
    ("design-assets/direction-hero-photo-variant", "direction-hero-photo-variant", [
        "angary.png",
        "zernoskhovyshcha.png",
        "metalokonstruktsii.png",
        "betonni-roboty.png",
        "pokrivelni-roboty.png",
    ]),
    ("public/media/directions-sequence-source", "directions-sequence", [
        "angary.png",
        "zernoskhovyshcha.png",
        "metalokonstruktsii.png",
        "betonni-roboty.png",
        "pokrivelni-roboty.png",
    ]),
    ("design-assets/directions-sequence-concepts/daylight", "directions-sequence-daylight", [
        "angary.png",
        "zernoskhovyshcha.png",
        "metalokonstruktsii.png",
        "betonni-roboty.png",
        "pokrivelni-roboty.png",
    ]),
    ("design-assets/directions-sequence-concepts/blue-hour", "directions-sequence-blue-hour", [
        "angary.png",
        "zernoskhovyshcha.png",
        "metalokonstruktsii.png",
        "betonni-roboty.png",
        "pokrivelni-roboty.png",
    ]),
    ("public/media/process-hero-source", "process-hero", [
        "yak-pratsyuiemo.webp",
    ]),
]


def emit_variants(image, prefix, base, widths, results, quality=QUALITY, fmt="WEBP") -> None:
    for width in widths:
        target_width = min(width, image.width)
        target_height = round(image.height * (target_width / image.width))
        resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        if fmt == "AVIF":
            resized.save(buffer, format="AVIF", quality=quality, speed=4)
        else:
            resized.save(buffer, format="WEBP", quality=quality, method=6)
        encoded = buffer.getvalue()
        digest = hashlib.sha256(encoded).hexdigest()[:8]
        output_name = f"{prefix}-{base}-{target_width}w.{digest}.{fmt.lower()}"
        with open(os.path.join(OUT_DIR, output_name), "wb") as output:
            output.write(encoded)
        results.append((f"{prefix}/{base}", output_name, len(encoded)))


def main() -> None:
    # `--only <prefix>` regenerates one set, so adding artwork never re-encodes the others
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []

    for source_dir, output_prefix, files in IMAGE_SETS:
        if only and output_prefix != only:
            continue
        for filename in files:
            source_path = os.path.join(source_dir, filename)
            base = filename.rsplit(".", 1)[0]
            image = Image.open(source_path).convert("RGB")
            is_sequence = output_prefix.startswith("directions-sequence")
            quality = 90 if output_prefix in ("directions-sequence-daylight", "directions-sequence-blue-hour", "direction-hero-blue-hour") else QUALITY
            widths = sorted(set(WIDTHS + ([image.width] if is_sequence else [])))
            emit_variants(image, output_prefix, base, widths, results, quality)
            if output_prefix in DIRECTION_HERO_PORTRAIT_AVIF_QUALITY:
                crop_width = DIRECTION_HERO_PORTRAIT_WIDTH
                left = round((image.width - crop_width) * DIRECTION_HERO_PORTRAIT_POSITIONS[base])
                portrait = image.crop((left, 0, left + crop_width, image.height))
                emit_variants(portrait, output_prefix, base + "-portrait", [crop_width], results, quality)
                emit_variants(portrait, output_prefix, base + "-portrait", [crop_width], results,
                              DIRECTION_HERO_PORTRAIT_AVIF_QUALITY[output_prefix], fmt="AVIF")
            if is_sequence:
                crop_width = min(image.width, round(image.height * 3 / 4))
                positions = SEQUENCE_CONCEPT_PORTRAIT_POSITIONS if output_prefix != "directions-sequence" else SEQUENCE_PORTRAIT_POSITIONS
                left = round((image.width - crop_width) * positions[base])
                portrait = image.crop((left, 0, left + crop_width, image.height))
                emit_variants(portrait, output_prefix, base + "-portrait", [320, 480, crop_width], results, quality)

    total_bytes = sum(result[2] for result in results)
    print(f"Generated {len(results)} files, total {total_bytes / 1024:.1f} KiB")
    for source, output, size in results:
        print(f"{source:25s} -> {output:63s} {size / 1024:7.1f} KiB")


if __name__ == "__main__":
    main()
