import { Mail, MessagesSquare, Phone } from 'lucide-react';
import ProjectInquiryForm from './ProjectInquiryForm';
import { MessengerLinks } from './SiteChrome';
import { company, companyContactLinks } from '../data/company';
import { cooperationOptions, inquirySuccessMessage } from '../lib/deliveryModelPresentation';
import type { ReactNode } from 'react';

type InquirySectionProps = {
  eyebrow: string;
  /** ReactNode, not string: the homepage's own title carries a deliberate <br> so the two lines
   *  break where the editorial wants them to, not wherever the column happens to end. */
  title: ReactNode;
  text?: string;
  defaultDirection?: string;
  /** A short page-specific list beside the form, e.g. what helps the first conversation. */
  checklist?: { title: string; items: readonly string[] };
};

/**
 * The one #inquiry section on the site — the homepage's own conversion section and the copy
 * embedded at the end of every direction page, /pro-nas and /napryamky, so a visitor never has
 * to leave the page they landed on (and lose their direction context) to reach the form.
 *
 * The homepage used to carry its own hand-written copy of this markup. The two drifted (the
 * homepage's copy still had an `id="contact-note"` nothing referenced), which is exactly the
 * failure mode owning it in one place prevents: the phone/messenger/email block below is the
 * contact detail for the whole site, and it is now edited once.
 */
export default function InquirySection({
  eyebrow,
  title,
  text = 'Залиште контакт і коротко опишіть завдання. Ми уточнимо вихідні дані та запропонуємо наступний крок.',
  defaultDirection,
  checklist,
}: Readonly<InquirySectionProps>) {
  return (
    <section className="contact section" id="inquiry">
      <div className="shell contact-grid">
        <div className="contact-intro">
          <div className="contact-copy">
            <p className="eyebrow light"><span /> {eyebrow}</p>
            <h2>{title}</h2>
            <p>{text}</p>
            {checklist && (
              <div className="contact-checklist">
                <h3>{checklist.title}</h3>
                <ul>{checklist.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            )}
          </div>
          <div className="contact-links">
            <a className="pending-contact contact-phone" href={companyContactLinks.phone}>
              <b><Phone aria-hidden="true" />Телефон</b><i>{company.phone.display}</i>
            </a>
            <div className="pending-contact contact-messenger-row">
              <b>
                <MessagesSquare aria-hidden="true" />
                <span>Месенджери<small>Telegram · WhatsApp · Viber</small></span>
              </b>
              <MessengerLinks className="contact-messengers" />
            </div>
            <a className="pending-contact contact-email" href={companyContactLinks.email}>
              <b><Mail aria-hidden="true" />Email</b>{' '}<i>{company.email}</i>
            </a>
          </div>
        </div>
        {/* Resolved here, on the server, so the client form gets strings rather than the whole model. */}
        <ProjectInquiryForm
          defaultDirection={defaultDirection}
          cooperationOptions={cooperationOptions()}
          successMessage={inquirySuccessMessage()}
        />
      </div>
    </section>
  );
}
