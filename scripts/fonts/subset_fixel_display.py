"""Builds the two self-hosted Fixel Display subsets from MacPaw's published WOFF2.

Fixel Display 1.000 (MacPaw Way Ltd., SIL OFL 1.1, no Reserved Font Name), github.com/macpaw/fixel,
fonts/webfonts/FixelDisplay-Regular.woff2. OFL allows subsetting and keeping the family name.

    python3 scripts/fonts/subset_fixel_display.py <FixelDisplay-Regular.woff2> app/fonts/fixel-display

Writes FixelDisplay-Regular-Latin.woff2 and FixelDisplay-Regular-Cyrillic.woff2 and prints, for each, the
unicode-range of what the file really contains (its cmap), to paste into app/fonts/fixel-display.css. The requested
ranges follow Google's latin / cyrillic subsets of Jost, the face this one replaces, plus ₴ and the arrows the
site sets; characters the font does not have (ʼ U+02BC, ↖ ↗ ↘ ↙) simply stay out of the file and the range, and
fall to the next face in the stack. OpenType features (kern, case, tnum, locl …) are kept.
Needs fontTools with brotli (pip install fonttools brotli); built with fontTools 4.66.1.
"""
import hashlib
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

SUBSETS = {
    'Latin': 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,'
             'U+2000-206F,U+20AC,U+2122,U+2190-2199,U+2212,U+2215,U+FEFF,U+FFFD',
    'Cyrillic': 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+20B4,U+2116',
}


def ranges(codepoints):
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


def main(source, out_dir):
    out_dir = Path(out_dir)
    print(f'source {source} sha256 {hashlib.sha256(Path(source).read_bytes()).hexdigest()}')
    for name, unicodes in SUBSETS.items():
        options = subset.Options()
        options.flavor = 'woff2'
        options.layout_features = ['*']
        options.name_IDs = ['*']
        options.name_languages = ['*']
        options.notdef_outline = True
        options.glyph_names = False
        font = subset.load_font(source, options)
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=subset.parse_unicodes(unicodes))
        subsetter.subset(font)
        target = out_dir / f'FixelDisplay-Regular-{name}.woff2'
        subset.save_font(font, str(target), options)
        cmap = set(TTFont(str(target)).getBestCmap())
        print(f'{target.name}: {target.stat().st_size} bytes, sha256 {hashlib.sha256(target.read_bytes()).hexdigest()}')
        print(f'  unicode-range: {ranges(cmap)}')


if __name__ == '__main__':
    main(*sys.argv[1:3])
