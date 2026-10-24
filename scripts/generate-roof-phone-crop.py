"""Deterministic mobile crop of existing approved illustrations; no generated pixels.

The 784x844 window removes 180px of sky while retaining the roof upstand and seams.
Desktop originals are never changed. Run from the repository root with Pillow.
"""
from pathlib import Path
from hashlib import sha256
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/media-responsive'
result = {}
for theme, folder in [('light', 'direction-hero-photo-variant'), ('dark', 'direction-hero-blue-hour')]:
    source = ROOT / 'design-assets' / folder / 'pokrivelni-roboty.png'
    with Image.open(source) as image:
        crop = image.convert('RGB').crop((429, 180, 1213, 1024))
        result[theme] = {'source': str(source.relative_to(ROOT)), 'crop': [429, 180, 1213, 1024], 'position': '45% center'}
        for extension, quality in [('avif', 60), ('webp', 82)]:
            import io
            buffer = io.BytesIO()
            crop.save(buffer, format=extension.upper(), quality=quality)
            data = buffer.getvalue()
            name = f'direction-hero-roof-mobile-{theme}-784w.{sha256(data).hexdigest()[:8]}.{extension}'
            (OUT / name).write_bytes(data)
            result[theme][extension] = {'src': '/media-responsive/' + name, 'bytes': len(data)}
print(json.dumps(result, indent=2))
