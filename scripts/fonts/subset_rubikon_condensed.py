"""Builds Rubikon Condensed: IBM Plex Sans Condensed 3.000, subset to what the site sets, under a name of its own.

IBM Plex Sans Condensed is licensed under the SIL OFL 1.1 with the Reserved Font Name "Plex": a Modified Version —
a subset is one — may not carry that name. The site used IBM's own split files unmodified for that reason (PR #93).
On 20.11 the owner chose to rename and subset (Weight audit: the faces were 123 KB of the 158 KB the self-hosted fonts
weigh; at the characters the site sets they are 76 KB). The outlines, metrics, hinting and OpenType features are IBM's,
untouched; only characters the site never sets are dropped, and the name table no longer says Plex.

    python3 scripts/fonts/subset_rubikon_condensed.py <IBM split woff2 dir> app/fonts/rubikon-condensed

<IBM split woff2 dir> holds IBM's fonts/split/woff2 files of npm @ibm/plex-sans-condensed@2.0.0 (the files the site
served until 20.11; app/fonts/rubikon-condensed/README.md lists their checksums). For each weight it writes a Latin, a
Cyrillic and a Pi file and prints the unicode-range to paste into app/fonts/rubikon-condensed.css.

What each subset keeps:
  - Latin: all of ASCII, the punctuation and signs a Ukrainian page sets, and every other character in app/**
    (.ts, .tsx, .css) that IBM's Latin1 file had — so no character the site sets falls to the fallback face;
  - Cyrillic: the basic Cyrillic block (Ukrainian, and the Russian letters a visitor may type), Ґ ґ, and every other
    character in app/** that IBM's Cyrillic file had;
  - Pi: the five characters its CSS range has given it since PR #93 (′ ″ ↑ ↓ ∕), and every other character in
    app/** that IBM's Pi file had. WebKit (Safari, every iPhone browser) draws a character from a loaded face whose
    file has it even outside the face's unicode-range (measured 20.11: with IBM's Pi loaded, № ← → ↔ ↗ ↺ √ ≈ ≤ ≥ ✓
    came from Plex in WebKit and from the fallback in Chromium). The file keeps them and the CSS range stays the five,
    so neither engine draws anything differently.
Glyph names (post format 2) are kept: without them Chromium on macOS rasterised the same outlines a shade differently.
tests/unit/rubikon-condensed-font.test.ts fails when app/** sets a character the old faces had and these do not: run
this script again then. Needs fontTools with brotli (pip install fonttools brotli); built with fontTools 4.68.0.
"""
import hashlib
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = 'Rubikon Condensed'
WEIGHTS = {'Medium': ('Medium', 'Md'), 'SemiBold': ('SemiBold', 'SmBld'), 'Bold': ('Bold', 'Bold')}
LATIN_BASE = (
    list(range(0x20, 0x7F))
    # no-break space, soft hyphen, « » · × © ° § ± ²
    + [0xA0, 0xAD, 0xAB, 0xBB, 0xB7, 0xD7, 0xA9, 0xB0, 0xA7, 0xB1, 0xB2]
    # – — ‘ ’ ‚ “ ” „ • … ‹ › € ™ −
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2039, 0x203A, 0x20AC, 0x2122,
       0x2212]
)
CYRILLIC_BASE = list(range(0x400, 0x460)) + [0x490, 0x491]
PI = [0x2032, 0x2033, 0x2191, 0x2193, 0x2215]


def site_characters(root: Path) -> set[int]:
    """Every character in the site's sources: text, data and CSS content alike"""
    chars = set()
    for pattern in ('**/*.ts', '**/*.tsx', '**/*.css'):
        for file in root.glob(pattern):
            chars.update(ord(c) for c in file.read_text(encoding='utf-8') if ord(c) > 0x7E)
    return chars


def ranges(codepoints) -> str:
    out, run = [], None
    for cp in sorted(codepoints):
        if run and cp == run[1] + 1:
            run[1] = cp
        else:
            if run:
                out.append(run)
            run = [cp, cp]
    if run:
        out.append(run)
    return ', '.join(f'U+{a:04X}' if a == b else f'U+{a:04X}-{b:04X}' for a, b in out)


def rename(font: TTFont, style: str, short: str) -> None:
    """The name table without the Reserved Font Name: family, full and PostScript names, the unique ID; IBM's
    copyright and the OFL notice stay, as the licence requires; the Plex trademark line goes with the name"""
    names = {
        1: f'{FAMILY} {short}',
        3: f'3.000;RUBIKON;RubikonCondensed-{style}',
        4: f'{FAMILY} {style}',
        6: f'RubikonCondensed-{style}',
        10: 'A Modified Version of IBM Plex Sans Condensed 3.000 (IBM Corp., SIL OFL 1.1): subset for rubikonbuild.com '
            'and renamed, as the licence requires of a Modified Version of a font with the Reserved Font Name "Plex".',
        16: FAMILY,
        17: style,
    }
    table = font['name']
    table.removeNames(nameID=7)
    for name_id, value in names.items():
        table.removeNames(nameID=name_id)
        table.setName(value, name_id, 3, 1, 0x409)
        table.setName(value, name_id, 1, 0, 0)
    for record in table.names:
        assert 'Plex' not in record.toUnicode() or record.nameID in (0, 10), (record.nameID, record.toUnicode())


def main(source_dir: str, out_dir: str) -> None:
    source, out = Path(source_dir), Path(out_dir)
    used = site_characters(Path('app'))
    for style, (full, short) in WEIGHTS.items():
        for part, base, ibm in (('Latin', LATIN_BASE, 'Latin1'), ('Cyrillic', CYRILLIC_BASE, 'Cyrillic'), ('Pi', PI, 'Pi')):
            src = source / f'IBMPlexSansCondensed-{style}-{ibm}.woff2'
            print(f'source {src.name} sha256 {hashlib.sha256(src.read_bytes()).hexdigest()}')
            had = set(TTFont(str(src)).getBestCmap())
            wanted = (set(base) | used) & had
            options = subset.Options()
            options.flavor = 'woff2'
            options.layout_features = ['*']
            options.name_IDs = ['*']
            options.name_languages = ['*']
            options.notdef_outline = True
            options.glyph_names = True
            font = subset.load_font(str(src), options)
            subsetter = subset.Subsetter(options)
            subsetter.populate(unicodes=wanted)
            subsetter.subset(font)
            rename(font, full, short)
            target = out / f'RubikonCondensed-{style}-{part}.woff2'
            subset.save_font(font, str(target), options)
            cmap = set(TTFont(str(target)).getBestCmap())
            print(f'  -> {target.name} {target.stat().st_size} B, sha256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
            # the CSS range: the file's cmap — for Pi, the five characters it has always been given (see above)
            print(f'     unicode-range: {ranges(cmap & set(PI)) if part == "Pi" else ranges(cmap)}')
            print(f'     cmap: {ranges(cmap)}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
