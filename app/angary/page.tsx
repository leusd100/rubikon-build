import { DirectionPage } from '../components/DirectionDetail';
import { HangarEditorialArchitecture } from '../components/angary/HangarEditorialArchitecture';
import { HangarMobileInquiryCta } from '../components/angary/HangarMobileInquiryCta';
import { HangarRealObject } from '../components/angary/HangarRealObject';
import { HangarConfigurator } from '../components/configurator/HangarConfigurator';
import { HangarInquiryProvider } from '../components/configurator/HangarInquiryContext';
import { InquiryAttachmentProvider } from '../components/inquiry/InquiryAttachmentProvider';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import { costFactors, processSteps } from '../lib/deliveryModelPresentation';
import { deliveryModel } from '../data/deliveryModel';
import { homeProofCase } from '../data/homeProof';
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
      leadCta: deliveryModel.contactRoles.constructionLead.cta,
    },
    people: leadership,
  };

  return (
    <InquiryAttachmentProvider>
      <HangarInquiryProvider>
        <DirectionPage
          config={config}
          signatureExperience={<HangarConfigurator embedded />}
          editorialArchitecture={(
            <HangarEditorialArchitecture
              content={editorial}
              // HOME's one approved real hangar (owner, 03.10), after the frame tour; nothing while there is no record
              realObject={homeProofCase && <HangarRealObject proof={homeProofCase} />}
            />
          )}
        />
        <HangarMobileInquiryCta />
      </HangarInquiryProvider>
    </InquiryAttachmentProvider>
  );
}
