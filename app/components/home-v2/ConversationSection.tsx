import { Mail, Phone } from 'lucide-react';
import ProjectInquiryForm from '../ProjectInquiryForm';
import { MessengerLinks } from '../SiteChrome';
import { company, companyContactLinks } from '../../data/company';
import { cooperationOptions, inquirySuccessMessage } from '../../lib/deliveryModelPresentation';

// HOME v2 — ONE closing contact moment. It merges «Що підготувати / Що буде після звернення» with the inquiry form,
// so the call, the written channels and «почнемо з розмови» each appear once. The step texts are shortened from the
// published four steps (#124) and promise nothing new: no time, no price, no visit; the design stays the customer's.
// The background is a decorative desk-and-drawings photo — never evidence of our work.
const journey: readonly { title: string; text: string }[] = [
  { title: 'Уточнюємо задачу', text: 'Для чого об’єкт, які роботи потрібні й де будуємо. Скажемо, чи це наш профіль.' },
  { title: 'Дивимося, що вже є', text: 'Опис, креслення чи проєкт — проєкт надаєте ви або ваш проєктувальник. Якщо даних бракує, підкажемо, що підготувати.' },
  { title: 'Узгоджуємо склад робіт', text: 'Яку будівельну частину беремо на себе і як вона стикується з проєктом та роботами інших виконавців.' },
  { title: 'Готуємо кошторис', text: 'Коли склад робіт визначено й проєктних даних достатньо — кошторис погодженого обсягу.' },
];

export function ConversationSection() {
  return (
    <section className="hv2-conversation section" id="inquiry" aria-labelledby="hv2-conversation-title">
      <div className="hv2-conversation-bg" aria-hidden="true">
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
      <div className="shell hv2-conversation-grid">
        <div className="hv2-conversation-intro">
          <p className="hv2-kicker"><span aria-hidden="true" /> Почнемо з розмови</p>
          <h2 id="hv2-conversation-title">Розкажіть коротко про завдання</h2>
          <p className="hv2-conversation-lead">
            Можна почати з ідеї або з готового проєкту. Найшвидше — зателефонувати; якщо зручніше писати — залиште запит.
          </p>
          {/* One aligned block: the call on top at full width, the written channels under it on an equal grid. */}
          <div className="hv2-conversation-contact">
            <a className="button button-primary hero-call-primary hv2-call" href={companyContactLinks.phone} aria-label={`Зателефонувати, ${company.phone.display}`}>
              <span className="hv2-call-icon" aria-hidden="true"><Phone /></span>
              <span className="hv2-call-text"><small>Зателефонувати</small><strong>{company.phone.display}</strong></span>
              <span className="hv2-call-arrow" aria-hidden="true">↗</span>
            </a>
            <p className="hv2-channels-label">Або напишіть</p>
            <div className="hv2-conversation-channels">
              <MessengerLinks className="hv2-messengers" showFullLabels />
              <a className="messenger-link hv2-email" href={companyContactLinks.email} aria-label={`Email: ${company.email}`}>
                <Mail aria-hidden="true" />
                <span>Email</span>
              </a>
            </div>
          </div>
          <ol className="hv2-journey" aria-label="Що буде після звернення">
            {journey.map(({ title, text }, index) => (
              <li key={title}>
                <span className="hv2-journey-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <ProjectInquiryForm cooperationOptions={cooperationOptions()} successMessage={inquirySuccessMessage()} />
      </div>
    </section>
  );
}
