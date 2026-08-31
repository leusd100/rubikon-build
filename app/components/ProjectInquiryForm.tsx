'use client';

import { useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, Phone, Send } from 'lucide-react';
import { inquiryDirectionOptions } from '../data/directions';
import { company, companyContactLinks } from '../data/company';
import { contactMethodOptions, messengerContacts, type ContactMethod } from '../data/contactMethods';
import { siteRoutes } from '../data/navigation';
import { readAttribution } from '../lib/attribution';

type LeadApiResult = {
  ok?: boolean;
  isNew?: boolean;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function generateSubmissionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for the rare environment without crypto.randomUUID (very old browsers, or a
  // non-secure context where the API is unavailable by spec). Not cryptographically strong,
  // but unique enough for an idempotency key — collisions are effectively impossible.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function ContactMethodIcon({ method }: { method: ContactMethod }) {
  if (method === 'Дзвінок') return <Phone aria-hidden="true" />;

  const messenger = method === 'Telegram'
    ? messengerContacts.telegram
    : method === 'WhatsApp'
      ? messengerContacts.whatsapp
      : messengerContacts.viber;

  return <Image src={messenger.icon} width={18} height={18} alt="" aria-hidden="true" />;
}

export default function ProjectInquiryForm({ defaultDirection = '' }: { defaultDirection?: string }) {
  const pathname = usePathname();
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Дзвінок');
  const [status, setStatus] = useState('');
  const [statusAction, setStatusAction] = useState<'error' | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [consentAt, setConsentAt] = useState('');
  const [submissionId] = useState(() => generateSubmissionId());
  const [isSubmitting, setIsSubmitting] = useState(false);

  function hasAnalyticsConsent() {
    try {
      return window.localStorage.getItem('rubikon-analytics-consent') === 'granted';
    } catch {
      return false;
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsentError(false);
    const formData = new FormData(event.currentTarget);

    // Honeypot — a filled hidden field means a bot. Say nothing, do nothing.
    if (value(formData, 'companyWebsite')) return;

    const name = value(formData, 'name');
    const phone = value(formData, 'phone');
    const direction = value(formData, 'direction');
    const attribution = readAttribution();
    setStatusAction(null);

    if (hasAnalyticsConsent()) {
      window.gtag?.('event', 'inquiry_contact_attempt', {
        contact_method: contactMethod.toLowerCase(),
        project_direction: direction,
      });
    }

    setIsSubmitting(true);
    let saved = false;
    let isNewLead = true;
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          name,
          phone,
          contactMethod,
          direction,
          details: {
            location: value(formData, 'location'),
            dimensions: value(formData, 'dimensions'),
            cooperation: value(formData, 'cooperation'),
            startDate: value(formData, 'startDate'),
            comment: value(formData, 'comment'),
          },
          sourcePage: pathname,
          landingPage: attribution.landingPage,
          referrer: attribution.referrer,
          utm: attribution.utm,
          clickIds: attribution.clickIds,
          consentAt: consentAt || new Date().toISOString(),
          privacyVersion: company.privacyVersion,
          companyWebsite: value(formData, 'companyWebsite'),
        }),
      });
      const result = await response.json().catch(() => null) as LeadApiResult | null;
      saved = Boolean(result?.ok);
      // A retry that lands on the idempotent-duplicate branch is still a save (saved=true)
      // but must not count as a second conversion for the same underlying lead.
      isNewLead = result?.isNew !== false;
    } catch {
      saved = false;
    }
    setIsSubmitting(false);

    if (!saved) {
      setStatus(
        'Не вдалося зберегти запит через тимчасову технічну проблему. Зателефонуйте нам напряму, або спробуйте ще раз за хвилину.',
      );
      setStatusAction('error');
      return;
    }

    if (isNewLead && hasAnalyticsConsent()) {
      window.gtag?.('event', 'generate_lead', {
        contact_method: contactMethod.toLowerCase(),
        project_direction: direction,
      });
    }

    setStatus('Дякуємо! Запит надіслано. Наш спеціаліст найближчим часом зв’яжеться з вами способом, який ви обрали.');
  }

  return (
    <form className="inquiry-form" onSubmit={(event) => void handleSubmit(event)}>
      <div className="inquiry-form-heading">
        <div>
          <small>Запит на проєкт</small>
          <span>Коротка форма запиту</span>
        </div>
        <p>Поля, позначені *, обов’язкові</p>
      </div>

      <section className="inquiry-form-section" aria-labelledby="inquiry-contact-heading">
        <div className="inquiry-form-section-heading">
          <span>01</span>
          <h3 id="inquiry-contact-heading">Контакт</h3>
        </div>
        <div className="inquiry-form-section-body">
          <div className="inquiry-fields inquiry-fields-two">
            <label>
              <span>Ваше ім’я *</span>
              <input name="name" type="text" minLength={2} maxLength={80} autoComplete="name" required />
            </label>
            <label>
              <span>Телефон *</span>
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                pattern="\+380[0-9]{9}"
                maxLength={13}
                defaultValue="+380"
                title="Введіть номер у форматі +380XXXXXXXXX"
                aria-describedby="phone-hint"
                autoComplete="tel"
                required
              />
              <small id="phone-hint" className="inquiry-field-hint">Після +380 введіть 9 цифр</small>
            </label>
          </div>

          <fieldset className="inquiry-choice">
            <legend>Як з вами зв’язатися *</legend>
            <div>
              {contactMethodOptions.map(([label, method]) => (
                <label key={method}>
                  <input
                    type="radio"
                    name="contactMethod"
                    value={method}
                    required
                    checked={contactMethod === method}
                    onChange={() => {
                      setContactMethod(method);
                      setStatus('');
                      setStatusAction(null);
                    }}
                  />
                  <span><ContactMethodIcon method={method} /> {label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="inquiry-form-section" aria-labelledby="inquiry-project-heading">
        <div className="inquiry-form-section-heading">
          <span>02</span>
          <h3 id="inquiry-project-heading">Завдання</h3>
        </div>
        <div className="inquiry-form-section-body">
          <label className="inquiry-select">
            <span>Напрям робіт *</span>
            <select name="direction" defaultValue={defaultDirection} required>
              <option value="" disabled>Оберіть напрям</option>
              {inquiryDirectionOptions.map((direction) => <option key={direction}>{direction}</option>)}
            </select>
          </label>

          <details className="inquiry-details">
            <summary>
              <span>Додати деталі про об’єкт</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="inquiry-details-body">
              <div className="inquiry-fields inquiry-fields-two">
                <label>
                  <span>Місто або область</span>
                  <input name="location" type="text" maxLength={100} autoComplete="address-level1" />
                </label>
                <label>
                  <span>Орієнтовні розміри</span>
                  <input name="dimensions" type="text" maxLength={100} placeholder="Наприклад: 20 × 40 × 6 м" />
                </label>
              </div>
              <div className="inquiry-fields inquiry-fields-two">
                <label>
                  <span>Формат співпраці</span>
                  <select name="cooperation" defaultValue="">
                    <option value="">Ще не визначено</option>
                    <option>Об’єкт під ключ</option>
                    <option>Окремий етап робіт</option>
                    <option>Підряд або субпідряд</option>
                  </select>
                </label>
                <label>
                  <span>Бажаний початок робіт</span>
                  <input name="startDate" type="text" maxLength={80} placeholder="Наприклад: осінь 2026" />
                </label>
              </div>
              <label>
                <span>Коментар</span>
                <textarea name="comment" rows={4} maxLength={800} placeholder="Що ще важливо знати про завдання" />
              </label>
            </div>
          </details>
        </div>
      </section>

      <section className="inquiry-form-section inquiry-form-section-submit" aria-labelledby="inquiry-submit-heading">
        <div className="inquiry-form-section-heading">
          <span>03</span>
          <h3 id="inquiry-submit-heading">Підтвердження</h3>
        </div>
        <div className="inquiry-form-section-body inquiry-form-submit-layout">
          <label className={`inquiry-consent${consentError ? ' is-invalid' : ''}`}>
            <input
              name="privacyConsent"
              type="checkbox"
              value="accepted"
              required
              aria-invalid={consentError}
              aria-describedby={consentError ? 'privacy-consent-error' : undefined}
              onInvalid={() => setConsentError(true)}
              onChange={(event) => {
                setConsentError(false);
                if (event.target.checked) setConsentAt(new Date().toISOString());
              }}
            />
            <span>
              Погоджуюся на обробку персональних даних для опрацювання мого запиту відповідно до{' '}
              <a href={siteRoutes.privacy}>Політики конфіденційності</a>.
            </span>
            {consentError && <small id="privacy-consent-error">Підтвердьте згоду на обробку персональних даних.</small>}
          </label>

          <div className="inquiry-submit-group">
            <button className="button button-primary inquiry-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Надсилаємо…' : 'Надіслати запит'}{' '}
              {!isSubmitting && <Send aria-hidden="true" />}
            </button>
            <p className="inquiry-submit-note">
              Заявка потрапить до нас, а обраний канал використаємо для відповіді
            </p>
          </div>
        </div>
      </section>

      <label className="form-trap" aria-hidden="true">
        Сайт компанії
        <input name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <p className={`inquiry-status${status ? ' is-visible' : ''}${statusAction === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {status}
        {statusAction === 'error' && (
          <span className="inquiry-status-actions">
            <a href={companyContactLinks.phone}><Phone aria-hidden="true" /> {company.phone.display}</a>
          </span>
        )}
      </p>
    </form>
  );
}
