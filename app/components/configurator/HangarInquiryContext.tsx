'use client';

import { createContext, useCallback, useContext, useMemo, useReducer, type ReactNode } from 'react';
import {
  INITIAL_HANGAR_ATTACHMENT,
  sameBusinessConfiguration,
  transitionHangarAttachment,
  type HangarAttachmentState,
} from '../../lib/configurator/attachmentContract';
import { createHangarAttachment } from '../../lib/configurator/hangarAttachment';
import { useInquiryAttachmentSource } from '../inquiry/InquiryAttachmentProvider';
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
  presentationAnnouncement: string;
  updateBusinessConfiguration: (state: ConfiguratorState) => void;
  attachConfiguration: () => void;
  detachConfiguration: () => void;
  togglePresentationDemo: (kind: HangarPresentationDemoKind) => void;
  endPresentationDemo: () => void;
};

const HangarInquiryContext = createContext<HangarInquiryContextValue | null>(null);

type HangarInquiryState = {
  configuration: ConfiguratorState;
  attachment: HangarAttachmentState;
  presentationDemo: HangarPresentationDemo | null;
  presentationAnnouncement: string;
};

type HangarInquiryAction =
  | { type: 'business-edit'; configuration: ConfiguratorState }
  | { type: 'explicit-attach' }
  | { type: 'explicit-detach' }
  | { type: 'toggle-presentation'; kind: HangarPresentationDemoKind }
  | { type: 'end-presentation' };

const INITIAL_HANGAR_INQUIRY_STATE: HangarInquiryState = {
  configuration: DEFAULT_CONFIGURATOR_STATE,
  attachment: INITIAL_HANGAR_ATTACHMENT,
  presentationDemo: null,
  presentationAnnouncement: '',
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
      presentationAnnouncement: current.presentationDemo
        ? 'Показ завершено. Застосовано нові параметри.'
        : current.presentationAnnouncement,
    };
  }

  if (action.type === 'toggle-presentation') {
    if (current.presentationDemo?.kind === action.kind) {
      return {
        ...current,
        attachment: transitionHangarAttachment(current.attachment, { type: 'presentation-only' }),
        presentationDemo: null,
        presentationAnnouncement: 'Повернуто ваш варіант.',
      };
    }
    const presentationDemo = createHangarPresentationDemo(action.kind, current.configuration);
    return {
      ...current,
      attachment: transitionHangarAttachment(current.attachment, { type: 'presentation-only' }),
      presentationDemo,
      presentationAnnouncement: `${presentationDemo.label}. Ваш вибір не змінено.`,
    };
  }

  if (action.type === 'end-presentation') {
    if (!current.presentationDemo) return current;
    return {
      ...current,
      attachment: transitionHangarAttachment(current.attachment, { type: 'presentation-only' }),
      presentationDemo: null,
      presentationAnnouncement: 'Повернуто ваш варіант.',
    };
  }

  return {
    ...current,
    attachment: transitionHangarAttachment(current.attachment, {
      type: action.type,
    }),
  };
}

/**
 * Owns the hangar configuration, its attachment state and the presentation demo. The attachment is
 * also published to the page's shared InquiryAttachmentProvider, which is what the form reads.
 */
export function HangarInquiryProvider({ children }: { children: ReactNode }) {
  const [model, dispatch] = useReducer(reduceHangarInquiry, INITIAL_HANGAR_INQUIRY_STATE);
  const detachConfiguration = useCallback(() => dispatch({ type: 'explicit-detach' }), []);
  const value = useMemo(
    () => ({
      state: model.configuration,
      attachment: model.attachment,
      isAttached: model.attachment.status === 'attached',
      presentationDemo: model.presentationDemo,
      presentationAnnouncement: model.presentationAnnouncement,
      updateBusinessConfiguration: (configuration: ConfiguratorState) => {
        dispatch({ type: 'business-edit', configuration });
      },
      attachConfiguration: () => dispatch({ type: 'explicit-attach' }),
      detachConfiguration,
      togglePresentationDemo: (kind: HangarPresentationDemoKind) => {
        dispatch({ type: 'toggle-presentation', kind });
      },
      endPresentationDemo: () => dispatch({ type: 'end-presentation' }),
    }),
    [model, detachConfiguration],
  );

  // The brief is built only while attached, as the form did before; the demo never reaches it
  // because it lives outside model.configuration.
  const isAttached = model.attachment.status === 'attached';
  const attachment = useMemo(
    () => (isAttached ? createHangarAttachment(model.configuration) : null),
    [isAttached, model.configuration],
  );
  const source = useMemo(
    () => ({ attachment, status: model.attachment, detach: detachConfiguration }),
    [attachment, model.attachment, detachConfiguration],
  );
  useInquiryAttachmentSource(source);

  return <HangarInquiryContext.Provider value={value}>{children}</HangarInquiryContext.Provider>;
}

export function useHangarInquiryContext() {
  return useContext(HangarInquiryContext);
}
