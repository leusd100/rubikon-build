'use client';

import { useState, type FormEvent } from 'react';
import { ChevronDown, Send } from 'lucide-react';

const companyPhone = '380682614264';
const companyPhoneInternational = `+${companyPhone}`;

type ContactMethod = 'Дзвінок' | 'Telegram' | 'WhatsApp' | 'Viber';

const contactMethods: Array<[string, ContactMethod]> = [
  ['Дзвінок', 'Дзвінок'],
  ['Telegram', 'Telegram'],
  ['WhatsApp', 'WhatsApp'],
  ['Viber', 'Viber'],
];

const directions = [
  'Ангар або склад',
  'Зерносховище',
  'Металоконструкції',
  'Бетонні роботи',
  'Покрівельні роботи',
  'Комплексний об’єкт під ключ',
  'Інше',
];

function value(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

export default function ProjectInquiryForm() {
  const [contactMethod, setContactMethod] = useState<ContactMethod>('Дзвінок');
  const [status, setStatus] = useState('');

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

    window.gtag?.('event', 'generate_lead', {
      contact_method: value(formData, 'contactMethod'),
      project_direction: value(formData, 'direction'),
    });

    const message = details.join('\n');
    const encodedMessage = encodeURIComponent(message);

    if (contactMethod === 'Дзвінок') {
      setStatus('Номер підготовлено. Зателефонуйте нам — короткі дані із форми допоможуть швидше обговорити задачу.');
      window.location.assign(`tel:${companyPhoneInternational}`);
      return;
    }

    if (contactMethod === 'Telegram') {
      setStatus('Запит підготовлено. Підтвердьте його надсилання у Telegram.');
      window.open(`https://t.me/+${companyPhone}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
      return;
    }

    if (contactMethod === 'Viber') {
      void navigator.clipboard?.writeText(message).catch(() => undefined);
      setStatus('Текст заявки скопійовано. У Viber вставте його в чат і підтвердьте надсилання.');
      window.location.assign(`viber://chat?number=%2B${companyPhone}`);
      return;
    }

    setStatus('Запит підготовлено. Підтвердьте його надсилання у WhatsApp.');
    window.open(`https://wa.me/${companyPhone}?text=${encodedMessage}`, '_blank', 'noopener,noreferrer');
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
            pattern="[+0-9 ()-]{10,20}"
            maxLength={20}
            defaultValue="+380"
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
          {directions.map((direction) => <option key={direction}>{direction}</option>)}
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
          <a href="/polityka-konfidentsiinosti">політики конфіденційності</a>
        </span>
      </label>

      <label className="form-trap" aria-hidden="true">
        Сайт компанії
        <input name="companyWebsite" type="text" tabIndex={-1} autoComplete="off" />
      </label>

      <button className="button button-primary inquiry-submit" type="submit">
        {contactMethod === 'Дзвінок' ? 'Зателефонувати' : `Надіслати у ${contactMethod}`} <Send aria-hidden="true" />
      </button>
      <p className="inquiry-submit-note">
        {contactMethod === 'Дзвінок'
          ? 'Відкриється набір номера — без автоматичного дзвінка'
          : contactMethod === 'Viber'
            ? 'Відкриється Viber, а текст заявки буде скопійовано'
            : `Відкриється ${contactMethod} із готовим текстом — підтвердьте надсилання`}
      </p>

      <p className={`inquiry-status${status ? ' is-visible' : ''}`} role="status" aria-live="polite">
        {status} {status && 'Якщо застосунок не відкрився, скористайтеся контактами поруч.'}
      </p>
    </form>
  );
}
