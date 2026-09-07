'use client';

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  INITIAL_HANGAR_ATTACHMENT,
  sameBusinessConfiguration,
  transitionHangarAttachment,
  type HangarAttachmentState,
} from '../../lib/configurator/attachmentContract';
import {
  createHangarPresentationDemo,
  type HangarPresentationDemo,
  type HangarPresentationDemoKind,
} from '../../lib/configurator/presentationDemo';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';

type HangarInquiryContextValue = {
  state: ConfiguratorState;
  attachment: HangarAttachmentState;
  isAttached: boolean;
  presentationDemo: HangarPresentationDemo | null;
  updateBusinessConfiguration: (state: ConfiguratorState) => void;
  attachConfiguration: () => void;
  detachConfiguration: () => void;
  startPresentationDemo: (kind: HangarPresentationDemoKind) => void;
  endPresentationDemo: () => void;
};

const HangarInquiryContext = createContext<HangarInquiryContextValue | null>(null);

type HangarInquiryState = {
  configuration: ConfiguratorState;
  attachment: HangarAttachmentState;
  presentationDemo: HangarPresentationDemo | null;
};

type HangarInquiryAction =
  | { type: 'business-edit'; configuration: ConfiguratorState }
  | { type: 'explicit-attach' }
  | { type: 'explicit-detach' }
  | { type: 'start-presentation'; kind: HangarPresentationDemoKind }
  | { type: 'end-presentation' };

const INITIAL_HANGAR_INQUIRY_STATE: HangarInquiryState = {
  configuration: DEFAULT_CONFIGURATOR_STATE,
  attachment: INITIAL_HANGAR_ATTACHMENT,
  presentationDemo: null,
};

function reduceHangarInquiry(current: HangarInquiryState, action: HangarInquiryAction): HangarInquiryState {
  if (action.type === 'business-edit') {
    // Numeric fields commit on blur as well as while typing. Merely focusing and leaving an
    // unchanged default must not count as intent, so identical commits are true no-ops.
    if (sameBusinessConfiguration(current.configuration, action.configuration)) return current;
    return {
      configuration: action.configuration,
      attachment: transitionHangarAttachment(current.attachment, { type: 'business-edit' }),
      presentationDemo: null,
    };
  }

  if (action.type === 'start-presentation') {
    return {
      ...current,
      attachment: transitionHangarAttachment(current.attachment, { type: 'presentation-only' }),
      presentationDemo: createHangarPresentationDemo(action.kind, current.configuration),
    };
  }

  if (action.type === 'end-presentation') {
    if (!current.presentationDemo) return current;
    return {
      ...current,
      attachment: transitionHangarAttachment(current.attachment, { type: 'presentation-only' }),
      presentationDemo: null,
    };
  }

  return {
    ...current,
    attachment: transitionHangarAttachment(current.attachment, {
      type: action.type,
    }),
  };
}

export function HangarInquiryProvider({ children }: { children: ReactNode }) {
  const [model, dispatch] = useReducer(reduceHangarInquiry, INITIAL_HANGAR_INQUIRY_STATE);
  const value = useMemo(
    () => ({
      state: model.configuration,
      attachment: model.attachment,
      isAttached: model.attachment.status === 'attached',
      presentationDemo: model.presentationDemo,
      updateBusinessConfiguration: (configuration: ConfiguratorState) => {
        dispatch({ type: 'business-edit', configuration });
      },
      attachConfiguration: () => dispatch({ type: 'explicit-attach' }),
      detachConfiguration: () => dispatch({ type: 'explicit-detach' }),
      startPresentationDemo: (kind: HangarPresentationDemoKind) => {
        dispatch({ type: 'start-presentation', kind });
      },
      endPresentationDemo: () => dispatch({ type: 'end-presentation' }),
    }),
    [model],
  );

  return <HangarInquiryContext.Provider value={value}>{children}</HangarInquiryContext.Provider>;
}

export function useHangarInquiryContext() {
  return useContext(HangarInquiryContext);
}
