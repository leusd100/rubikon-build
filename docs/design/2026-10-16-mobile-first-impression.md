# Mobile first impression · H1 + P5 · 16 October 2026

Owner-selected direction after a standalone prototype review: A composition, a modest translucent phone header, H1 on HOME and P5 on About. All existing copy, contact routes and form behavior remain. This design approval does not authorize merge/deploy or a bulk visual-baseline update (DEC-18); Stage 01 HOLD is not lifted by this change.

## Media provenance

Both images were generated with the built-in ImageGen tool for this design exploration. H1 is an illustrative industrial hall; it is not a completed RUBIKON object. P5 depicts anonymous illustrative professionals; they are not portraits of Serhii or Dmytro. HOME retains the visible «Ілюстрація» label. About retains its existing decorative-media policy and actual team section; do not reuse P5 as a team portrait or project case.

The exact original masters and generation prompts are retained in the owner's research deliverables from this chat. They are deliberately not copied into the repository or public delivery:

- `h1-interior.png` · 1024×1536 PNG · SHA-256 `75450edae10d141f146920d3af7d6accd93c6616d209945dd07897f2194a44cf`
- `p5-shoulder-dialogue.png` · 1024×1536 PNG · SHA-256 `5baa5f24d5479aae5a6070c5516fb6429b65251ee38b6e45145ccb9ad7ad1c8d`

## Reproducing delivery files

`python3 scripts/generate-phone-hero-stills.py /path/to/h1-interior.png /path/to/p5-shoulder-dialogue.png`

Pillow exports full-frame WebP at quality 78, method 6; no retouch or crop. 480/768/1024 widths preserve 2:3. Output budgets: 70/120/170 KB. Actual bytes:

| Width | HOME H1 | About P5 |
|---|---:|---:|
| 480 | 41,502 | 27,820 |
| 768 | 89,128 | 50,878 |
| 1024 | 140,186 | 73,792 |

These are file sizes, not a measured LCP improvement. Desktop/tablet montage clips are unchanged. Responsive SSR picture/preload and hydrated phone img select the same set; About keeps its 600px static boundary and HOME keeps 760px.
