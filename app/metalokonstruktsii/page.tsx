import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';

export const metadata = createDirectionMetadata('metalokonstruktsii');

export default function SteelPage() {
  return <DirectionPage config={getDirectionPage('metalokonstruktsii')} />;
}
