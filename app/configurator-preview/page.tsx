import { brandedTitle, createBasicPageMetadata } from '../lib/seo';
import { HangarConfigurator } from '../components/configurator/HangarConfigurator';
import './configurator.css';

// Isolated dev/review surface — same noindex treatment as /logo-variants (see robots.ts).
// Deliberately not linked from production navigation and not in sitemap.ts.
export const metadata = createBasicPageMetadata({
  title: brandedTitle('Конфігуратор ангара (POC)'),
  description: 'Внутрішній proof of concept живого конфігуратора ангара — не production-сторінка.',
  // its own canonical, not the layout's «/» (X-01 · PDO-29): a noindex page claimed to be the home page
  path: '/configurator-preview',
  robots: { index: false, follow: false },
});

export default function ConfiguratorPreviewPage() {
  return (
    <main id="main-content">
      <HangarConfigurator />
    </main>
  );
}
