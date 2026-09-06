'use client';

import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  INITIAL_HANGAR_ATTACHMENT,
  sameBusinessConfiguration,
  transitionHangarAttachment,
  type HangarAttachmentState,
} from '../../lib/configurator/attachmentContract';
import { DEFAULT_CONFIGURATOR_STATE, type ConfiguratorState } from '../../lib/configurator/types';

type HangarInquiryContextValue = {
  state: ConfiguratorState;
  attachment: HangarAttachmentState;
  isAttached: boolean;
  updateBusinessConfiguration: (state: ConfiguratorState) => void;
  attachConfiguration: () => void;
  detachConfiguration: () => void;
};

const HangarInquiryContext = createContext<HangarInquiryContextValue | null>(null);

type HangarInquiryState = {
  configuration: ConfiguratorState;
  attachment: HangarAttachmentState;
};

type HangarInquiryAction =
  | { type: 'business-edit'; configuration: ConfiguratorState }
  | { type: 'explicit-attach' }
  | { type: 'explicit-detach' };

const INITIAL_HANGAR_INQUIRY_STATE: HangarInquiryState = {
  configuration: DEFAULT_CONFIGURATOR_STATE,
  attachment: INITIAL_HANGAR_ATTACHMENT,
};

function reduceHangarInquiry(current: HangarInquiryState, action: HangarInquiryAction): HangarInquiryState {
  if (action.type === 'business-edit') {
    // Numeric fields commit on blur as well as while typing. Merely focusing and leaving an
    // unchanged default must not count as intent, so identical commits are true no-ops.
    if (sameBusinessConfiguration(current.configuration, action.configuration)) return current;
    return {
      configuration: action.configuration,
      attachment: transitionHangarAttachment(current.attachment, { type: 'business-edit' }),
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
      updateBusinessConfiguration: (configuration: ConfiguratorState) => {
        dispatch({ type: 'business-edit', configuration });
      },
      attachConfiguration: () => dispatch({ type: 'explicit-attach' }),
      detachConfiguration: () => dispatch({ type: 'explicit-detach' }),
    }),
    [model],
  );

  return <HangarInquiryContext.Provider value={value}>{children}</HangarInquiryContext.Provider>;
}

export function useHangarInquiryContext() {
  return useContext(HangarInquiryContext);
}
