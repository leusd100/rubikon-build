# Directions hero artwork · 2026-10-13

Ten original AI-generated architectural illustrations for the five-slide `/napryamky` hero. These are conceptual scenes, not photographs of RUBIKON projects. The page retains its “Ілюстрація” label.

- `daylight/`: bright, restrained architectural photography for the light site theme.
- `blue-hour/`: blue-hour industrial scenes with credible practical lighting for the dark site theme.
- The five subjects in each set are hangars, grain storage, steel structures, concrete works and roofing, in carousel order.
- Each source is 1881 × 836 px. Source PNGs stay here; the site serves content-hashed WebP files from `public/media-responsive` at widths 480, 768, 1200, 1536 and 1881, plus dedicated portrait crops at widths 320, 480 and 627. New WebPs use quality 90 and preserve the native-size source as the largest candidate.
- The compositions reserve the left side for hero copy. The built-in theme control chooses the matching image set; both theme choices use the same five-slide timing and captions.

Generation brief: original, photoreal industrial architecture; physically plausible structures and materials; panoramic 2.25:1 frame; camera far enough back to show the primary building; generous edge margins and calm left-side space for copy; no embedded typography, logos, people, watermarks or project claims. Daylight uses soft overcast light and restrained warmth. Blue-hour uses cobalt sky and warm site lighting.

Regenerate responsive assets with `python3 scripts/generate-direction-hero-images.py --only directions-sequence-daylight` and `--only directions-sequence-blue-hour`, then update the hashes in `app/data/directionsHeroSequenceManifest.ts` if the sources change.
