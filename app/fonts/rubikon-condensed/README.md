# Rubikon Condensed — provenance

| | |
|---|---|
| What it is | IBM Plex Sans Condensed 3.000 (IBM Corp., designed by Mike Abbink with Bold Monday), **subset** to the characters the site sets and **renamed** |
| Why renamed | SIL Open Font License 1.1 with Reserved Font Name "Plex" (`OFL.txt`): a Modified Version — a subset is one — may not use that name. IBM's copyright and the licence notice are kept in every file; name ID 10 says what the font derives from |
| Decision | Owner, 20.11 (Weight audit: «Так, перейменуй») |
| Source | npm `@ibm/plex-sans-condensed@2.0.0`, `fonts/split/woff2` — the files the site served unmodified until 20.11 (PR #93) |
| Built with | `scripts/fonts/subset_rubikon_condensed.py`, fontTools 4.68.0 + brotli; a rerun gives byte-identical files |
| Kept | Outlines, metrics (ascent 1025, descent 275, UPM 1000), hinting, glyph names, every OpenType feature. Checked 20.11: every character the site sets, at 500/600/700 and 12/17/23 px, renders pixel-identical to IBM's files in Chromium and WebKit |

Sources (IBM, SHA-256):

| File | SHA-256 |
|---|---|
| `IBMPlexSansCondensed-Medium-Latin1.woff2` | `77566d36b1dea360fcdadfa87766cea062d917d73bf7e6e3f52ca4b35edf405d` |
| `IBMPlexSansCondensed-Medium-Cyrillic.woff2` | `6a0739f814f8a3ab6b5cfc9113febb19145334acc4be86c495ef634e6dac9e7f` |
| `IBMPlexSansCondensed-Medium-Pi.woff2` | `4b85cdb0b1a49bea41f308dbd79b586125cb20cd26f301218cf0b523c193fe22` |
| `IBMPlexSansCondensed-SemiBold-Latin1.woff2` | `6738b1096fd433204a070db0b4a9b1172ad3e6bdff8aad5f05f7351e7c157d06` |
| `IBMPlexSansCondensed-SemiBold-Cyrillic.woff2` | `1006be49232a8b1ebca9988943f44325224baf8bcdf8798c5058f06f1db8602d` |
| `IBMPlexSansCondensed-SemiBold-Pi.woff2` | `292c5f2071024516d1be3f66e4d959389786b0af66756a36ecabfae729c023db` |
| `IBMPlexSansCondensed-Bold-Latin1.woff2` | `765b0d6c8ef4a4feb02505474818e0fb9e44ce9ae206ef20dfe617de089f4b34` |
| `IBMPlexSansCondensed-Bold-Cyrillic.woff2` | `e4c7bc205549d9b5f8e57d943652d17cec9f85039525a34990e432f32740974d` |
| `IBMPlexSansCondensed-Bold-Pi.woff2` | `28b1592d56e5cd7779eca9ece73f6087484cab3ebefc36d6530fc6c4941dcd03` |

Files (unicode-range = the file's cmap, as in `../rubikon-condensed.css`):

| File | Bytes | SHA-256 |
|---|---:|---|
| `RubikonCondensed-Medium-Latin.woff2` | 16 736 | `5bc3bfc3b32d963b93e59ff6ac8432d551f258627225f4b2b2153ef678e38d56` |
| `RubikonCondensed-Medium-Cyrillic.woff2` | 13 120 | `3dc7fc0c8c934d0ebc70d5debab5f1baa4787359be4cd7dc8871e4fc2bd6fe8d` |
| `RubikonCondensed-Medium-Pi.woff2` | 3 172 | `d55ce96eb978cd3cabd65aed15553d32e975ae80723668d5c1369a2ea63d3e55` |
| `RubikonCondensed-SemiBold-Latin.woff2` | 16 612 | `3189f18ecc31522721aaa3a51ce70e904cdb291e5409fa18280e22c62234b250` |
| `RubikonCondensed-SemiBold-Cyrillic.woff2` | 13 160 | `77566a082bfd4c3b76a3a3b64160ed2b006be7c171ae754a6852b70b39732257` |
| `RubikonCondensed-SemiBold-Pi.woff2` | 3 164 | `4b8d59ec768167f26dbad013f13a8a731cbdca8946ed47d72b2c8e36ed33a8dc` |
| `RubikonCondensed-Bold-Latin.woff2` | 16 124 | `4b5949154f7b4cda231cccd4cc1810754589611d0dd12c89886ccdb46c1085cd` |
| `RubikonCondensed-Bold-Cyrillic.woff2` | 12 656 | `f2584179e293aae4a5ee1bd0cdc3c13f8f2de094113266c9123373ed65db1592` |
| `RubikonCondensed-Bold-Pi.woff2` | 3 132 | `4be9ec1a1d18b2dcb02424e6882b5260e1a49851a8d5128f4fc0e955e9bbc9db` |

- Latin: U+0020-007E, U+00A0, U+00A7, U+00A9, U+00AB, U+00AD, U+00B0-00B2, U+00B7, U+00BB, U+00D7, U+00E7, U+00E9, U+2013-2014, U+2018-201A, U+201C-201E, U+2022, U+2026, U+2039-203A, U+20AC, U+2122, U+2212
- Cyrillic: U+0400-045F, U+0490-0491
- Pi: U+2032-2033, U+2191, U+2193, U+2215 in the CSS; the file also keeps every other character the site uses that IBM's Pi file had (U+2081-2082, U+2116, U+2190-2199, U+21BA, U+221A, U+2248, U+2260, U+2264-2265, U+2713 …, as printed by the script): WebKit draws a character from a loaded face whose file has it even outside the face's unicode-range, so Safari took № ← → ↔ ↗ ↺ √ ≈ ≤ ≥ ✓ from IBM's Pi file, and keeps taking them from this one. Chromium follows the range, as before

When the site starts setting a character IBM's faces had and these do not, `tests/unit/rubikon-condensed-font.test.ts`
fails: run the script again on IBM's files (`git show 96aa2629:app/fonts/ibm-plex-sans-condensed/<file>` restores
them) and paste the printed ranges into the CSS.
