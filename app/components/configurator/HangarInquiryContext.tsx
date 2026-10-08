'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import {
  INITIAL_HANGAR_ATTACHMENT,
  sameBusinessConfiguration,
  transitionHangarAttachment,
  type HangarAttachmentState,
} from '../../lib/configurator/attachmentContract';
import { CONTROL_STEPS } from '../../lib/configurator/controlGroups';
import { clearDraft, readDraft, saveDraft } from '../../lib/configurator/draft';
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
  /** The configurator's open step (CONTROL_STEPS), kept with the draft */
  step: number;
  setStep: (step: number) => void;
  /** The draft was read back from this browser (07.10): the configurator offers to start again */
  restored: boolean;
  /** Back to the page's example, the draft forgotten */
  startOver: () => void;
};

const HangarInquiryContext = createContext<HangarInquiryContextValue | null>(null);

type HangarInquiryState = {
  configuration: ConfiguratorState;
  attachment: HangarAttachmentState;
  presentationDemo: HangarPresentationDemo | null;
  presentationAnnouncement: string;
  step: number;
  restored: boolean;
};

type HangarInquiryAction =
  | { type: 'business-edit'; configuration: ConfiguratorState }
  | { type: 'explicit-attach' }
  | { type: 'explicit-detach' }
  | { type: 'toggle-presentation'; kind: HangarPresentationDemoKind }
  | { type: 'end-presentation' }
  | { type: 'step'; step: number }
  | { type: 'restore'; configuration: ConfiguratorState; attached: boolean; step: number }
  | { type: 'start-over' };

const INITIAL_HANGAR_INQUIRY_STATE: HangarInquiryState = {
  configuration: DEFAULT_CONFIGURATOR_STATE,
  attachment: INITIAL_HANGAR_ATTACHMENT,
  presentationDemo: null,
  presentationAnnouncement: '',
  step: 0,
  restored: false,
};

function reduceHangarInquiry(current: HangarInquiryState, action: HangarInquiryAction): HangarInquiryState {
  if (action.type === 'step') return current.step === action.step ? current : { ...current, step: action.step };
  if (action.type === 'restore') {
    return {
      ...current,
      configuration: action.configuration,
      attachment: action.attached ? { status: 'attached', reason: 'explicit-action' } : INITIAL_HANGAR_ATTACHMENT,
      step: action.step,
      restored: true,
    };
  }
  if (action.type === 'start-over') return { ...INITIAL_HANGAR_INQUIRY_STATE };

  if (action.type === 'business-edit') {
    // Numeric fields commit on blur as well as while typing. Merely focusing and leaving an
    // unchanged default must not count as intent, so identical commits are true no-ops.
    if (sameBusinessConfiguration(current.configuration, action.configuration)) return current;
    return {
      ...current,
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

  // The draft (07.10, draft.ts): read back once after the page has hydrated — the server knows nothing of it — then kept
  // on every change. The first save waits for the read, so the example never overwrites a draft before it is read.
  const read = useRef(false);
  useEffect(() => {
    const draft = readDraft(CONTROL_STEPS.length);
    read.current = true;
    // Only a draft that holds something of the visitor's (08.10, audit): opening a tab and reloading showed «Відновлено
    // вашу конфігурацію» over the untouched example
    if (draft && (draft.attached || !sameBusinessConfiguration(draft.configuration, DEFAULT_CONFIGURATOR_STATE))) {
      dispatch({ type: 'restore', ...draft });
    }
  }, []);
  // Kept only while it is the visitor's: changed, or attached to the request (the example attached by «Обговорити» too —
  // it disappeared on a reload); back to the untouched example, the draft is forgotten. The step travels with it, never alone.
  const worthKeeping = model.attachment.status === 'attached' || !sameBusinessConfiguration(model.configuration, DEFAULT_CONFIGURATOR_STATE);
  useEffect(() => {
    if (!read.current) return;
    if (worthKeeping) saveDraft({ configuration: model.configuration, attached: model.attachment.status === 'attached', step: model.step });
    else clearDraft();
  }, [model.configuration, model.attachment, model.step, worthKeeping]);
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
      step: model.step,
      setStep: (step: number) => dispatch({ type: 'step', step }),
      restored: model.restored,
      startOver: () => {
        clearDraft();
        dispatch({ type: 'start-over' });
      },
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
  const reattach = useCallback(() => dispatch({ type: 'explicit-attach' }), []);
  const source = useMemo(
    () => ({ attachment, status: model.attachment, detach: detachConfiguration, reattach }),
    [attachment, model.attachment, detachConfiguration, reattach],
  );
  useInquiryAttachmentSource(source);

  return <HangarInquiryContext.Provider value={value}>{children}</HangarInquiryContext.Provider>;
}

export function useHangarInquiryContext() {
  return useContext(HangarInquiryContext);
}
