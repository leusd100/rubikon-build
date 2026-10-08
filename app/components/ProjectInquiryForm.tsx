'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type SyntheticEvent } from 'react';
import { usePathname } from 'next/navigation';
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
import { dimensionsFieldView } from './inquiry/formAttachment';
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
  'Не вдалося надіслати запит. Спробуйте ще раз або зателефонуйте нам: +38 068 261 42 64';

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

const subscribeToHydration = () => () => undefined;

type ValidatedField = HTMLInputElement | HTMLSelectElement;

type FieldKey = 'name' | 'phone' | 'direction';
type FieldMessages = { missing: string; format?: string; empty?: (value: string) => boolean };

/**
 * Ukrainian words for the browser's own validation bubble — and, since 07.10, the same words kept under the field. The
 * browser keeps its behaviour — it stops the submit and focuses the first field to fix — but its default message follows
 * the visitor's system language (an audit browser said «Заполните это поле»), and the bubble vanished at the next tap
 * while the consent kept its message on the page: now every field does, until it is edited. The message is set when a
 * field is found invalid and cleared on the next edit, so the browser checks the field afresh.
 */
function ukrainianValidity(key: FieldKey, messages: FieldMessages, report: (key: FieldKey, message: string | null) => void) {
  return {
    onInvalid: (event: SyntheticEvent<ValidatedField>) => {
      const field = event.currentTarget;
      if (!field.validity.customError) {
        // a field that only holds its own prefix is empty, not mistyped (08.10, audit F142: «+380» read as a bad format)
        const missing = field.validity.valueMissing || Boolean(messages.empty?.(field.value));
        field.setCustomValidity(missing ? messages.missing : messages.format ?? messages.missing);
      }
      report(key, field.validationMessage);
    },
    onInput: (event: SyntheticEvent<ValidatedField>) => {
      event.currentTarget.setCustomValidity('');
      report(key, null);
    },
  };
}

const NAME_MESSAGES: FieldMessages = { missing: 'Вкажіть, як до вас звертатися.', format: 'Ім’я — щонайменше 2 літери.' };
const PHONE_MESSAGES: FieldMessages = {
  missing: 'Вкажіть номер телефону.',
  format: 'Номер у форматі +380XXXXXXXXX: після +380 — 9 цифр.',
  empty: (value) => value.replace(/\s/g, '') === '+380',
};
const DIRECTION_MESSAGES: FieldMessages = { missing: 'Оберіть напрям робіт або «Ще не визначено».' };
const CONSENT_MESSAGE = 'Підтвердьте згоду на обробку персональних даних.';

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

  // eslint-disable-next-line @next/next/no-img-element -- an 18 px SVG; see MessengerLinks in SiteChrome.tsx
  return <img src={messenger.icon} width={18} height={18} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
}

type ProjectInquiryFormProps = {
  defaultDirection?: string;
  /** Delivery Model format labels for «Формат співпраці»; the stored value is the label. */
  cooperationOptions: readonly string[];
  /** The saved-state text, ending in the model's frozen first-contact statement. */
  successMessage: string;
};

type SentRequest = { phone: string; method: ContactMethod; brief: string | null };

function withFieldError(current: Partial<Record<FieldKey, string>>, key: FieldKey, message: string | null) {
  if ((current[key] ?? null) === message) return current;
  const next = { ...current };
  if (message) next[key] = message;
  else delete next[key];
  return next;
}

/** After a saved request: what went out, in place of the filled form (08.10, audit F155) */
function InquirySentPanel({ sent, onAnother }: Readonly<{ sent: SentRequest; onAnother: () => void }>) {
  return (
    <section className="inquiry-sent" aria-labelledby="inquiry-sent-title">
      <h3 id="inquiry-sent-title">Запит надіслано</h3>
      <dl>
        {sent.brief && <div><dt>Конфігурація</dt><dd translate="no">{sent.brief}</dd></div>}
        <div><dt>Зв’яжемося</dt><dd translate="no">{sent.phone} · {sent.method}</dd></div>
      </dl>
      <button type="button" onClick={onAnother}>Виправити номер або надіслати ще один запит</button>
    </section>
  );
}

/** «Не додавати» leaves a line with the way back, not nothing (08.10, audit F87) */
function DetachedBriefLine({ source }: Readonly<{ source: ReturnType<typeof useInquiryAttachment> }>) {
  if (source?.status.status !== 'detached' || !source.reattach) return null;
  return (
    <p className="inquiry-config-detached">
      Конфігурацію не додано.{' '}
      <button type="button" onClick={source.reattach}>Додати знову</button>
    </p>
  );
}

export default function ProjectInquiryForm({ defaultDirection = '', cooperationOptions, successMessage }: Readonly<ProjectInquiryFormProps>) {
  const pathname = usePathname();
  // Whatever the page's configurator or planner attached — the form knows neither of them.
  const inquiryAttachment = useInquiryAttachment();
  const attachment = inquiryAttachment?.attachment ?? null;
  // A brief that went out with a saved lead stays on the form, says so, and is not sent again until it changes (04.10)
  const briefSent = Boolean(inquiryAttachment?.sent);
  const leadAttachment = briefSent ? null : attachment;
  // A brief from the page's own tool already says what the work is: the page's preset direction becomes a line in the
  // brief card and is submitted unchanged (owner, 03.10). «Не додавати» brings the select back — with the visitor's own
  // choice in it: the select used to come back on the preset, what they had chosen lost (sweep 03.10).
  const fixedDirection = attachment && defaultDirection ? defaultDirection : undefined;
  const [chosenDirection, setChosenDirection] = useState(defaultDirection);
  // What the visitor typed in «Орієнтовні розміри» outlives a brief with sizes of its own (formAttachment.ts)
  const [typedDimensions, setTypedDimensions] = useState('');
  const [dimensionsTypedOnce, setDimensionsTypedOnce] = useState(false);
  const dimensions = dimensionsFieldView(attachment?.dimensionsField ?? null, typedDimensions, dimensionsTypedOnce, briefSent);
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Дзвінок');
  const [status, setStatus] = useState('');
  const [statusAction, setStatusAction] = useState<'error' | null>(null);
  const [consentError, setConsentError] = useState(false);
  // After a saved request: what went out, shown in place of the filled form (08.10, audit F155)
  const [sentPanel, setSentPanel] = useState<SentRequest | null>(null);
  // The fields' own messages, kept under them while they stand (07.10)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const report = (key: FieldKey, message: string | null) => setFieldErrors((current) => withFieldError(current, key, message));
  const NAME_VALIDITY = ukrainianValidity('name', NAME_MESSAGES, report);
  const PHONE_VALIDITY = ukrainianValidity('phone', PHONE_MESSAGES, report);
  const DIRECTION_VALIDITY = ukrainianValidity('direction', DIRECTION_MESSAGES, report);
  // A new brief to send (the configuration changed after the request went out) closes the panel: the form shows it
  const shownSent = leadAttachment ? null : sentPanel;
  const fieldError = (key: FieldKey) => fieldErrors[key] && (
    <small id={`inquiry-${key}-error`} className="inquiry-field-error">{fieldErrors[key]}</small>
  );
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
        ...(leadAttachment ? { configuration: leadAttachment.text, attachment: toInquiryAttachmentPayload(leadAttachment) } : {}),
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
    setSentPanel({ phone, method: contactMethod, brief: leadAttachment?.headline ?? null });
    // The brief this lead carried counts as sent: route node 01 and the phone «До заявки» stop asking to send it, and a
    // later submit — a new lead, as above — goes without it unless the configuration changes (04.10)
    if (leadAttachment) inquiryAttachment?.markSent(leadAttachment);
  }

  return (
    <form ref={formRef} className="inquiry-form" aria-label="Короткий запит" method="post" onSubmit={(event) => void handleSubmit(event)}>
      <div className="inquiry-form-heading">
        <p className="inquiry-form-kicker"><span aria-hidden="true" /> Короткий запит</p>
        <p className="inquiry-required-note">Поля, позначені *, обов’язкові</p>
      </div>

      {shownSent && (
        <InquirySentPanel
          sent={shownSent}
          onAnother={() => {
            setSentPanel(null);
            setStatus('');
            window.requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>('input[type="tel"]')?.focus());
          }}
        />
      )}
      <div className="inquiry-form-fields" hidden={Boolean(shownSent)}>
        {!attachment && <DetachedBriefLine source={inquiryAttachment} />}
        {/* Owner, 03.10: an attached brief opens the form, above «Контакт» — after «Обговорити цю конфігурацію» a phone shows
            the brief, the name and the phone on one screen. Without a brief the form starts with «Контакт» as before. */}
        {attachment && inquiryAttachment && (
          <div className="inquiry-form-section inquiry-form-section-brief">
            <InquiryAttachmentSummary attachment={attachment} onDetach={inquiryAttachment.detach} direction={fixedDirection} sent={briefSent} />
            {fixedDirection && <input name={enabledFieldName(jsReady, 'direction')} type="hidden" value={fixedDirection} />}
          </div>
        )}

        <section className="inquiry-form-section" aria-labelledby="inquiry-contact-heading">
          <h3 className="inquiry-form-section-title" id="inquiry-contact-heading">Контакт</h3>
          <div className="inquiry-form-section-body">
            <div className="inquiry-fields inquiry-fields-two">
              <label className={fieldErrors.name ? 'is-invalid' : undefined}>
                <span>Ваше ім’я *</span>
                <input
                  name={enabledFieldName(jsReady, 'name')}
                  type="text"
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  required
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={fieldErrors.name ? 'inquiry-name-error' : undefined}
                  {...NAME_VALIDITY}
                />
                {fieldError('name')}
              </label>
              <label className={fieldErrors.phone ? 'is-invalid' : undefined}>
                <span>Телефон *</span>
                <input
                  name={enabledFieldName(jsReady, 'phone')}
                  type="tel"
                  inputMode="tel"
                  pattern="\+380[0-9]{9}"
                  maxLength={13}
                  defaultValue="+380"
                  title="Введіть номер у форматі +380XXXXXXXXX"
                  aria-describedby={fieldErrors.phone ? 'inquiry-phone-error' : 'phone-hint'}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  autoComplete="tel"
                  required
                  {...PHONE_VALIDITY}
                />
                {/* the error takes the hint's place: one line under the field, never the same thing said twice (08.10) */}
                {fieldErrors.phone ? fieldError('phone') : <small id="phone-hint" className="inquiry-field-hint">Після +380 введіть 9 цифр</small>}
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
          <h3 className="inquiry-form-section-title" id="inquiry-project-heading" tabIndex={-1}>Завдання</h3>
          <div className="inquiry-form-section-body">
            {!fixedDirection && (
              <label className={`inquiry-select${fieldErrors.direction ? ' is-invalid' : ''}`}>
                <span>Напрям робіт *</span>
                <select
                  name={enabledFieldName(jsReady, 'direction')}
                  value={chosenDirection}
                  required
                  aria-invalid={Boolean(fieldErrors.direction)}
                  aria-describedby={fieldErrors.direction ? 'inquiry-direction-error' : undefined}
                  onInvalid={DIRECTION_VALIDITY.onInvalid}
                  onChange={(event) => {
                    DIRECTION_VALIDITY.onInput(event);
                    setChosenDirection(event.currentTarget.value);
                  }}
                >
                  <option value="" disabled>Оберіть напрям</option>
                  {inquiryDirectionOptions.map((direction) => <option key={direction}>{direction}</option>)}
                </select>
                {fieldError('direction')}
              </label>
            )}

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
                {/* With a brief attached its parameters are already in the request: these are details to add (sweep 03.10) */}
                <span>{attachment ? 'Додати деталі до заявки' : 'Додати параметри об’єкта'}</span>
                <ChevronDown aria-hidden="true" />
              </summary>
              <div className="inquiry-details-body">
                <div className="inquiry-fields inquiry-fields-two">
                  <label className={dimensions.input ? undefined : 'inquiry-field-full'}>
                    <span>Місто або область</span>
                    <input name={enabledFieldName(jsReady, 'location')} type="text" maxLength={100} autoComplete="address-level1" />
                  </label>
                  {dimensions.fixedValue !== null && (
                    <input name={enabledFieldName(jsReady, 'dimensions')} type="hidden" value={dimensions.fixedValue} />
                  )}
                  {dimensions.input && (
                    <label>
                      <span id="inquiry-dimensions-label">Орієнтовні розміри</span>
                      {/* Named by its caption alone: the brief's sizes under it are its description, not part of its name */}
                      <input
                        aria-labelledby="inquiry-dimensions-label"
                        name={dimensions.inputNamed ? enabledFieldName(jsReady, 'dimensions') : undefined}
                        type="text"
                        maxLength={100}
                        placeholder="Наприклад: 20 × 40 × 6 м"
                        value={typedDimensions}
                        aria-describedby={dimensions.note ? 'inquiry-dimensions-hint' : undefined}
                        onChange={(event) => {
                          setTypedDimensions(event.currentTarget.value);
                          setDimensionsTypedOnce(true);
                        }}
                      />
                      {dimensions.note && <small id="inquiry-dimensions-hint" className="inquiry-field-hint">{dimensions.note}</small>}
                    </label>
                  )}
                </div>
                <div className="inquiry-fields inquiry-fields-two">
                  <label>
                    <span>Який обсяг робіт вас цікавить?</span>
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

        {/* Consent and the button close the form without a step of their own. */}
        <section className="inquiry-form-section inquiry-form-section-submit" aria-label="Згода і відправка">
          <div className={`inquiry-form-section-body inquiry-form-submit-layout${turnstile.challengeVisible ? ' has-turnstile-challenge' : ''}`}>
            <label className={`inquiry-consent${consentError ? ' is-invalid' : ''}`}>
              <input
                name={enabledFieldName(jsReady, 'privacyConsent')}
                type="checkbox"
                value="accepted"
                required
                aria-invalid={consentError}
                aria-describedby={consentError ? 'privacy-consent-error' : undefined}
                onInvalid={(event) => {
                  event.currentTarget.setCustomValidity(CONSENT_MESSAGE);
                  setConsentError(true);
                }}
                onChange={(event) => {
                  event.currentTarget.setCustomValidity('');
                  setConsentError(false);
                  if (event.target.checked) setConsentAt(new Date().toISOString());
                }}
              />
              <span>
                Погоджуюся на обробку персональних даних для опрацювання мого запиту відповідно до{' '}
                <a href={siteRoutes.privacy}>Політики конфіденційності</a>.
              </span>
              {consentError && <small id="privacy-consent-error">{CONSENT_MESSAGE}</small>}
            </label>

            <div className="inquiry-submit-group">
              {/* Empty and zero-height unless Cloudflare asks for an interaction. */}
              <div ref={turnstileRef} className="inquiry-turnstile" data-turnstile-state={turnstile.state} />
              {/* busy, not disabled, while sending: a disabled button drops the keyboard focus (08.10, audit F157); a
                  second press is ignored by handleSubmit */}
              <button className="button button-primary inquiry-submit" type="submit" disabled={!jsReady} aria-disabled={isSubmitting || undefined}>
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

      </div>

      <p className={`inquiry-status${status ? ' is-visible' : ''}${statusAction === 'error' ? ' is-error' : ''}`} role="status" aria-live="polite">
        {status === VERIFICATION_FAILED_MESSAGE ? (
          <>{VERIFICATION_FAILED_MESSAGE.slice(0, -company.phone.display.length)}<a href={companyContactLinks.phone}>{company.phone.display}</a></>
        ) : status}
        {statusAction === 'error' && status !== VERIFICATION_FAILED_MESSAGE && (
          <span className="inquiry-status-actions">
            <a href={companyContactLinks.phone}><Phone aria-hidden="true" /> {company.phone.display}</a>
          </span>
        )}
      </p>
    </form>
  );
}
