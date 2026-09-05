'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Phase 3C — "Розгорнути" (expand). Reuses the SAME mounted Canvas/WebGL context; does not mount
// a second one (the brief's own explicit requirement).
//
// The mechanism: a single DOM node (`portalHost`) created once and never recreated for this
// component's whole lifetime. `children` is portaled into THAT node via ONE `createPortal` call,
// unconditionally, on every render — active or not. What changes with `active` is only where
// `portalHost` itself physically lives in the page (moved with plain `appendChild`, imperatively,
// in a layout effect): parked inline, inside the placeholder anchor below, while inactive; moved
// to `document.body` while active. `portalHost` itself is otherwise never touched — no className,
// no attributes — it stays a bare, opaque container; the "overlay" look (role="dialog",
// aria-modal, the dark fixed-position chrome) is dressed onto a normal React-rendered `<div>`
// living INSIDE the portal instead, entirely via props. That split matters for two independent
// reasons, not one:
//
//   - React identity: `<>{children}</>` (Fragment) vs. `createPortal(..., document.body)`
//     (Portal) are different element TYPES at the same tree position, and React tears down and
//     rebuilds a subtree whenever the type at a position changes — regardless of whether the same
//     element reference is nested somewhere inside. That was this file's first version, and it
//     silently mounted a SECOND WebGL context on every expand instead of reusing the first
//     (caught by tests/e2e/configurator-3d-enhancements.spec.ts's canvas-identity test, confirmed
//     via a DOM-attribute probe: a marker set on the canvas before expanding was gone after).
//     Keeping the portal call itself permanently in the tree, at a stable position — and keeping
//     everything rendered INSIDE it a stable shape too, varying only by prop (className, hidden,
//     aria-*), never by conditionally including/excluding an element — is what actually gives the
//     "same mounted context" guarantee.
//   - Lint/Compiler correctness: `useState`'s returned value is treated as something this
//     codebase's stricter-than-default `react-hooks` rules (immutability) forbid ever mutating in
//     place, in an effect or otherwise — only the setter may change it. Routing all of the
//     "dressing" through ordinary JSX props on a portaled element sidesteps that entirely, rather
//     than fighting it with `useRef` (which the same ruleset forbids reading during render, ruling
//     out the classic `if (ref.current === null) ref.current = …` lazy-init idiom for a value the
//     render itself needs to pass to `createPortal`).

export function FullscreenPreviewFrame({
  active,
  onExit,
  labelledBy,
  describedBy,
  children,
}: {
  active: boolean;
  onExit: () => void;
  /** Accessible label for the fullscreen dialog. */
  labelledBy?: string;
  /** ID of the model description inside the portaled content. */
  describedBy?: string;
  children: ReactNode;
}) {
  // Created lazily, once, only on the client — see the module doc for why this is `useState`
  // (never mutated afterward) rather than a ref. The SSR guard is cheap insurance: today's only
  // call site never mounts this component before the user has already interacted client-side
  // (`showThree` starts false), so it never actually runs on the server.
  const [portalHost] = useState<HTMLDivElement | null>(() =>
    typeof document === 'undefined' ? null : document.createElement('div'),
  );
  const inlineAnchorRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Moves `portalHost` between its two possible physical parents. `portalHost` appears here only
  // as an ARGUMENT to `appendChild`/`removeChild` — never as the receiver of a property write or
  // a method call on itself — so this never mutates the value `useState` returned, only the two
  // real DOM parents' own child lists. Layout effect (not a passive one) so the move happens
  // before paint — no single frame where the node is mid-transition or missing a parent.
  useLayoutEffect(() => {
    if (!portalHost) return undefined;
    const parent = active ? document.body : inlineAnchorRef.current;
    parent?.appendChild(portalHost); // appendChild auto-detaches it from wherever it was first
    return () => {
      portalHost.parentElement?.removeChild(portalHost); // only matters on final unmount
    };
  }, [active, portalHost]);

  useEffect(() => {
    if (!active || !portalHost) return undefined;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    // aria-modal alone does not prevent keyboard focus from reaching the covered page.
    // The stable portal host is already a body child; isolate its siblings and restore their
    // previous state on exit (including siblings that were inert before this dialog opened).
    const background = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== portalHost)
      .map((element) => ({ element, inert: element.inert }));
    for (const { element } of background) element.inert = true;

    function focusableControls() {
      return Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]',
      ) ?? []).filter((element) => element.tabIndex >= 0
        && !element.matches(':disabled') && !element.closest('[inert]')
        && element.getClientRects().length > 0);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onExit();
      } else if (event.key === 'Tab') {
        const controls = focusableControls();
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    function onFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) {
        closeButtonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    // A fullscreen overlay covering the whole viewport should stop the page itself from
    // scrolling behind it — this is a modal, not a tall page section.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
      document.body.style.overflow = previousOverflow;
      for (const { element, inert } of background) element.inert = inert;
      // Focus restoration: back to whatever triggered fullscreen (the "Розгорнути" button),
      // matching the brief's explicit requirement.
      previouslyFocusedRef.current?.focus({ preventScroll: true });
    };
  }, [active, onExit, portalHost]);

  if (!portalHost) return <>{children}</>; // SSR fallback — see the guarded useState above

  return (
    <>
      {/* Layout-transparent (`display: contents`): purely a parking spot for `portalHost` while
          inactive, contributes no box of its own, so the rendered result is pixel-identical to
          `.hc-preview-canvas` sitting directly inside `.hc-preview-surface`, as it did before
          fullscreen existed. */}
      <div ref={inlineAnchorRef} style={{ display: 'contents' }} />
      {createPortal(
        // Always the SAME three elements in the SAME nesting, active or not — only their props
        // differ. See the module doc: a conditionally-included/excluded element here would
        // reintroduce the exact remount bug this file exists to avoid, one level deeper.
        <div
          ref={dialogRef}
          className={active ? 'hc-fullscreen-overlay' : undefined}
          role={active ? 'dialog' : undefined}
          aria-modal={active ? 'true' : undefined}
          aria-label={active ? (labelledBy ?? 'Розгорнутий перегляд 3D-моделі') : undefined}
          aria-describedby={active ? describedBy : undefined}
        >
          <button
            type="button"
            ref={closeButtonRef}
            className="hc-fullscreen-close"
            hidden={!active}
            onClick={onExit}
          >
            Закрити ✕
          </button>
          <div className={active ? 'hc-fullscreen-canvas-slot' : undefined}>{children}</div>
        </div>,
        portalHost,
      )}
    </>
  );
}

export default FullscreenPreviewFrame;
