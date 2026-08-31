import { MessagesSquare, Phone } from 'lucide-react';
import ProjectInquiryForm from './ProjectInquiryForm';
import { MessengerLinks } from './SiteChrome';
import { company, companyContactLinks } from '../data/company';

type InquirySectionProps = {
  eyebrow: string;
  title: string;
  text?: string;
  defaultDirection?: string;
};

/**
 * The local, on-page counterpart to the homepage's #inquiry section — embedded at the end of
 * every direction page, /pro-nas and /napryamky so a visitor never has to leave the page they
 * landed on (and lose their direction context) just to reach the form. Reuses the homepage's
 * .contact styling directly rather than inventing a parallel set of classes.
 */
export default function InquirySection({
  eyebrow,
  title,
  text = 'Залиште контактні дані й коротко опишіть завдання. Ознайомимося із запитом, зв’яжемося з вами та підкажемо, що потрібно для предметного обговорення проєкту.',
  defaultDirection,
}: InquirySectionProps) {
  return (
    <section className="contact section" id="inquiry">
      <div className="shell contact-grid">
        <div className="contact-intro">
          <div className="contact-copy">
            <p className="eyebrow light"><span /> {eyebrow}</p>
            <h2>{title}</h2>
            <p>{text}</p>
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
          </div>
        </div>
        <ProjectInquiryForm defaultDirection={defaultDirection} />
      </div>
    </section>
  );
}
