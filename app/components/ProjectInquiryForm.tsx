'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, Phone, Send } from 'lucide-react';
import { inquiryDirectionOptions } from '../data/directions';
import { company, companyContactLinks } from '../data/company';
import { contactMethodOptions, messengerContacts, type ContactMethod } from '../data/contactMethods';
import { siteRoutes } from '../data/navigation';
import { filterAttributionForConsent, readAttribution } from '../lib/attribution';
import { hasAdvertisingConsent, hasAnalyticsConsent } from '../lib/consent';
import { queueInquiryAnalyticsEvent } from '../lib/inquiry/analytics';
import { toInquiryAttachmentPayload } from '../lib/inquiry/attachment';
import { createSubmissionId, nextSubmissionIdAfterSuccess } from '../lib/inquiry/submissionId';
import { useInquiryAttachment } from './inquiry/InquiryAttachmentProvider';
import { InquiryAttachmentSummary } from './inquiry/InquiryAttachmentSummary';
import { useTurnstile } from './inquiry/useTurnstile';

type LeadApiResult = {
  ok?: boolean;
  id?: number;
  isNew?: boolean;
  error?: string;
};

const SAVE_FAILED_MESSAGE =
  'Не вдалося підтвердити збереження запиту. Повторіть надсилання без змін — це не створить дубль. Якщо зміните дані, надішлемо окремий запит: попередній уже міг бути збережений.';
// Deliberately generic: says nothing about why the check failed or how it works.
const VERIFICATION_FAILED_MESSAGE =
  'Не вдалося підтвердити надсилання запиту. Спробуйте ще раз або зателефонуйте нам напряму.';

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

const subscribeToHydration = () => () => undefined;

function enabledFieldName(jsReady: boolean, name: string): string | undefined {
  return jsReady ? name : undefined;
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

type ProjectInquiryFormProps = {
  defaultDirection?: string;
  /** Delivery Model format labels for «Формат співпраці»; the stored value is the label. */
  cooperationOptions: readonly string[];
  /** The saved-state text, ending in the model's frozen first-contact statement. */
  successMessage: string;
};

export default function ProjectInquiryForm({ defaultDirection = '', cooperationOptions, successMessage }: Readonly<ProjectInquiryFormProps>) {
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
  // The disabled button only takes effect after a re-render; this ref blocks a second submit
  // event that arrives before it (a fast double click or a double Enter).
  const submittingRef = useRef(false);
  const lastAttempt = useRef<{ id: string; signature: string } | null>(null);
  const acknowledgedLeadIds = useRef(new Set<number>());
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstile = useTurnstile(turnstileRef);
  const { prepare: prepareTurnstile } = turnstile;
  // Server markup is deliberately non-submittable. Hydration enables both successful-control
  // names and the submit button; without JS, no personal field can enter a native URL/query.
  const jsReady = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  // Turnstile's script loads only once the form is near the viewport or gets focus — pages whose
  // visitors never reach the form never fetch it. A failure here is retried on submit.
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const start = () => void prepareTurnstile().catch(() => undefined);
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        start();
      }
    }, { rootMargin: '600px 0px' });
    observer.observe(form);
    form.addEventListener('focusin', start, { once: true });
    return () => {
      observer.disconnect();
      form.removeEventListener('focusin', start);
    };
  }, [prepareTurnstile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    setConsentError(false);
    const formData = new FormData(event.currentTarget);

    // Honeypot — a filled hidden field means a bot. Say nothing, do nothing.
    if (value(formData, 'companyWebsite')) return;
    submittingRef.current = true;

    const name = value(formData, 'name');
    const phone = value(formData, 'phone');
    const direction = value(formData, 'direction');
    // landingPage/referrer/utm are lead-context data and always kept; gclid/gbraid/wbraid exist
    // only to match this lead to a Google Ads click, so they're stripped here unless the visitor
    // has granted Advertising consent as of this exact submission — see filterAttributionForConsent.
    const attribution = filterAttributionForConsent(readAttribution(), {
      advertisingGranted: hasAdvertisingConsent(),
    });
    // A new attempt clears the previous outcome, so an old error never sits under a running
    // challenge or the «Надсилаємо…» button.
    setStatus('');
    setStatusAction(null);

    // One business payload belongs to one idempotency key. Changed fields (including
    // attachments) are a new inquiry, never a silent acknowledgement of an old payload.
    const businessPayload = {
      name, phone, contactMethod, direction,
      details: {
        location: value(formData, 'location'),
        dimensions: value(formData, 'dimensions'),
        cooperation: value(formData, 'cooperation'),
        startDate: value(formData, 'startDate'),
        comment: value(formData, 'comment'),
        ...(attachment ? { configuration: attachment.text, attachment: toInquiryAttachmentPayload(attachment) } : {}),
      },
    };
    const signature = JSON.stringify(businessPayload);
    const requestId = lastAttempt.current
      ? lastAttempt.current.signature === signature ? lastAttempt.current.id : createSubmissionId()
      : submissionId;
    lastAttempt.current = { id: requestId, signature };
    queueInquiryAnalyticsEvent('inquiry_contact_attempt', {
      contact_method: contactMethod.toLowerCase(), project_direction: direction,
    });

    setIsSubmitting(true);
    let saved = false;
    let savedLeadId: number | undefined;
    let verificationFailed = false;
    try {
      let turnstileToken: string;
      try {
        turnstileToken = await turnstile.getToken();
      } catch {
        verificationFailed = true;
        throw new Error('verification');
      }
      const response = await fetch('/api/leads', {
        method: 'POST',
        signal: AbortSignal.timeout(20_000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          submissionId: requestId,
          ...businessPayload,
          sourcePage: pathname,
          landingPage: attribution.landingPage,
          referrer: attribution.referrer,
          utm: attribution.utm,
          clickIds: attribution.clickIds,
          consentAt: consentAt || new Date().toISOString(),
          privacyVersion: company.privacyVersion,
          companyWebsite: value(formData, 'companyWebsite'),
          turnstileToken,
        }),
      });
      const result = await response.json().catch(() => null) as LeadApiResult | null;
      saved = response.ok && result?.ok === true;
      savedLeadId = result?.id;
      verificationFailed = !saved && (result?.error === 'verification' || result?.error === 'verification_unavailable');
    } catch {
      saved = false;
    }
    // Every token is single-use: whatever happened, the next submit needs a fresh challenge.
    turnstile.reset();
    submittingRef.current = false;
    setIsSubmitting(false);

    if (!saved) {
      setStatus(verificationFailed ? VERIFICATION_FAILED_MESSAGE : SAVE_FAILED_MESSAGE);
      setStatusAction('error');
      return;
    }

    // Count a saved lead once per mounted form, including a duplicate acknowledgement
    // after a lost response. Server identity also protects against repeated acknowledgements;
    // isNew=false alone cannot distinguish a lost response from an already-counted lead.
    const firstAcknowledgement = typeof savedLeadId === 'number' && savedLeadId > 0
      && !acknowledgedLeadIds.current.has(savedLeadId);
    if (firstAcknowledgement) {
      const consentGranted = hasAnalyticsConsent();
      const queued = consentGranted && queueInquiryAnalyticsEvent('generate_lead', {
        contact_method: contactMethod.toLowerCase(), project_direction: direction,
      });
      // No retroactive event after denial; eligible events are deduplicated only once queued.
      if (!consentGranted || queued) acknowledgedLeadIds.current.add(savedLeadId!);
    }

    // Retries before success keep the same key. A confirmed save completes that lifecycle, so the
    // next explicit submit on this mounted page is a genuinely new lead with a fresh key.
    lastAttempt.current = null;
    setSubmissionId(() => nextSubmissionIdAfterSuccess());
    setStatus(successMessage);
  }

  return (
    <form ref={formRef} className="inquiry-form" aria-label="Запит на проєкт" method="post" onSubmit={(event) => void handleSubmit(event)}>
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
              <input name={enabledFieldName(jsReady, 'name')} type="text" minLength={2} maxLength={80} autoComplete="name" required />
            </label>
            <label>
              <span>Телефон *</span>
              <input
                name={enabledFieldName(jsReady, 'phone')}
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
                    name={enabledFieldName(jsReady, 'contactMethod')}
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
            <select name={enabledFieldName(jsReady, 'direction')} defaultValue={defaultDirection} required>
              <option value="" disabled>Оберіть напрям</option>
              {inquiryDirectionOptions.map((direction) => <option key={direction}>{direction}</option>)}
            </select>
          </label>

          <div className="inquiry-task-summary">
            <label htmlFor="inquiry-comment"><span>Коротко про завдання</span></label>
            <textarea
              id="inquiry-comment"
              name={enabledFieldName(jsReady, 'comment')}
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
                  <input name={enabledFieldName(jsReady, 'location')} type="text" maxLength={100} autoComplete="address-level1" />
                </label>
                {dimensionsField.mode === 'fixed' && (
                  <input name={enabledFieldName(jsReady, 'dimensions')} type="hidden" value={dimensionsField.value} />
                )}
                {dimensionsField.mode === 'manual' && (
                  <label>
                    <span>Орієнтовні розміри</span>
                    <input key="manual" name={enabledFieldName(jsReady, 'dimensions')} type="text" maxLength={100} placeholder="Наприклад: 20 × 40 × 6 м" />
                  </label>
                )}
              </div>
              <div className="inquiry-fields inquiry-fields-two">
                <label>
                  <span>Формат співпраці</span>
                  <select name={enabledFieldName(jsReady, 'cooperation')} defaultValue="">
                    <option value="">Ще не визначено</option>
                    {cooperationOptions.map((label) => <option key={label}>{label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Бажаний початок робіт</span>
                  <input name={enabledFieldName(jsReady, 'startDate')} type="text" maxLength={80} placeholder="Наприклад: осінь 2026" />
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
        <div className={`inquiry-form-section-body inquiry-form-submit-layout${turnstile.challengeVisible ? ' has-turnstile-challenge' : ''}`}>
          <label className={`inquiry-consent${consentError ? ' is-invalid' : ''}`}>
            <input
              name={enabledFieldName(jsReady, 'privacyConsent')}
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
            {/* Empty and zero-height unless Cloudflare asks for an interaction. */}
            <div ref={turnstileRef} className="inquiry-turnstile" data-turnstile-state={turnstile.state} />
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
        {' '}
        <input name={enabledFieldName(jsReady, 'companyWebsite')} type="text" tabIndex={-1} autoComplete="off" />
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
