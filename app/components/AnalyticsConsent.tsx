'use client';

import { useEffect, useState } from 'react';

const storageKey = 'rubikon-analytics-consent';
const settingsEvent = 'rubikon:cookie-settings';

type ConsentChoice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer: unknown[][];
    gtag?: (...args: unknown[]) => void;
  }
}

function updateAnalyticsConsent(choice: ConsentChoice) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));
  window.gtag('consent', 'update', { analytics_storage: choice });
}

function contactType(href: string) {
  if (href.startsWith('tel:')) return 'phone';
  if (href.includes('t.me')) return 'telegram';
  if (href.includes('wa.me')) return 'whatsapp';
  if (href.startsWith('viber:')) return 'viber';
  return null;
}

export function openCookieSettings() {
  window.dispatchEvent(new Event(settingsEvent));
}

export function CookieSettingsButton() {
  return (
    <button className="footer-legal-link" type="button" onClick={openCookieSettings}>
      Налаштування cookies
    </button>
  );
}

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const savedChoice = window.localStorage.getItem(storageKey) as ConsentChoice | null;
    setChoice(savedChoice);
    setShowBanner(savedChoice === null);
    if (savedChoice) updateAnalyticsConsent(savedChoice);

    const showSettings = () => setShowBanner(true);
    window.addEventListener(settingsEvent, showSettings);
    return () => window.removeEventListener(settingsEvent, showSettings);
  }, []);

  useEffect(() => {
    if (choice !== 'granted') return;

    const trackContact = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const link = target?.closest<HTMLAnchorElement>('a[href]');
      if (!link) return;
      const type = contactType(link.href);
      if (type) window.gtag?.('event', 'contact_click', { contact_method: type });
    };

    document.addEventListener('click', trackContact);
    return () => document.removeEventListener('click', trackContact);
  }, [choice]);

  const saveChoice = (nextChoice: ConsentChoice) => {
    window.localStorage.setItem(storageKey, nextChoice);
    setChoice(nextChoice);
    setShowBanner(false);

    updateAnalyticsConsent(nextChoice);
  };

  if (!showBanner) return null;

  return (
    <aside className="cookie-banner" aria-label="Налаштування аналітичних cookies">
      <div>
        <strong>Аналітика сайту</strong>
        <p>
          За вашою згодою використовуємо Google Analytics, щоб розуміти, які сторінки
          корисні відвідувачам. Необхідні функції сайту працюють у будь-якому разі.
        </p>
        <a href="/polityka-konfidentsiinosti">Докладніше про конфіденційність</a>
      </div>
      <div className="cookie-actions">
        <button type="button" onClick={() => saveChoice('denied')}>Лише необхідні</button>
        <button className="cookie-accept" type="button" onClick={() => saveChoice('granted')}>Дозволити аналітику</button>
      </div>
    </aside>
  );
}
