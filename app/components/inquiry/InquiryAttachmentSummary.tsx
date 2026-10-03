'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../../lib/inquiry/attachment';

/**
 * The attached brief inside the inquiry form: what it is, its headline, a look at every row the
 * lead's text carries, and «Не додавати». Kind-agnostic — the hangar configuration renders the
 * inquiry-config-brief* markup it always had; only the words come from the attachment.
 * `direction`: the page's preset «Напрям робіт», read-only here while the brief is attached (the form submits it).
 */
export function InquiryAttachmentSummary({
  attachment,
  onDetach,
  direction,
}: { attachment: InquiryAttachment; onDetach: () => void; direction?: string }) {
  const [expanded, setExpanded] = useState(false);
  const labels = INQUIRY_ATTACHMENT_LABELS[attachment.kind];

  return (
    <aside className="inquiry-config-brief" id="inquiry-brief" tabIndex={-1} aria-labelledby="inquiry-config-brief-title">
      {/* Filled once by revealAttachedBrief on an explicit action, never on the auto-attach of every edit */}
      <output className="sr-only" id="inquiry-brief-status" />
      <div className="inquiry-config-brief-heading">
        <div>
          <small id="inquiry-config-brief-title">{attachment.title}</small>
          <strong>{attachment.headline}</strong>
          {/* Not a dl: the brief's rows (dl > div) are exactly the lead's text, and the direction is a field of its own */}
          {direction && <p className="inquiry-config-brief-direction"><span>Напрям робіт</span> <b>{direction}</b></p>}
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
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              // The button unmounts with the brief: focus goes to the form's «Завдання», not to the page body
              document.getElementById('inquiry-project-heading')?.focus({ preventScroll: true });
              onDetach();
            }}
          >
            Не додавати
          </button>
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
                <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>
              ))}
            </dl>
          </section>
        ))}
        <a className="inquiry-config-edit" href={attachment.editHref}>{labels.edit}</a>
      </div>
    </aside>
  );
}
