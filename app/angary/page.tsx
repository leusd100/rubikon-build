import { DirectionPage } from '../components/DirectionDetail';
import { HangarEditorialArchitecture } from '../components/angary/HangarEditorialArchitecture';
import { HangarConfigurator } from '../components/configurator/HangarConfigurator';
import { HangarInquiryProvider } from '../components/configurator/HangarInquiryContext';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import '../configurator-preview/configurator.css';
import './angary-editorial.css';

export const metadata = createDirectionMetadata('angary');

export default function HangarsPage() {
  const config = getDirectionPage('angary');

  return (
    <HangarInquiryProvider>
      <DirectionPage
        config={config}
        signatureExperience={<HangarConfigurator embedded />}
        editorialArchitecture={<HangarEditorialArchitecture />}
      />
    </HangarInquiryProvider>
  );
}
