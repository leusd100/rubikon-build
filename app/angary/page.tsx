import { DirectionPage } from '../components/DirectionDetail';
import { HangarEditorialArchitecture } from '../components/angary/HangarEditorialArchitecture';
import { HangarMobileInquiryCta } from '../components/angary/HangarMobileInquiryCta';
import { HangarConfigurator } from '../components/configurator/HangarConfigurator';
import { HangarInquiryProvider } from '../components/configurator/HangarInquiryContext';
import { InquiryAttachmentProvider } from '../components/inquiry/InquiryAttachmentProvider';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import { costFactors, processSteps } from '../lib/deliveryModelPresentation';
import { deliveryModel } from '../data/deliveryModel';
import { leadership } from '../data/people';
import '../configurator-preview/configurator.css';
import './angary-editorial.css';

export const metadata = createDirectionMetadata('angary');

export default function HangarsPage() {
  const config = getDirectionPage('angary');
  // Resolved here, on the server: the client sections get the Delivery Model's words as plain strings
  const editorial = {
    cost: {
      title: config.cost?.title ?? '',
      text: config.cost?.text ?? '',
      factors: costFactors().map((factor) => ({ key: factor.ids[0], title: factor.title, detail: factor.detail })),
      customerScope: deliveryModel.statements.customerScope,
    },
    route: {
      steps: processSteps().map(({ title, result }) => ({ title, result })),
      boundary: deliveryModel.statements.boundary,
    },
    people: leadership,
  };

  return (
    <InquiryAttachmentProvider>
      <HangarInquiryProvider>
        <DirectionPage
          config={config}
          signatureExperience={<HangarConfigurator embedded />}
          editorialArchitecture={<HangarEditorialArchitecture content={editorial} />}
        />
        <HangarMobileInquiryCta />
      </HangarInquiryProvider>
    </InquiryAttachmentProvider>
  );
}
