import { DirectionPage } from '../components/DirectionDetail';
import { HangarEditorialArchitecture } from '../components/angary/HangarEditorialArchitecture';
import { HangarMobileInquiryCta } from '../components/angary/HangarMobileInquiryCta';
import { HangarRealObject } from '../components/angary/HangarRealObject';
import { HangarConfigurator } from '../components/configurator/HangarConfigurator';
import { HangarInquiryProvider } from '../components/configurator/HangarInquiryContext';
import { InquiryAttachmentProvider } from '../components/inquiry/InquiryAttachmentProvider';
import { InquiryFormHost } from '../components/inquiry/InquiryFormHost';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import { costFactors, processSteps } from '../lib/deliveryModelPresentation';
import { deliveryModel } from '../data/deliveryModel';
import { homeProofCase } from '../data/homeProof';
import { leadership } from '../data/people';
import type { ProcessSplit } from '../types/directionPage';
import '../configurator-preview/configurator.css';
import './angary-editorial.css';

export const metadata = createDirectionMetadata('angary');

// What each cost factor covers on /angary (owner 24.10, W2-01 · PDO-12 A), in words the page already says: the
// configurator's sizes, frame, cladding and gates and its note on the foundation, and the Delivery Model's names. The
// shared costFactors() (also on /yak) keeps its own detail — here only «Умови майданчика», which has no entry.
const COST_FACTOR_DETAILS: Readonly<Record<string, string>> = {
  dimensions: 'довжина, ширина, висота стін і в конику',
  structure: 'проліт без колон чи з рядом колон, сніг, вітер, кран-балка',
  foundation: 'визначає проєктувальник після розрахунку навантажень і з урахуванням умов майданчика',
  insulation: 'профнастил чи сендвіч-панель для стін і покрівлі',
  technology: 'ворота, двері, спеціалізоване обладнання',
  timeline: 'строки, залежності між підрядниками',
};

export default function HangarsPage() {
  const config = getDirectionPage('angary');
  // Resolved here, on the server: the client sections get the Delivery Model's words as plain strings
  const editorial = {
    cost: {
      title: config.cost?.title ?? '',
      text: config.cost?.text ?? '',
      factors: costFactors().map((factor) => ({ key: factor.ids[0], title: factor.title, detail: COST_FACTOR_DETAILS[factor.ids[0]] ?? factor.detail })),
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
      {/* «Обговорити цю конфігурацію» opens the page's one form under the configurator's stamp (Phase 4) */}
      <InquiryFormHost>
      <HangarInquiryProvider>
        <DirectionPage
          config={config}
          // «Що далі» under the configurator's last step: the route's first three steps, up to the estimate (10.10, owner)
          signatureExperience={<HangarConfigurator embedded nextSteps={editorial.route.steps.slice(0, 3).map((step) => step.title)} />}
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
      </InquiryFormHost>
    </InquiryAttachmentProvider>
  );
}
