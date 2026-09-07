'use client';

import { useCallback, useEffect, useState } from 'react';
import { useHangarInquiryContext } from '../configurator/HangarInquiryContext';

function focusBlocksStickyCta() {
  const active = document.activeElement;
  return active instanceof HTMLElement && Boolean(active.closest('input, textarea, select, [contenteditable="true"]'));
}

function overlayBlocksStickyCta() {
  return Boolean(document.querySelector('.cookie-banner, .mobile-menu[open], .hc-fullscreen-overlay, [aria-modal="true"]'));
}

export function HangarMobileInquiryCta() {
  const inquiry = useHangarInquiryContext();
  const [inquiryVisible, setInquiryVisible] = useState(false);
  const [uiBlocked, setUiBlocked] = useState(true);

  const updateBlockers = useCallback(() => {
    setUiBlocked(focusBlocksStickyCta() || overlayBlocksStickyCta());
  }, []);

  useEffect(() => {
    const inquirySection = document.getElementById('inquiry');
    if (!inquirySection) return;

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => setInquiryVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );
    intersectionObserver.observe(inquirySection);

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

    return () => {
      intersectionObserver.disconnect();
      mutationObserver.disconnect();
      window.cancelAnimationFrame(initialCheck);
      window.cancelAnimationFrame(focusCheck);
      document.removeEventListener('focusin', updateBlockers);
      document.removeEventListener('focusout', updateAfterFocusLeaves);
    };
  }, [updateBlockers]);

  if (!inquiry?.isAttached) return null;

  return (
    <a
      className="angary-mobile-inquiry-cta"
      href="#inquiry"
      hidden={inquiryVisible || uiBlocked}
    >
      До заявки <span aria-hidden="true">↓</span>
    </a>
  );
}
