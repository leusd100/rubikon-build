#!/usr/bin/env python3
"""Export the approved H1/P5 portrait masters without cropping or retouching.

Usage: python3 scripts/generate-phone-hero-stills.py HOME_H1.png ABOUT_P5.png
Masters stay in the owner's design-research outputs; only delivery WebP is committed.
Requires Pillow (the same dependency as the existing crop scripts).
"""
import argparse
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZES = ((480, 70_000), (768, 120_000), (1024, 170_000))


def export(source: Path, directory: str, prefix: str) -> None:
    with Image.open(source) as original:
        image = original.convert('RGB')
    if image.size != (1024, 1536):
        raise ValueError(f'{source}: expected the approved 1024×1536 portrait master')
    destination = ROOT / 'public' / directory
    destination.mkdir(parents=True, exist_ok=True)
    for width, budget in SIZES:
        height = width * 3 // 2
        output = destination / f'{prefix}-{width}w.webp'
        image.resize((width, height), Image.Resampling.LANCZOS).save(output, quality=78, method=6)
        size = output.stat().st_size
        if size > budget:
            raise ValueError(f'{output}: {size} bytes exceeds the {budget}-byte review budget')
        print(f'{output.relative_to(ROOT)}: {width}×{height}, {size} bytes')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('home', type=Path)
    parser.add_argument('about', type=Path)
    arguments = parser.parse_args()
    export(arguments.home, 'media/home-v2/concepts', 'hero-h1')
    export(arguments.about, 'media/about', 'about-p5')
