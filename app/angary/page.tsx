import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';

export const metadata = createDirectionMetadata('angary');

export default function HangarsPage() {
  return <DirectionPage config={getDirectionPage('angary')} />;
}
