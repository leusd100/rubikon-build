'use client';

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useInquiryAttachment } from './InquiryAttachmentProvider';
import { revealAttachedBrief } from './revealAttachedBrief';

/** Only typing hides the shortcut. A tapped option card or a dragged slider keeps focus on its radio or range input
 *  (Android does not blur on scroll), and used to hide «До заявки» for the rest of the page (UX review 2026-10). */
const TEXT_ENTRY = 'input:not([type="radio"]):not([type="checkbox"]):not([type="range"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]';

function focusBlocksStickyCta() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest(TEXT_ENTRY));
}

function overlayBlocksStickyCta() {
  // the cookie strip no longer hides the shortcut: it stands above the strip (08.10, audit F158)
  return Boolean(document.querySelector('.mobile-menu[open], .hc-fullscreen-overlay, [aria-modal="true"]'));
}

/**
 * Keeps `summaryPassed`, `inquiryVisible` and the blockers current for one gate element; returns
 * the teardown.
 */
function watchGate(
  inquirySection: HTMLElement,
  summary: HTMLElement,
  setSummaryPassed: Dispatch<SetStateAction<boolean>>,
  setInquiryVisible: Dispatch<SetStateAction<boolean>>,
  updateBlockers: () => void,
) {
  let visibilityFrame = 0;
  const measurePosition = () => {
    visibilityFrame = 0;
    const summaryIsPassed = summary.getBoundingClientRect().bottom <= 0;
    const inquiryRect = inquirySection.getBoundingClientRect();
    // On screen or already above it: /angary closes with its related directions after the form (03.10), and there a
    // «До заявки ↓» would point the wrong way
    const inquiryIsVisible = inquiryRect.top < window.innerHeight;
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
}

/**
 * The phone shortcut to the form while something is attached. It shows only once `gate` — the
 * source's own summary — has scrolled past, never once #inquiry is on screen or passed, while a field has
 * focus, or under the cookie banner, the mobile menu or a modal. Which widths show it is the
 * `className`'s CSS (≤ 760 on /angary). A brief already sent with a saved lead needs no shortcut (04.10): it kept
 * inviting a second, identical lead after «Дякуємо!» (sweep 03.10).
 */
export function AttachedBriefCta({ gate, className, label = 'До заявки' }: { gate: string; className: string; label?: string }) {
  const inquiry = useInquiryAttachment();
  const attached = Boolean(inquiry?.attachment) && !inquiry?.sent;
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const [summaryPassed, setSummaryPassed] = useState(false);
  const [uiBlocked, setUiBlocked] = useState(true);

  const updateBlockers = useCallback(() => {
    setUiBlocked(focusBlocksStickyCta() || overlayBlocksStickyCta());
  }, []);

  // Re-run when the attachment appears: a planner's summary only exists after its result is shown,
  // and may still be loading then — so an attached source waits for its gate to render.
  useEffect(() => {
    const inquirySection = document.getElementById('inquiry');
    if (!inquirySection || !attached) return undefined;

    let currentGate: HTMLElement | null = null;
    let stopWatching: (() => void) | undefined;
    const bindCurrentGate = () => {
      const nextGate = document.querySelector<HTMLElement>(gate);
      if (nextGate === currentGate) return;
      stopWatching?.();
      stopWatching = undefined;
      currentGate = nextGate;
      // A removed/replaced summary has no valid measurements. Keep the CTA hidden until the
      // current node has been observed and measured rather than carrying stale geometry forward.
      setSummaryPassed(false);
      setInquiryVisible(false);
      updateBlockers();
      if (nextGate) stopWatching = watchGate(inquirySection, nextGate, setSummaryPassed, setInquiryVisible, updateBlockers);
    };

    bindCurrentGate();
    const gateObserver = new MutationObserver(bindCurrentGate);
    gateObserver.observe(document.body, { childList: true, subtree: true });
    return () => {
      gateObserver.disconnect();
      stopWatching?.();
    };
  }, [gate, attached, updateBlockers]);

  if (!attached) return null;

  return (
    <a
      className={className}
      href="#inquiry"
      onClick={revealAttachedBrief}
      hidden={!summaryPassed || inquiryVisible || uiBlocked}
    >
      {`${label} `}<span aria-hidden="true">↓</span>
    </a>
  );
}
