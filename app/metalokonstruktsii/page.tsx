import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../data/directionPages';

export const metadata = createDirectionMetadata('metalokonstruktsii');

export default function SteelPage() {
  return <DirectionPage config={getDirectionPage('metalokonstruktsii')} />;
}
