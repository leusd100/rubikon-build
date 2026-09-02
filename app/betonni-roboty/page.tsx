import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';

export const metadata = createDirectionMetadata('betonni-roboty');

export default function ConcreteWorksPage() {
  return <DirectionPage config={getDirectionPage('betonni-roboty')} />;
}
