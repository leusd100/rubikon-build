'use client';

import { useState, useSyncExternalStore, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, Phone, Send } from 'lucide-react';
import { inquiryDirectionOptions } from '../data/directions';
import { company, companyContactLinks } from '../data/company';
import { contactMethodOptions, messengerContacts, type ContactMethod } from '../data/contactMethods';
import { siteRoutes } from '../data/navigation';
import { filterAttributionForConsent, readAttribution } from '../lib/attribution';
import { hasAdvertisingConsent, hasAnalyticsConsent } from '../lib/consent';
import { toInquiryAttachmentPayload } from '../lib/inquiry/attachment';
import { createSubmissionId, submissionIdAfterAttempt } from '../lib/inquiry/submissionId';
import { useInquiryAttachment } from './inquiry/InquiryAttachmentProvider';
import { InquiryAttachmentSummary } from './inquiry/InquiryAttachmentSummary';

type LeadApiResult = {
  ok?: boolean;
  isNew?: boolean;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

const subscribeToHydration = () => () => undefined;

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
  // Whatever the page's configurator or planner attached — the form knows neither of them.
  const inquiryAttachment = useInquiryAttachment();
  const attachment = inquiryAttachment?.attachment ?? null;
  const dimensionsField = attachment?.dimensionsField ?? { mode: 'manual' as const };
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Дзвінок');
  const [status, setStatus] = useState('');
  const [statusAction, setStatusAction] = useState<'error' | null>(null);
  const [consentError, setConsentError] = useState(false);
  const [consentAt, setConsentAt] = useState('');
  const [submissionId, setSubmissionId] = useState(() => createSubmissionId());
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Server markup is deliberately non-submittable. Hydration enables both successful-control
  // names and the submit button; without JS, no personal field can enter a native URL/query.
  const jsReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsentError(false);
    const formData = new FormData(event.currentTarget);

    // Honeypot — a filled hidden field means a bot. Say nothing, do nothing.
    if (value(formData, 'companyWebsite')) return;

    const name = value(formData, 'name');
    const phone = value(formData, 'phone');
    const direction = value(formData, 'direction');
    // landingPage/referrer/utm are lead-context data and always kept; gclid/gbraid/wbraid exist
    // only to match this lead to a Google Ads click, so they're stripped here unless the visitor
    // has granted Advertising consent as of this exact submission — see filterAttributionForConsent.
    const attribution = filterAttributionForConsent(readAttribution(), {
      advertisingGranted: hasAdvertisingConsent(),
    });
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
            // configuration keeps its pre-attachment key and text; attachment adds kind/version/data.
            ...(attachment ? { configuration: attachment.text, attachment: toInquiryAttachmentPayload(attachment) } : {}),
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

    // Retries before success keep the same key. A confirmed save completes that lifecycle, so the
    // next explicit submit on this mounted page is a genuinely new lead with a fresh key.
    setSubmissionId((current) => submissionIdAfterAttempt(current, true));
    setStatus('Дякуємо! Запит надіслано. Наш спеціаліст найближчим часом зв’яжеться з вами способом, який ви обрали.');
  }

  return (
    <form className="inquiry-form" aria-label="Запит на проєкт" method="post" onSubmit={(event) => void handleSubmit(event)}>
      <div className="inquiry-form-heading">
        <p className="inquiry-form-kicker"><span aria-hidden="true" /> Короткий запит</p>
        <p className="inquiry-required-note">Поля, позначені *, обов’язкові</p>
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
              <input name={jsReady ? 'name' : undefined} type="text" minLength={2} maxLength={80} autoComplete="name" required />
            </label>
            <label>
              <span>Телефон *</span>
              <input
                name={jsReady ? 'phone' : undefined}
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
                    name={jsReady ? 'contactMethod' : undefined}
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
          {attachment && inquiryAttachment && (
            <InquiryAttachmentSummary attachment={attachment} onDetach={inquiryAttachment.detach} />
          )}

          <label className="inquiry-select">
            <span>Напрям робіт *</span>
            <select name={jsReady ? 'direction' : undefined} defaultValue={defaultDirection} required>
              <option value="" disabled>Оберіть напрям</option>
              {inquiryDirectionOptions.map((direction) => <option key={direction}>{direction}</option>)}
            </select>
          </label>

          <div className="inquiry-task-summary">
            <label htmlFor="inquiry-comment"><span>Коротко про завдання</span></label>
            <textarea
              id="inquiry-comment"
              name={jsReady ? 'comment' : undefined}
              rows={3}
              maxLength={800}
              placeholder="Що потрібно побудувати або який етап виконати"
              aria-describedby="inquiry-comment-hint"
            />
            <small id="inquiry-comment-hint" className="inquiry-field-hint">
              Якщо маєте креслення або специфікацію, напишіть про це — узгодимо передачу файлів у відповідь.
            </small>
          </div>

          <details className="inquiry-details">
            <summary>
              <span>Додати параметри об’єкта</span>
              <ChevronDown aria-hidden="true" />
            </summary>
            <div className="inquiry-details-body">
              <div className="inquiry-fields inquiry-fields-two">
                <label className={dimensionsField.mode === 'manual' ? undefined : 'inquiry-field-full'}>
                  <span>Місто або область</span>
                  <input name={jsReady ? 'location' : undefined} type="text" maxLength={100} autoComplete="address-level1" />
                </label>
                {dimensionsField.mode === 'fixed' && (
                  <input name={jsReady ? 'dimensions' : undefined} type="hidden" value={dimensionsField.value} />
                )}
                {dimensionsField.mode === 'manual' && (
                  <label>
                    <span>Орієнтовні розміри</span>
                    <input key="manual" name={jsReady ? 'dimensions' : undefined} type="text" maxLength={100} placeholder="Наприклад: 20 × 40 × 6 м" />
                  </label>
                )}
              </div>
              <div className="inquiry-fields inquiry-fields-two">
                <label>
                  <span>Формат співпраці</span>
                  <select name={jsReady ? 'cooperation' : undefined} defaultValue="">
                    <option value="">Ще не визначено</option>
                    <option>Об’єкт під ключ</option>
                    <option>Окремий етап робіт</option>
                    <option>Підряд або субпідряд</option>
                  </select>
                </label>
                <label>
                  <span>Бажаний початок робіт</span>
                  <input name={jsReady ? 'startDate' : undefined} type="text" maxLength={80} placeholder="Наприклад: осінь 2026" />
                </label>
              </div>
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
              name={jsReady ? 'privacyConsent' : undefined}
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
            <button className="button button-primary inquiry-submit" type="submit" disabled={isSubmitting || !jsReady}>
              {isSubmitting ? 'Надсилаємо…' : 'Надіслати запит'}{' '}
              {!isSubmitting && <Send aria-hidden="true" />}
            </button>
            <p className="inquiry-submit-note">
              Після надсилання спеціаліст зв’яжеться з вами обраним способом.
            </p>
            <noscript>
              <p className="inquiry-noscript">
                Для онлайн-заявки потрібен JavaScript. Зателефонуйте нам напряму:{' '}
                <a href={companyContactLinks.phone}>{company.phone.display}</a>.
              </p>
            </noscript>
          </div>
        </div>
      </section>

      <label className="form-trap" aria-hidden="true">
        Сайт компанії
        <input name={jsReady ? 'companyWebsite' : undefined} type="text" tabIndex={-1} autoComplete="off" />
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
