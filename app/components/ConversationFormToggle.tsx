'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useInquiryAttachment } from './inquiry/InquiryAttachmentProvider';
import { revealAttachedBrief } from './inquiry/revealAttachedBrief';

/**
 * The conversation block on a phone or tablet (≤ 1180 px, one column): the call and the written channels come first,
 * the form folds behind «Залишити запит», so the block is about one and a half screens instead of two and a half.
 * Desktop always shows the form (app/conversation.css hides the button there).
 *
 * The form opens by itself when someone clearly came to write: a link marked `data-open-inquiry` (HOME «Написати або
 * залишити запит», «Обговорити цей формат», «Перейти до заявки») or an attached brief from the hangar configurator or
 * the grain planner. Without JavaScript nothing is folded — the CSS folds only under `:root[data-theme]`.
 */
export function ConversationFormToggle({ children }: Readonly<{ children: ReactNode }>) {
  const [opened, setOpened] = useState(false);
  const attached = Boolean(useInquiryAttachment()?.attachment);
  const regionId = useId();
  const regionRef = useRef<HTMLDivElement>(null);
  const focusAfterOpen = useRef(false);

  useEffect(() => {
    const openFromLink = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-open-inquiry]')) return;
      setOpened(true);
      // With a brief attached every way to the form lands on it, as «Обговорити цю конфігурацію» does: /angary's cost and
      // title-block CTAs and the FAQ link left a phone at the form's heading with the brief below (sweep 03.10)
      if (attached) revealAttachedBrief(event);
    };
    document.addEventListener('click', openFromLink, true);
    return () => document.removeEventListener('click', openFromLink, true);
  }, [attached]);

  // Once a brief has opened the form it stays open: detaching it («Не додавати», «Почати спочатку») must not fold the
  // form under the visitor's hands. (State adjusted while rendering, React's pattern for following a changed value.)
  if (attached && !opened) setOpened(true);

  const shown = opened || attached;

  useEffect(() => {
    if (!shown || !focusAfterOpen.current) return;
    focusAfterOpen.current = false;
    // The button that had focus is gone: hand focus to the first field, not to the top of the page.
    regionRef.current?.querySelector<HTMLElement>('input:not([type="hidden"]):not([tabindex="-1"]), select, textarea')?.focus();
  }, [shown]);

  const open = useCallback(() => {
    focusAfterOpen.current = true;
    setOpened(true);
  }, []);

  return (
    <div className="conversation-form-wrap" data-open={shown ? '' : undefined}>
      {!shown && (
        <button type="button" className="conversation-form-toggle" aria-expanded="false" aria-controls={regionId} onClick={open}>
          Залишити запит <span aria-hidden="true">↓</span>
        </button>
      )}
      <div className="conversation-form-region" id={regionId} ref={regionRef}>
        {children}
      </div>
    </div>
  );
}
