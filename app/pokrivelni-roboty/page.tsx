import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../data/directionPages';

export const metadata = createDirectionMetadata('pokrivelni-roboty');

export default function RoofingWorksPage() {
  return <DirectionPage config={getDirectionPage('pokrivelni-roboty')} />;
}
