import { Mail, Phone } from 'lucide-react';
import ProjectInquiryForm from './ProjectInquiryForm';
import { MessengerLinks } from './SiteChrome';
import { company, companyContactLinks } from '../data/company';
import { DEFAULT_JOURNEY, JOURNEY_TITLES, type JourneyTexts } from '../data/conversation';
import { cooperationOptions, inquirySuccessMessage } from '../lib/deliveryModelPresentation';

const DEFAULT_LEAD = 'Можна почати з ідеї або з готового проєкту. Найшвидше — зателефонувати; якщо зручніше писати — залиште запит.';

type ConversationSectionProps = {
  kicker?: string;
  title: string;
  lead?: string;
  /** Preselects «Напрям робіт» in the form on a direction page. */
  defaultDirection?: string;
  /** The four step explanations; the step titles are fixed (app/data/conversation.ts). */
  journey?: JourneyTexts;
};

/**
 * The one closing conversation block on the site (#inquiry): HOME, every direction page, /napryamky, /yak-pratsyuiemo
 * and /pro-nas. Call first, the written channels once, the form beside them and «Що буде після звернення» under the
 * call. Pages change only the words. The background is a decorative desk-and-drawings photo — never evidence of our
 * work. Styles: app/conversation.css.
 */
export function ConversationSection({
  kicker = 'Почнемо з розмови',
  title,
  lead = DEFAULT_LEAD,
  defaultDirection,
  journey = DEFAULT_JOURNEY,
}: Readonly<ConversationSectionProps>) {
  return (
    <section className="conversation section" id="inquiry" aria-labelledby="conversation-title">
      <div className="conversation-bg" aria-hidden="true">
        <picture>
          <source media="(max-width: 760px)" srcSet="/media/home-v2/conversation-bg-portrait-720w.webp" />
          <img
            src="/media/home-v2/conversation-bg-1600w.webp"
            srcSet="/media/home-v2/conversation-bg-960w.webp 960w, /media/home-v2/conversation-bg-1600w.webp 1600w"
            sizes="100vw"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </picture>
      </div>
      <div className="shell conversation-grid">
        <div className="conversation-intro">
          <p className="conversation-kicker"><span aria-hidden="true" /> {kicker}</p>
          <h2 id="conversation-title">{title}</h2>
          <p className="conversation-lead">{lead}</p>
          {/* One aligned block: the call on top at full width, the written channels under it on an equal grid. */}
          <div className="conversation-contact">
            <a className="button button-primary hero-call-primary conversation-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
              <span className="conversation-call-icon" aria-hidden="true"><Phone /></span>
              <span className="conversation-call-text"><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
              <span className="conversation-call-arrow" aria-hidden="true">↗</span>
            </a>
            <p className="conversation-channels-label">Або напишіть</p>
            <div className="conversation-channels">
              <MessengerLinks className="conversation-messengers" showFullLabels />
              <a className="messenger-link conversation-email" href={companyContactLinks.email} aria-label={`Email: ${company.email}`}>
                <Mail aria-hidden="true" />
                <span>Email</span>
              </a>
            </div>
          </div>
        </div>
        {/* Resolved here, on the server, so the client form gets strings rather than the whole model. */}
        <ProjectInquiryForm
          defaultDirection={defaultDirection}
          cooperationOptions={cooperationOptions()}
          successMessage={inquirySuccessMessage()}
        />
        {/* Desktop: under the call, beside the form. Phone: after the form, so call → channels → form come first. */}
        <div className="conversation-journey-wrap">
          <p className="conversation-journey-title">Що буде після звернення</p>
          <ol className="conversation-journey">
            {JOURNEY_TITLES.map((stepTitle, index) => (
              <li key={stepTitle}>
                <span className="conversation-journey-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{stepTitle}</h3>
                  <p>{journey[index]}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
