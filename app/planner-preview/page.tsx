import { GrainPlannerPage } from '../components/grain-planner/GrainPlannerPage';
import { createBasicPageMetadata } from '../lib/seo';
import '../zernoskhovyshcha/grain-planner.css';
import '../zernoskhovyshcha/grain-editorial.css';

// Isolated review surface for the Grain Planner integration — same noindex treatment as
// /configurator-preview (see robots.ts). Not in the sitemap. It renders the same composition as
// /zernoskhovyshcha, independently of releaseFlags.grainPlannerOnZernoskhovyshcha.
export const metadata = createBasicPageMetadata({
  title: 'Зерновий планувальник — перегляд інтеграції | RUBIKON BUILD',
  description: 'Внутрішня сторінка перегляду інтеграції Зернового планувальника в напрямок зерносховищ.',
  path: '/planner-preview',
  robots: { index: false, follow: false },
});

export default function PlannerPreviewPage() {
  return <GrainPlannerPage />;
}
