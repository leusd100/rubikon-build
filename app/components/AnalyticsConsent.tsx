'use client';

import { useEffect, useState } from 'react';
import { siteRoutes } from '../data/navigation';

const storageKey = 'rubikon-analytics-consent';
const settingsEvent = 'rubikon:cookie-settings';
const measurementId = 'G-WYRXJV71WG';

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

function loadAnalytics() {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => window.dataLayer.push(args));

  if (!document.querySelector(`script[data-rubikon-analytics="${measurementId}"]`)) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.dataset.rubikonAnalytics = measurementId;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { anonymize_ip: true });
}

function contactType(element: HTMLElement) {
  const explicitType = element.dataset.contactMethod;
  if (explicitType) return explicitType;

  const href = element instanceof HTMLAnchorElement ? element.href : '';
  if (href.startsWith('tel:')) return 'phone';
  if (href.includes('t.me')) return 'telegram';
  if (href.includes('wa.me')) return 'whatsapp';
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
    let savedChoice: ConsentChoice | null = null;
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      savedChoice = storedValue === 'granted' || storedValue === 'denied' ? storedValue : null;
    } catch {
      savedChoice = null;
    }
    const frame = window.requestAnimationFrame(() => {
      setChoice(savedChoice);
      setShowBanner(savedChoice === null);
      if (savedChoice) {
        updateAnalyticsConsent(savedChoice);
        if (savedChoice === 'granted') loadAnalytics();
      }
    });

    const showSettings = () => setShowBanner(true);
    window.addEventListener(settingsEvent, showSettings);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(settingsEvent, showSettings);
    };
  }, []);

  useEffect(() => {
    if (choice !== 'granted') return;

    const trackContact = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const contact = target?.closest<HTMLElement>('[data-contact-method], a[href^="tel:"]');
      if (!contact) return;
      const type = contactType(contact);
      if (type) window.gtag?.('event', 'contact_click', { contact_method: type });
    };

    document.addEventListener('click', trackContact);
    return () => document.removeEventListener('click', trackContact);
  }, [choice]);

  const saveChoice = (nextChoice: ConsentChoice) => {
    try {
      window.localStorage.setItem(storageKey, nextChoice);
    } catch {
      // Consent still applies for the current page when storage is unavailable.
    }
    setChoice(nextChoice);
    setShowBanner(false);

    updateAnalyticsConsent(nextChoice);
    if (nextChoice === 'granted') loadAnalytics();
  };

  if (!showBanner) return null;

  return (
    <aside
      className="cookie-banner"
      role="region"
      aria-live="polite"
      aria-labelledby="analytics-consent-title"
    >
      <div>
        <strong id="analytics-consent-title">Аналітика сайту</strong>
        <p>
          За вашою згодою використовуємо Google Analytics, щоб розуміти, які сторінки
          корисні відвідувачам. Необхідні функції сайту працюють у будь-якому разі.
        </p>
        <a href={siteRoutes.privacy}>Докладніше про конфіденційність</a>
      </div>
      <div className="cookie-actions">
        <button type="button" onClick={() => saveChoice('denied')}>Лише необхідні</button>
        <button className="cookie-accept" type="button" onClick={() => saveChoice('granted')}>Дозволити аналітику</button>
      </div>
    </aside>
  );
}
