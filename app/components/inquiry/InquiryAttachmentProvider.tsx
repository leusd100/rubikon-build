'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AttachmentStatus, InquiryAttachment } from '../../lib/inquiry/attachment';
import { isSentAttachment, sentAttachmentKey } from './formAttachment';

export type InquiryAttachmentSource = {
  /** The attachment's content — present only while it is attached. */
  attachment: InquiryAttachment | null;
  status: AttachmentStatus;
  detach: () => void;
  /** Attach it again after «Не додавати» (08.10): the form offers it in place of the card it took away */
  reattach?: () => void;
};

/** What the form, the CTAs and the page read: the source's state, and whether its brief has already gone out. */
export type InquiryAttachmentState = InquiryAttachmentSource & {
  /**
   * The attached brief went out with a saved lead and has not changed since (04.10). The brief card says it was sent,
   * the next submit leaves it out, and the page's ways to the form — /angary's route node 01, the phone «До заявки» —
   * stop asking to send it. An edit in the configurator or the planner makes a new brief, and this is false again.
   */
  sent: boolean;
  /** For the form, after a saved lead that carried `attachment`. */
  markSent: (attachment: InquiryAttachment) => void;
};

type AttachmentRegistry = {
  publish: (source: InquiryAttachmentSource | null) => void;
  claim: () => () => void;
};

const RegistryContext = createContext<AttachmentRegistry | null>(null);
const AttachmentContext = createContext<InquiryAttachmentState | null>(null);

/**
 * The page's one answer to «what is attached to the inquiry». A single source — the hangar
 * configurator or the grain planner — owns its state machine and publishes here; the form and the
 * phone CTA only read. Neither side imports the other, so the form stays free of hangar and grain.
 */
export function InquiryAttachmentProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<InquiryAttachmentSource | null>(null);
  // The last brief a saved lead carried: kept here, not by the source, so the hangar and the grain brief share the rule
  const [sentKey, setSentKey] = useState<string | null>(null);
  const sources = useRef(0);
  const registry = useMemo<AttachmentRegistry>(() => ({
    publish: setSource,
    claim: () => {
      sources.current += 1;
      if (sources.current > 1 && process.env.NODE_ENV !== 'production') {
        console.warn('InquiryAttachmentProvider: more than one attachment source on this page — the last one to publish wins.');
      }
      return () => {
        sources.current -= 1;
      };
    },
  }), []);
  const markSent = useCallback((attachment: InquiryAttachment) => setSentKey(sentAttachmentKey(attachment)), []);
  const state = useMemo<InquiryAttachmentState | null>(
    () => (source ? { ...source, sent: isSentAttachment(source.attachment, sentKey), markSent } : null),
    [source, sentKey, markSent],
  );

  return (
    <RegistryContext.Provider value={registry}>
      <AttachmentContext.Provider value={state}>{children}</AttachmentContext.Provider>
    </RegistryContext.Provider>
  );
}

/**
 * For a source: publish the current attachment state. Layout effects, so the form updates in the
 * same paint as the source. Outside an InquiryAttachmentProvider this does nothing.
 */
export function useInquiryAttachmentSource(source: InquiryAttachmentSource) {
  const registry = useContext(RegistryContext);

  useLayoutEffect(() => {
    if (!registry) return undefined;
    const release = registry.claim();
    return () => {
      release();
      registry.publish(null);
    };
  }, [registry]);

  useLayoutEffect(() => {
    registry?.publish(source);
  }, [registry, source]);
}

/** For the form and CTAs: what the page's source published and whether it was sent, or null when there is no source. */
export function useInquiryAttachment() {
  return useContext(AttachmentContext);
}
