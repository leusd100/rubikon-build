'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown, Copy, Phone, Send } from 'lucide-react';
import { inquiryDirectionOptions } from '../data/directions';
import { company, companyContactLinks } from '../data/company';
import { siteRoutes } from '../data/navigation';

const companyPhone = company.phone.digits;
const companyPhoneInternational = company.phone.international;

type ContactMethod = 'Дзвінок' | 'Telegram' | 'WhatsApp' | 'Viber';

const contactMethods: Array<[string, ContactMethod]> = [
  ['Дзвінок', 'Дзвінок'],
  ['Telegram', 'Telegram'],
  ['WhatsApp', 'WhatsApp'],
  ['Viber', 'Viber'],
];

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

export default function ProjectInquiryForm() {
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Дзвінок');
  const [status, setStatus] = useState('');
  const [statusAction, setStatusAction] = useState<'phone' | 'telegram' | 'viber' | null>(null);
  const [preparedMessage, setPreparedMessage] = useState('');

  function copyText(text: string) {
    return navigator.clipboard?.writeText(text).catch(() => undefined);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (value(formData, 'companyWebsite')) return;

    const details = [
      'Вітаю! Хочу обговорити будівельну задачу з RUBIKON BUILD.',
      '',
      `Ім’я: ${value(formData, 'name')}`,
      `Телефон: ${value(formData, 'phone')}`,
      `Зручний спосіб зв’язку: ${value(formData, 'contactMethod')}`,
      `Напрямок: ${value(formData, 'direction')}`,
      value(formData, 'location') && `Місто / область: ${value(formData, 'location')}`,
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
        ? 'Відкриваємо набір номера. Підтвердьте дзвінок у телефоні.'
        : 'Браузер на ноутбуці не може самостійно здійснити дзвінок. Номер компанії скопійовано — зателефонуйте з телефону або скористайтеся месенджером.');
      setStatusAction('phone');
      if (canStartPhoneCall) window.location.assign(`tel:${companyPhoneInternational}`);
      return;
    }

    if (contactMethod === 'Telegram') {
      void copyText(message);
      setStatus('Відкриваємо Telegram. Повний текст заявки скопійовано — вставте його в чат і підтвердьте надсилання.');
      setStatusAction('telegram');
      window.location.assign(`tg://resolve?phone=${companyPhone}&text=${encodedMessage}`);
      return;
    }

    if (contactMethod === 'Viber') {
      const viberMessage = [
        'Запит для RUBIKON BUILD',
        `${value(formData, 'name')}, ${value(formData, 'phone')}`,
        value(formData, 'direction'),
        'Бажаний зв’язок: Viber',
      ].join('\n');

      void copyText(message);
      setStatus('Відкриваємо офіційне вікно надсилання Viber із коротким запитом. Оберіть чат RUBIKON BUILD і підтвердьте надсилання. Повний текст заявки також скопійовано.');
      setStatusAction('viber');
      window.location.assign(`viber://forward?text=${encodeURIComponent(viberMessage)}`);
      return;
    }

    setStatus('Запит підготовлено. Підтвердьте його надсилання у WhatsApp.');
      window.open(`${companyContactLinks.whatsapp}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <form className="inquiry-form" onSubmit={handleSubmit}>
      <div className="inquiry-form-heading">
        <span>Коротка форма запиту</span>
        <p>Поля зі знаком * обов’язкові</p>
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
          <small id="phone-hint" className="inquiry-field-hint">Додайте ще 9 цифр номера</small>
        </label>
      </div>

      <fieldset className="inquiry-choice">
        <legend>Як зручно зв’язатися *</legend>
        <div>
          {contactMethods.map(([label, method]) => (
            <label key={method}>
              <input
                type="radio"
                name="contactMethod"
                value={method}
                checked={contactMethod === method}
                onChange={() => {
                  setContactMethod(method);
                  setStatus('');
                  setStatusAction(null);
                }}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="inquiry-select">
        <span>Що плануєте *</span>
        <select name="direction" defaultValue="" required>
          <option value="" disabled>Оберіть напрямок</option>
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
              <span>Місто / область</span>
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
                <option>Підряд / субпідряд</option>
              </select>
            </label>
            <label>
              <span>Бажаний початок робіт</span>
              <input name="startDate" type="text" maxLength={80} placeholder="Наприклад: осінь 2026" />
            </label>
          </div>
          <label>
            <span>Коментар</span>
            <textarea name="comment" rows={4} maxLength={800} placeholder="Що ще важливо знати про задачу" />
          </label>
        </div>
      </details>

      <label className="inquiry-consent">
        <input type="checkbox" required />
        <span>
          Погоджуюся на обробку даних для відповіді на запит відповідно до{' '}
          <a href={siteRoutes.privacy}>політики конфіденційності</a>
        </span>
      </label>

      <label className="form-trap" aria-hidden="true">
        Сайт компанії
        <input name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <button className="button button-primary inquiry-submit" type="submit">
        {contactMethod === 'Дзвінок'
          ? 'Підготувати дзвінок'
          : contactMethod === 'Viber'
            ? 'Відкрити Viber'
            : `Надіслати у ${contactMethod}`}{' '}
        {contactMethod === 'Дзвінок' ? <Phone aria-hidden="true" /> : <Send aria-hidden="true" />}
      </button>
      <p className="inquiry-submit-note">
        {contactMethod === 'Дзвінок'
          ? 'Смартфон відкриє набір номера; на ноутбуці номер буде скопійовано'
          : contactMethod === 'Viber'
            ? 'Відкриється Viber із коротким запитом, а повна заявка буде скопійована'
            : `Відкриється ${contactMethod} із готовим текстом — підтвердьте надсилання`}
      </p>

      <p className={`inquiry-status${status ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {status}
        {statusAction === 'phone' && (
          <span className="inquiry-status-actions">
            <a href={`tel:${companyPhoneInternational}`}><Phone aria-hidden="true" /> {companyPhoneInternational}</a>
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
            <a href={`tg://resolve?phone=${companyPhone}`} data-contact-method="telegram">
              <Send aria-hidden="true" /> Відкрити Telegram
            </a>
            <button type="button" onClick={() => void copyText(preparedMessage)}>
              <Copy aria-hidden="true" /> Скопіювати заявку
            </button>
          </span>
        )}
      </p>
    </form>
  );
}
