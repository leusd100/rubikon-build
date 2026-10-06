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
import type { ProcessSplit } from '../types/directionPage';
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
      // «Ви · Ми» (owner, 06.10, as on the other direction pages): the Delivery Model's steps say what we do (word for word);
      // the page adds what you do at each and what you get after it, with its small drawing
      steps: processSteps().map(({ title, text }) => ({ title, text })),
      sides: [
        { you: 'Розповідаєте, що потрібно, де об’єкт і що вже підготовлено.', result: 'Задача й список даних', drawing: 'checklist' },
        { you: 'Надаєте креслення або параметри об’єкта.', result: 'Основа для пропозиції', drawing: 'metal-project' },
        { you: 'Погоджуєте пропозицію й підписуєте договір.', result: 'Пропозиція, кошторис і договір', drawing: 'contract' },
        { you: 'Приймаєте роботи й підписуєте акти.', result: 'Прийняті роботи й акти', drawing: 'hangar-built' },
      ] satisfies ProcessSplit[],
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
