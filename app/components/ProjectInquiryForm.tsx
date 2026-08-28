'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ChevronDown, Copy, Phone, Send } from 'lucide-react';
import { inquiryDirectionOptions } from '../data/directions';
import { company, companyContactLinks } from '../data/company';
import { contactMethodOptions, messengerContacts, type ContactMethod } from '../data/contactMethods';
import { siteRoutes } from '../data/navigation';

const companyPhoneInternational = company.phone.international;
const submitLabels: Record<ContactMethod, string> = {
  Дзвінок: 'Зателефонувати',
  Telegram: 'Написати в Telegram',
  WhatsApp: 'Написати в WhatsApp',
  Viber: 'Написати у Viber',
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
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

export default function ProjectInquiryForm() {
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Дзвінок');
  const [status, setStatus] = useState('');
  const [statusAction, setStatusAction] = useState<'phone' | 'telegram' | 'viber' | null>(null);
  const [preparedMessage, setPreparedMessage] = useState('');
  const [consentError, setConsentError] = useState(false);

  function copyText(text: string) {
    return navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsentError(false);
    const formData = new FormData(event.currentTarget);

    if (value(formData, 'companyWebsite')) return;

    const details = [
      'Вітаю! Хочу обговорити будівельне завдання з RUBIKON BUILD.',
      '',
      `Ім’я: ${value(formData, 'name')}`,
      `Телефон: ${value(formData, 'phone')}`,
      `Зручний спосіб зв’язку: ${value(formData, 'contactMethod')}`,
      `Напрям робіт: ${value(formData, 'direction')}`,
      value(formData, 'location') && `Місто або область: ${value(formData, 'location')}`,
      value(formData, 'dimensions') && `Орієнтовні розміри: ${value(formData, 'dimensions')}`,
      value(formData, 'cooperation') && `Формат співпраці: ${value(formData, 'cooperation')}`,
      value(formData, 'startDate') && `Бажаний початок робіт: ${value(formData, 'startDate')}`,
      value(formData, 'comment') && `Коментар: ${value(formData, 'comment')}`,
    ].filter(Boolean);

    const message = details.join('\n');
    const encodedMessage = encodeURIComponent(message);
    setPreparedMessage(message);
    setStatusAction(null);

    try {
      if (window.localStorage.getItem('rubikon-analytics-consent') === 'granted') {
        window.gtag?.('event', 'inquiry_contact_attempt', {
          contact_method: contactMethod.toLowerCase(),
          project_direction: value(formData, 'direction'),
        });
      }
    } catch {
      // Do not send analytics when the visitor's consent state cannot be read.
    }

    if (contactMethod === 'Дзвінок') {
      void copyText(companyPhoneInternational);
      const canStartPhoneCall = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setStatus(canStartPhoneCall
        ? 'Відкриваємо номер у телефоні. Підтвердьте дзвінок.'
        : 'Номер компанії скопійовано. Зателефонуйте з телефону або оберіть месенджер.');
      setStatusAction('phone');
      if (canStartPhoneCall) window.location.assign(`tel:${companyPhoneInternational}`);
      return;
    }

    if (contactMethod === 'Telegram') {
      void copyText(message);
      setStatus('Відкриваємо Telegram. Текст запиту скопійовано — вставте його в чат і підтвердьте надсилання.');
      setStatusAction('telegram');
      window.location.assign(`${companyContactLinks.telegram}?text=${encodedMessage}`);
      return;
    }

    if (contactMethod === 'Viber') {
      const viberMessage = [
        'Запит для RUBIKON BUILD',
        `${value(formData, 'name')}, ${value(formData, 'phone')}`,
        value(formData, 'direction'),
        'Зручний спосіб зв’язку: Viber',
      ].join('\n');

      void copyText(message);
      setStatus('Відкриваємо Viber із коротким запитом. Оберіть чат RUBIKON BUILD і підтвердьте надсилання. Повний текст запиту скопійовано.');
      setStatusAction('viber');
      window.location.assign(`viber://forward?text=${encodeURIComponent(viberMessage)}`);
      return;
    }

    setStatus('Відкриваємо WhatsApp із підготовленим запитом. Підтвердьте надсилання.');
      window.open(`${companyContactLinks.whatsapp}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="inquiry-form" onSubmit={handleSubmit}>
      <div className="inquiry-form-heading">
        <span>Коротка форма запиту</span>
        <p>Поля, позначені *, обов’язкові</p>
      </div>

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

      <label className="inquiry-select">
        <span>Напрям робіт *</span>
        <select name="direction" defaultValue="" required>
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

      <label className={`inquiry-consent${consentError ? ' is-invalid' : ''}`}>
        <input
          name="privacyConsent"
          type="checkbox"
          value="accepted"
          required
          aria-invalid={consentError}
          aria-describedby={consentError ? 'privacy-consent-error' : undefined}
          onInvalid={() => setConsentError(true)}
          onChange={() => setConsentError(false)}
        />
        <span>
          Погоджуюся на обробку персональних даних для опрацювання мого запиту відповідно до{' '}
          <a href={siteRoutes.privacy}>Політики конфіденційності</a>.
        </span>
        {consentError && <small id="privacy-consent-error">Підтвердьте згоду на обробку персональних даних.</small>}
      </label>

      <label className="form-trap" aria-hidden="true">
        Сайт компанії
        <input name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <button className="button button-primary inquiry-submit" type="submit">
        {submitLabels[contactMethod]}{' '}
        {contactMethod === 'Дзвінок' ? <Phone aria-hidden="true" /> : <Send aria-hidden="true" />}
      </button>
      <p className="inquiry-submit-note">
        {contactMethod === 'Дзвінок'
          ? 'Смартфон відкриє набір номера; на ноутбуці номер буде скопійовано'
          : contactMethod === 'Viber'
            ? 'Відкриється Viber із коротким запитом, а повний текст буде скопійовано'
            : `Відкриється ${contactMethod} із готовим текстом — підтвердьте надсилання`}
      </p>

      <p className={`inquiry-status${status ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {status}
        {statusAction === 'phone' && (
          <span className="inquiry-status-actions">
            <a href={`tel:${companyPhoneInternational}`}><Phone aria-hidden="true" /> {company.phone.display}</a>
            <button type="button" onClick={() => void copyText(companyPhoneInternational)}>
              <Copy aria-hidden="true" /> Скопіювати номер
            </button>
          </span>
        )}
        {statusAction === 'viber' && (
          <span className="inquiry-status-actions">
            <button type="button" onClick={() => void copyText(companyPhoneInternational)}>
              <Copy aria-hidden="true" /> Скопіювати номер
            </button>
          </span>
        )}
        {statusAction === 'telegram' && (
          <span className="inquiry-status-actions">
            <a href={companyContactLinks.telegram} data-contact-method="telegram" target="_blank" rel="noreferrer">
              <Send aria-hidden="true" /> Відкрити Telegram
            </a>
            <button type="button" onClick={() => void copyText(preparedMessage)}>
              <Copy aria-hidden="true" /> Скопіювати запит
            </button>
          </span>
        )}
      </p>
    </form>
  );
}
