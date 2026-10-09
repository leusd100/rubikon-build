'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../../lib/inquiry/attachment';

/**
 * The attached brief inside the inquiry form: what it is, its headline, a look at every row the
 * lead's text carries, and «Не додавати». Kind-agnostic — the hangar configuration renders the
 * inquiry-config-brief* markup it always had; only the words come from the attachment.
 * `direction`: the page's preset «Напрям робіт», read-only here while the brief is attached (the form submits it).
 * `sent`: this brief already went out with a saved lead (04.10) — the card says so, «Не додавати» has nothing left to do.
 */
export function InquiryAttachmentSummary({
  attachment,
  onDetach,
  direction,
  sent = false,
}: Readonly<{ attachment: InquiryAttachment; onDetach: () => void; direction?: string; sent?: boolean }>) {
  const [expanded, setExpanded] = useState(false);
  const labels = INQUIRY_ATTACHMENT_LABELS[attachment.kind];
  const statusRef = useRef<HTMLOutputElement>(null);
  const spokenFor = useRef({ headline: attachment.headline, sent });

  // The status line is spoken once, on the action that revealed the brief (revealAttachedBrief). Once the brief changes
  // under it — an edit in the configurator, the lead sent — that line is stale: a screen reader browsing the brief heard
  // the old size first (sweep 03.10). It empties, and the next explicit action fills it again.
  useEffect(() => {
    if (spokenFor.current.headline === attachment.headline && spokenFor.current.sent === sent) return;
    spokenFor.current = { headline: attachment.headline, sent };
    if (statusRef.current) statusRef.current.textContent = '';
  }, [attachment.headline, sent]);

  return (
    <aside
      className="inquiry-config-brief"
      id="inquiry-brief"
      tabIndex={-1}
      aria-labelledby="inquiry-config-brief-title"
      data-sent={sent ? '' : undefined}
    >
      {/* Filled once by revealAttachedBrief on an explicit action, never on the auto-attach of every edit */}
      <output className="sr-only" id="inquiry-brief-status" ref={statusRef} />
      <div className="inquiry-config-brief-heading">
        <div>
          {/* h3, under the form's h2 and beside its «Контакт» / «Завдання»: the brief's own section headings are h4 (sweep 03.10) */}
          <h3 className="inquiry-config-brief-title" id="inquiry-config-brief-title">{sent ? 'Надіслано з вашим запитом' : attachment.title}</h3>
          {/* the brief's own words go out as they stand: not translated by the page (08.10) */}
          <strong translate="no">{attachment.headline}</strong>
          {/* Not a dl: the brief's rows (dl > div) are exactly the lead's text, and the direction is a field of its own */}
          {direction && <p className="inquiry-config-brief-direction"><span>Напрям робіт</span> <b>{direction}</b></p>}
          {sent && <p className="inquiry-config-brief-sent">Повторно не надсилатимемо, доки ви нічого не зміните.</p>}
        </div>
        <div className="inquiry-config-brief-actions">
          <button
            className="inquiry-config-brief-toggle"
            type="button"
            aria-expanded={expanded}
            aria-controls="inquiry-config-brief-parameters"
            onClick={() => setExpanded((current) => !current)}
          >
            {labels.review}
            <ChevronDown aria-hidden="true" />
          </button>
          {!sent && (
            <button
              type="button"
              className="inquiry-config-brief-detach"
              onClick={() => {
                setExpanded(false);
                // The button unmounts with the brief: focus goes to the form's «Завдання», not to the page body
                document.getElementById('inquiry-project-heading')?.focus({ preventScroll: true });
                onDetach();
              }}
            >
              Не додавати
            </button>
          )}
        </div>
      </div>
      <div
        className="inquiry-config-brief-sections"
        id="inquiry-config-brief-parameters"
        hidden={!expanded}
      >
        {attachment.sections.filter((section) => section.rows.length > 0).map((section) => (
          <section key={section.id} aria-labelledby={`inquiry-config-${section.id}-heading`}>
            <h4 id={`inquiry-config-${section.id}-heading`}>{section.heading}</h4>
            <dl>
              {section.rows.map((row) => (
                <div key={row.label}><dt>{row.label}</dt><dd translate="no">{row.value}</dd></div>
              ))}
            </dl>
          </section>
        ))}
        {/* Back to the source's steps, on the step left (09.10): the hangar configurator takes it there (HangarConfigurator);
            a source without steps keeps the plain anchor */}
        <a className="inquiry-config-edit" href={attachment.editHref} data-open-steps="">{labels.edit}</a>
      </div>
    </aside>
  );
}
