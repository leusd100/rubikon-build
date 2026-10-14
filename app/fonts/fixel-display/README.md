# Fixel Display — provenance

| | |
|---|---|
| Family | Fixel Display, Regular (400), font version 1.000 |
| Designers | Kyrylo Tkachov, Marchela Mozhyna, Serhii Makarenko, Maria Weinstein, Zakhar Kryvoshyya (AlfaBravo) for MacPaw |
| Licence | SIL Open Font License 1.1, no Reserved Font Name — `OFL.txt` (© 2023 MacPaw Way Ltd.) |
| Source | https://github.com/macpaw/fixel — `fonts/webfonts/FixelDisplay-Regular.woff2`, git blob `0b3e2cd9d4d97e8700e393edb6b57476f6e7822b`, SHA-256 `88075e6d2dd0008c20ffd99477d3c95a33991713a9554131752b779cc458187a` |
| Built with | `scripts/fonts/subset_fixel_display.py`, fontTools 4.66.1 + brotli; a rerun gives byte-identical files |

| File | Bytes | SHA-256 | unicode-range (the file's cmap) |
|---|---:|---|---|
| `FixelDisplay-Regular-Latin.woff2` | 24 220 | `2e68c38bfa1c16e3695ac5766700a4cc646d864250759c1d858a2e7bb0504de3` | U+0000, U+000D, U+0020-007E, U+00A1-00AB, U+00AE-00B4, U+00B6-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2010, U+2013-2014, U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2032-2033, U+2039-203A, U+2044, U+20AC, U+2122, U+2190-2193, U+2212 (+ U+00A0 in the CSS) |
| `FixelDisplay-Regular-Cyrillic.woff2` | 11 472 | `e6c244d347a8f0e18fbb64e55d621e64198bc68fd87b3b0a61b64e49a6a163a3` | U+0401-040C, U+040E-044F, U+0451-045C, U+045E-045F, U+0490-0491, U+04B0-04B1, U+20B4, U+2116 |

OpenType layout features are kept. Not in the font, so not in the files: ʼ (U+02BC) and ↖ ↗ ↘ ↙ — they fall to the
metric fallback face (the platform sans at Fixel's size). The site writes the apostrophe as ’ (U+2019), which Fixel has.
