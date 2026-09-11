'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { INQUIRY_ATTACHMENT_LABELS, type InquiryAttachment } from '../../lib/inquiry/attachment';

/**
 * The attached brief inside the inquiry form: what it is, its headline, a look at every row the
 * lead's text carries, and «Не додавати». Kind-agnostic — the hangar configuration renders the
 * inquiry-config-brief* markup it always had; only the words come from the attachment.
 */
export function InquiryAttachmentSummary({ attachment, onDetach }: { attachment: InquiryAttachment; onDetach: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const labels = INQUIRY_ATTACHMENT_LABELS[attachment.kind];

  return (
    <aside className="inquiry-config-brief" aria-labelledby="inquiry-config-brief-title">
      <div className="inquiry-config-brief-heading">
        <div>
          <small id="inquiry-config-brief-title">{attachment.title}</small>
          <strong>{attachment.headline}</strong>
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
