import { brandedTitle, createBasicPageMetadata } from '../lib/seo';
import { R3fHangarSpike } from '../components/r3f-spike/R3fHangarSpike';
import './r3f-spike.css';

// Isolated dev/review surface, same noindex treatment as /logo-variants and
// /configurator-preview (see robots.ts). Explicitly not the production configurator — this
// exists to compare renderer approaches on a shared SceneModel, per
// docs/renderer-foundation-spike.md.
export const metadata = createBasicPageMetadata({
  title: brandedTitle('R3F Renderer Spike'),
  description: 'Внутрішній порівняльний spike: той самий SceneModel, рендерений через Three.js/React Three Fiber замість SVG.',
  // its own canonical, not the layout's «/» (X-01 · PDO-29): a noindex page claimed to be the home page
  path: '/r3f-spike',
  robots: { index: false, follow: false },
});

export default function R3fSpikePage() {
  return (
    <main id="main-content">
      <R3fHangarSpike />
    </main>
  );
}
