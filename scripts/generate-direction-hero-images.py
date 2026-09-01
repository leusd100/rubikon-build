#!/usr/bin/env python3
"""Generate uncropped responsive WebP variants for direction-page hero artwork.

The source PNGs in public/media/direction-hero-source/ are the approved artwork.
This script only changes encoding and dimensions: it never crops, composites, or
otherwise edits the supplied images. Output filenames are content-hashed so they
can use the immutable media-responsive cache policy.
"""

import hashlib
import io
import os

from PIL import Image


OUT_DIR = "public/media-responsive"
WIDTHS = [480, 768, 1200, 1536]
QUALITY = 90
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
]


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    results = []

    for source_dir, output_prefix, files in IMAGE_SETS:
        for filename in files:
            source_path = os.path.join(source_dir, filename)
            base = filename.rsplit(".", 1)[0]
            image = Image.open(source_path).convert("RGB")
            source_width, source_height = image.size

            for width in WIDTHS:
                target_width = min(width, source_width)
                target_height = round(source_height * (target_width / source_width))
                resized = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

                buffer = io.BytesIO()
                resized.save(buffer, format="WEBP", quality=QUALITY, method=6)
                encoded = buffer.getvalue()
                digest = hashlib.sha256(encoded).hexdigest()[:8]
                output_name = f"{output_prefix}-{base}-{width}w.{digest}.webp"

                with open(os.path.join(OUT_DIR, output_name), "wb") as output:
                    output.write(encoded)

                results.append((f"{output_prefix}/{filename}", output_name, len(encoded)))

    total_bytes = sum(result[2] for result in results)
    print(f"Generated {len(results)} files, total {total_bytes / 1024:.1f} KiB")
    for source, output, size in results:
        print(f"{source:25s} -> {output:63s} {size / 1024:7.1f} KiB")


if __name__ == "__main__":
    main()
