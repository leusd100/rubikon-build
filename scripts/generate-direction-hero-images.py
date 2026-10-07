#!/usr/bin/env python3
"""Generate responsive WebP variants for full-bleed hero artwork (direction pages, /yak-pratsyuiemo).

The source images in public/media/*-source/ are the approved artwork.
Landscape variants preserve the complete source. The /napryamky sequence also
gets portrait crops for tall screens; source artwork is never modified.
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
IMAGE_SETS = [
    ("public/media/direction-hero-source", "direction-hero", [
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
    ("public/media/process-hero-source", "process-hero", [
        "yak-pratsyuiemo.webp",
    ]),
]


def emit_variants(image, prefix, base, widths, results) -> None:
    for width in widths:
        target_width = min(width, image.width)
        target_height = round(image.height * (target_width / image.width))
        resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        resized.save(buffer, format="WEBP", quality=QUALITY, method=6)
        encoded = buffer.getvalue()
        digest = hashlib.sha256(encoded).hexdigest()[:8]
        output_name = f"{prefix}-{base}-{target_width}w.{digest}.webp"
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
            is_sequence = output_prefix == "directions-sequence"
            widths = sorted(set(WIDTHS + ([image.width] if is_sequence else [])))
            emit_variants(image, output_prefix, base, widths, results)
            if is_sequence:
                crop_width = min(image.width, round(image.height * 3 / 4))
                left = round((image.width - crop_width) * SEQUENCE_PORTRAIT_POSITIONS[base])
                portrait = image.crop((left, 0, left + crop_width, image.height))
                emit_variants(portrait, output_prefix, base + "-portrait", [320, 480, crop_width], results)

    total_bytes = sum(result[2] for result in results)
    print(f"Generated {len(results)} files, total {total_bytes / 1024:.1f} KiB")
    for source, output, size in results:
        print(f"{source:25s} -> {output:63s} {size / 1024:7.1f} KiB")


if __name__ == "__main__":
    main()
