import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../data/directionPages';

export const metadata = createDirectionMetadata('angary');

export default function HangarsPage() {
  return <DirectionPage config={getDirectionPage('angary')} />;
}
