# Rubikon Condensed — provenance

| | |
|---|---|
| What it is | IBM Plex Sans Condensed 3.000 (IBM Corp., designed by Mike Abbink with Bold Monday), **subset** to the characters the site sets and **renamed** |
| Why renamed | SIL Open Font License 1.1 with Reserved Font Name "Plex" (`OFL.txt`): a Modified Version — a subset is one — may not use that name. IBM's copyright and the licence notice are kept in every file; name ID 10 says what the font derives from |
| Decision | Owner, 20.11 (Weight audit: «Так, перейменуй») |
| Source | npm `@ibm/plex-sans-condensed@2.0.0`, `fonts/split/woff2` — the files the site served unmodified until 20.11 (PR #93) |
| Built with | `scripts/fonts/subset_rubikon_condensed.py`, fontTools 4.68.0 + brotli 1.2.1 (the WOFF2 bytes depend on both); a rerun gives byte-identical files |
| Kept | Outlines, metrics (ascent 1025, descent 275, UPM 1000), hinting, glyph names, every OpenType feature. Only Windows name records. Checked 20.11: every character the site sets, at 500/600/700 and 12/17/23 px, renders pixel-identical to IBM's files in Chromium and WebKit |

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
| `RubikonCondensed-Medium-Latin.woff2` | 16 652 | `730a9e789774d5f65ec5300452da9c058a50e596110c148a749d38a66fddf1fd` |
| `RubikonCondensed-Medium-Cyrillic.woff2` | 12 992 | `4db50a93a3028573920dcdcbe6499d23c711cc4a854d680f5500b27f67685fd0` |
| `RubikonCondensed-Medium-Pi.woff2` | 1 776 | `9db819cd5e34927bd3b28b91d0b3535baba36f67967a8e09cc3c79af23a3637c` |
| `RubikonCondensed-SemiBold-Latin.woff2` | 16 556 | `fb0b093a34fedfbc72d2ceba81eccbe805a8bcedd420448ad637837e5b50ab3a` |
| `RubikonCondensed-SemiBold-Cyrillic.woff2` | 12 972 | `0ad6971aa148b17e58fb0b8fa0fb1e81b805ee8a950a51bc7806914b8f38029e` |
| `RubikonCondensed-SemiBold-Pi.woff2` | 1 804 | `e7c1ce4edadf294bf682f6f5f59aca7385043d9018d31e91c9ec72e8356d2f28` |
| `RubikonCondensed-Bold-Latin.woff2` | 16 144 | `6259d7b78a1b24a942939167db51ab46b90b4e55461a92fe1c94befe2d835baa` |
| `RubikonCondensed-Bold-Cyrillic.woff2` | 12 484 | `f40c56f66a9d1e57f706933934edd39fe703381b36e567be1e205e14a35bc7ba` |
| `RubikonCondensed-Bold-Pi.woff2` | 1 780 | `dbeea4dfc479f96f62a2104f8fbd23a0cea61c75725532e8cf3b8c695c94516a` |

- Latin: U+0020-007E, U+00A0, U+00A7, U+00A9, U+00AB, U+00AD, U+00B0-00B2, U+00B7, U+00BB, U+00C7, U+00C9, U+00D7, U+00E7, U+00E9, U+2013-2014, U+2018-201A, U+201C-201E, U+2022, U+2026, U+2039-203A, U+20AC, U+2122, U+2212
- Cyrillic: U+0400-045F, U+0490-0491
- Pi: U+2032-2033, U+2191, U+2193, U+2215 — as since PR #93; the site's other arrows and signs (→ ≈ № …) fall to the fallback face, with IBM's files as with these (measured on production and on this build, Chromium and WebKit, 20.11)

When the site starts setting a character IBM's faces had and these do not, `tests/unit/rubikon-condensed-font.test.ts`
fails: run the script again on IBM's files (`git show 96aa2629:app/fonts/ibm-plex-sans-condensed/<file>` restores
them) and paste the printed ranges into the CSS.
