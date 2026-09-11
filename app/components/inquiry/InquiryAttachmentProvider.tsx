'use client';

import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AttachmentStatus, InquiryAttachment } from '../../lib/inquiry/attachment';

export type InquiryAttachmentSource = {
  /** The attachment's content — present only while it is attached. */
  attachment: InquiryAttachment | null;
  status: AttachmentStatus;
  detach: () => void;
};

type AttachmentRegistry = {
  publish: (source: InquiryAttachmentSource | null) => void;
  claim: () => () => void;
};

const RegistryContext = createContext<AttachmentRegistry | null>(null);
const AttachmentContext = createContext<InquiryAttachmentSource | null>(null);

/**
 * The page's one answer to «what is attached to the inquiry». A single source — the hangar
 * configurator or the grain planner — owns its state machine and publishes here; the form and the
 * phone CTA only read. Neither side imports the other, so the form stays free of hangar and grain.
 */
export function InquiryAttachmentProvider({ children }: { children: ReactNode }) {
  const [source, setSource] = useState<InquiryAttachmentSource | null>(null);
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

  return (
    <RegistryContext.Provider value={registry}>
      <AttachmentContext.Provider value={source}>{children}</AttachmentContext.Provider>
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

/** For the form and CTAs: what the page's source published, or null when there is none. */
export function useInquiryAttachment() {
  return useContext(AttachmentContext);
}
