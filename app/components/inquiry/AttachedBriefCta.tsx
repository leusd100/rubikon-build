'use client';

import { useCallback, useEffect, useState } from 'react';
import { useInquiryAttachment } from './InquiryAttachmentProvider';

function focusBlocksStickyCta() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest('input, textarea, select, [contenteditable="true"]'));
}

function overlayBlocksStickyCta() {
  return Boolean(document.querySelector('.cookie-banner, .mobile-menu[open], .hc-fullscreen-overlay, [aria-modal="true"]'));
}

/**
 * The phone shortcut to the form while something is attached. It shows only once `gate` — the
 * source's own summary — has scrolled past, never while #inquiry is on screen, while a field has
 * focus, or under the cookie banner, the mobile menu or a modal. Which widths show it is the
 * `className`'s CSS (≤ 760 on /angary).
 */
export function AttachedBriefCta({ gate, className, label = 'До заявки' }: { gate: string; className: string; label?: string }) {
  const inquiry = useInquiryAttachment();
  const attached = Boolean(inquiry?.attachment);
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const [summaryPassed, setSummaryPassed] = useState(false);
  const [uiBlocked, setUiBlocked] = useState(true);

  const updateBlockers = useCallback(() => {
    setUiBlocked(focusBlocksStickyCta() || overlayBlocksStickyCta());
  }, []);

  // Re-run when the attachment appears: a planner's summary only exists after its result is shown.
  useEffect(() => {
    const inquirySection = document.getElementById('inquiry');
    const summary = document.querySelector<HTMLElement>(gate);
    if (!inquirySection || !summary) return;

    let visibilityFrame = 0;
    const measurePosition = () => {
      visibilityFrame = 0;
      const summaryIsPassed = summary.getBoundingClientRect().bottom <= 0;
      const inquiryRect = inquirySection.getBoundingClientRect();
      const inquiryIsVisible = inquiryRect.top < window.innerHeight && inquiryRect.bottom > 0;
      setSummaryPassed((current) => current === summaryIsPassed ? current : summaryIsPassed);
      setInquiryVisible((current) => current === inquiryIsVisible ? current : inquiryIsVisible);
    };
    const schedulePositionMeasure = () => {
      if (visibilityFrame) return;
      visibilityFrame = window.requestAnimationFrame(measurePosition);
    };

    const inquiryObserver = new IntersectionObserver(
      schedulePositionMeasure,
      { threshold: 0.05 },
    );
    inquiryObserver.observe(inquirySection);

    // "Not intersecting" is ambiguous: the summary may still be below the viewport. Its bottom
    // edge must have crossed the viewport's top edge before the fixed conversion action is useful.
    const summaryObserver = new IntersectionObserver(
      schedulePositionMeasure,
      { threshold: [0, 1] },
    );
    summaryObserver.observe(summary);
    window.addEventListener('scroll', schedulePositionMeasure, { passive: true });
    window.addEventListener('resize', schedulePositionMeasure);

    const mutationObserver = new MutationObserver(updateBlockers);
    mutationObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['open', 'aria-hidden', 'aria-modal'],
      childList: true,
      subtree: true,
    });

    let focusCheck = 0;
    const updateAfterFocusLeaves = () => {
      window.cancelAnimationFrame(focusCheck);
      focusCheck = window.requestAnimationFrame(updateBlockers);
    };
    document.addEventListener('focusin', updateBlockers);
    document.addEventListener('focusout', updateAfterFocusLeaves);
    const initialCheck = window.requestAnimationFrame(updateBlockers);
    schedulePositionMeasure();

    return () => {
      inquiryObserver.disconnect();
      summaryObserver.disconnect();
      mutationObserver.disconnect();
      window.cancelAnimationFrame(initialCheck);
      window.cancelAnimationFrame(focusCheck);
      window.cancelAnimationFrame(visibilityFrame);
      window.removeEventListener('scroll', schedulePositionMeasure);
      window.removeEventListener('resize', schedulePositionMeasure);
      document.removeEventListener('focusin', updateBlockers);
      document.removeEventListener('focusout', updateAfterFocusLeaves);
    };
  }, [gate, attached, updateBlockers]);

  if (!attached) return null;

  return (
    <a
      className={className}
      href="#inquiry"
      hidden={!summaryPassed || inquiryVisible || uiBlocked}
    >
      {`${label} `}<span aria-hidden="true">↓</span>
    </a>
  );
}
