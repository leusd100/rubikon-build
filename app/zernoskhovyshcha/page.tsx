import { DirectionPage } from '../components/DirectionDetail';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';

export const metadata = createDirectionMetadata('zernoskhovyshcha');

export default function GrainStoragePage() {
  return <DirectionPage config={getDirectionPage('zernoskhovyshcha')} />;
}
