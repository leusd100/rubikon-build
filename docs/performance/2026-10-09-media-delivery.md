# HOME image sizing and MP4 byte ranges — 2026-10-09

Base: `0af3ed2b58ec99ecaaea8a96bc2f550bbb29c145` (main). Verified in an isolated checkout; no production deployment or form submission.

## HOME cards: source density must include cover cropping

The phone rail uses 4:5 cards, 84% of `(viewport - 32px)`; at <=340px it uses 88%. Its previous `sizes=100vw` does not describe this layout. The hangar artwork is 4:5, but the other four sources are 3:2. With `object-fit:cover`, those landscape sources must scale to 1.875 times the card's width before cropping.

At 390px/DPR2 the hangar needs about 602 physical pixels (768w is sufficient); the landscape sources need about 1128px (keep 1200w). Setting every source to the card's box width would save more bytes by reducing detail, so that variant was rejected. Desktop/tablet sizes, original files, quality, layout and crop positions are unchanged.

Local Lighthouse 13.5 / Chrome 154, cold cache, same Node production server and 390x844/DPR2 simulated mobile profile:

| Five card transfers | Before | After | Difference |
|---|---:|---:|---:|
| Bytes including response headers | 370244 | 328224 | -42020 (-11.35%) |
| Hangar source | 1200w | 768w | |
| Other four sources | 1200w | 1200w | |

Source-selection checks also cover 320/DPR2, 360/DPR2, 390/DPR1, 390/DPR3, 768/DPR2 and 1440/DPR2 (provided throttling; these are not score comparisons). On 320/360 DPR2, the landscape sources increase from 768w to 1200w to preserve detail after cropping. Existing 1200w maximum remains the limit at high DPR. No production LCP or PSI score improvement is claimed from this below-fold change.

## MP4 delivery: return the requested bytes

Production and the unmodified local Cloudflare preview returned HTTP 200 and all 674061 bytes for `Range: bytes=0-1` on `/media/about/straight-line-14377591-v2.mp4`. Forwarding the original Request to ASSETS alone reproduced this. The ASSETS response stream does not expose Content-Length inside the Worker, even though the wire response has it.

MP4 paths now enter the Worker before static asset delivery. A Vite virtual module reads exact file lengths from `public/media/**/*.mp4` at build time. It contains only paths and lengths, is imported only by the Worker, and automatically updates when files change. No video data is bundled into JS.

The adapter supports single bounded, open-ended and suffix ranges with exact 206 bodies and Content-Range. Unsatisfiable ranges return 416/no-store. Malformed or multipart ranges are ignored with a complete 200 response. If-Range requires a matching strong ETag or exact known Last-Modified date. Native 206/304/errors and encoded or size-mismatched responses pass through. Ordinary GET stays streamed, HEAD has no body, and the existing one-week media cache policy is retained (MP4 filenames are not immutable hashes).

Only the requested range is buffered and the remaining stream is cancelled. A large requested range still buffers that range; re-evaluate Worker memory/CPU if video sizes or request concurrency grow. This is a compatibility/transfer correction, not evidence of a reproduced real-device Safari playback failure.

## Validation

- Full unit suite: 78 files, 1266 tests passed, including range semantics, chunk boundaries, cancellation, truncation, native status/conditional preservation and generated metadata replacement.
- Full lint, typecheck and production build passed.
- Cloudflare local Worker preview: 33 HTTP GET/HEAD checks. All 16 MP4s returned 206 and exactly two bytes for 0-1 probes. Middle/suffix/open-ended/clamped ranges match the source bytes. Full GET SHA256 matches the original file. HEAD length, If-Range match/mismatch, If-None-Match 304, 416, malformed/multipart fallbacks, missing asset 404, poster and HTML routes were checked.
- Browser: card dimensions/source choices at 320/360/390px; rail dot navigation reaches 03/05; Light/Dark; desktop hero video has decoded frames and plays without a media error.
- Not verified: real iPhone/iOS Safari, deployed edge behavior or edge CPU, and production before/after CWV. These remain release verification gates. No real lead was submitted.

Local reproduction (two separate terminals, no publish command):

```sh
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 4190
```

```sh
curl -sS -D /tmp/rubikon-range-headers.txt -H 'Range: bytes=0-1' \
  http://127.0.0.1:4190/media/about/straight-line-14377591-v2.mp4 \
  -o /tmp/rubikon-range-body.bin
wc -c /tmp/rubikon-range-body.bin
```

Expect 206, `Content-Range: bytes 0-1/674061`, Content-Length 2, and exactly two bytes. Repeat the same requests and actual playback on an approved deployed preview before production release. For image selection, use a fresh browser/cache; a previously selected larger srcset candidate can remain cached.

Rollback: revert the sizing change independently, or revert the MP4 routing/plugin/adapter together. Do not remove the existing immutable-asset cache adapter. No configurator, X-Ray, consent, analytics, SEO, claims, media assets or deployment workflow changes are part of this patch.

References: [RFC 9110: Range](https://www.rfc-editor.org/rfc/rfc9110.html#section-14.2), [If-Range](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.5), [Cloudflare Response body lengths](https://developers.cloudflare.com/workers/runtime-apis/response/).
