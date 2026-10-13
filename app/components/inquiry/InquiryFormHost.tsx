'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Where the page's one inquiry form stands (Phase 4, 12.10; R-UX-06 §06 п. 2–3, §14 п. 9). On /angary the form closes the
 * page: from the stamp's «Обговорити» to the form's name field it was 4 400–7 600 px (main 4f64d70: 390 px 7 587,
 * 1250 px 4 367, 1440 px 4 653), and «Обговорити цю конфігурацію» took the visitor there, away from what they had just
 * configured. With this host the same form — the same component, the same lead, Turnstile and analytics, nothing written
 * twice — opens right under the stamp instead: the closing block (ConversationFormToggle) hands its form here and shows
 * a line pointing up to it.
 *
 * The form moves only while nothing has been typed into it where it stands: moved, it is a new form, and the visitor's
 * words would be lost. A form typed into stays where it is, and «Обговорити» takes the visitor to it as before. Nothing
 * moves without JavaScript, nor on a page without this host.
 */
type InquiryFormHostValue = {
  /** The closing block's form, handed over as it renders it */
  form: ReactNode;
  setForm: (form: ReactNode) => void;
  /** The form stands at the page's source — under the configurator's stamp — for the rest of this visit */
  atSource: boolean;
  /** Brings the form to the source; false when it stays where it is, typed into */
  bringToSource: () => boolean;
  /** Something was typed or chosen in the form where it stands */
  markTyped: () => void;
};

const InquiryFormHostContext = createContext<InquiryFormHostValue | null>(null);

export function InquiryFormHost({ children }: Readonly<{ children: ReactNode }>) {
  const [form, setForm] = useState<ReactNode>(null);
  const [atSource, setAtSource] = useState(false);
  const typed = useRef(false);
  const markTyped = useCallback(() => {
    typed.current = true;
  }, []);
  const bringToSource = useCallback(() => {
    if (typed.current) return false;
    setAtSource(true);
    return true;
  }, []);
  const value = useMemo(() => ({ form, setForm, atSource, bringToSource, markTyped }), [form, atSource, bringToSource, markTyped]);
  return <InquiryFormHostContext.Provider value={value}>{children}</InquiryFormHostContext.Provider>;
}

/** The page's form host, or null on a page without one */
export function useInquiryFormHost() {
  return useContext(InquiryFormHostContext);
}

/** The form's place at the source — /angary's, under the configurator's stamp. Empty until the form is brought there.
 *  `aside` follows the form, in reading order as on screen. */
export function InquiryFormSlot({ id, className, aside }: Readonly<{ id: string; className: string; aside?: ReactNode }>) {
  const host = useInquiryFormHost();
  if (!host?.atSource || !host.form) return null;
  return (
    <div className={className} id={id} tabIndex={-1}>
      {host.form}
      {aside}
    </div>
  );
}
