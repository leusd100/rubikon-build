import { DirectionPage } from '../components/DirectionDetail';
import { HangarConfigurator } from '../components/configurator/HangarConfigurator';
import { HangarDecisionChapter } from '../components/configurator/HangarDecisionChapter';
import { createDirectionMetadata, getDirectionPage } from '../lib/directions';
import '../configurator-preview/configurator.css';
import './angary-editorial.css';

export const metadata = createDirectionMetadata('angary');

export default function HangarsPage() {
  const config = getDirectionPage('angary');

  return (
    <DirectionPage
      config={config}
      signatureExperience={<HangarConfigurator embedded />}
      technicalChapter={config.cost ? <HangarDecisionChapter items={config.cost.items} /> : null}
      hideCost
    />
  );
}
