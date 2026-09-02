'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { siteRoutes } from '../data/navigation';
import { ensureAttributionCaptured } from '../lib/attribution';
import {
  readConsentState,
  updateGoogleConsent,
  writeConsentState,
  type ConsentCategory,
  type ConsentState,
} from '../lib/consent';

const settingsEvent = 'rubikon:cookie-settings';
const measurementId = 'G-WYRXJV71WG';

const DENY_ALL_STATE: ConsentState = { analytics: 'denied', advertising: 'denied' };
const GRANT_ALL_STATE: ConsentState = { analytics: 'granted', advertising: 'granted' };

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

  if (document.documentElement.dataset.rubikonAnalyticsConfigured === measurementId) return;
  document.documentElement.dataset.rubikonAnalyticsConfigured = measurementId;
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
      Налаштування cookie
    </button>
  );
}

function ConsentToggleGroup({
  name,
  legend,
  description,
  value,
  onChange,
}: {
  name: string;
  legend: string;
  description: string;
  value: ConsentCategory;
  onChange: (next: ConsentCategory) => void;
}) {
  return (
    <fieldset className="cookie-toggle-group">
      <legend>{legend}</legend>
      <p>{description}</p>
      <div className="cookie-toggle-options">
        <label>
          <input
            type="radio"
            name={name}
            checked={value === 'denied'}
            onChange={() => onChange('denied')}
          />
          <span>Вимкнено</span>
        </label>
        <label>
          <input
            type="radio"
            name={name}
            checked={value === 'granted'}
            onChange={() => onChange('granted')}
          />
          <span>Дозволено</span>
        </label>
      </div>
    </fieldset>
  );
}

export default function AnalyticsConsent() {
  const pathname = usePathname();
  const trackedPath = useRef<string | null>(null);
  const [state, setState] = useState<ConsentState | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState<ConsentState>(DENY_ALL_STATE);

  useEffect(() => {
    // Independent of consent below: this only writes UTM/click-ID params already present in
    // the URL into sessionStorage, so the inquiry form can attribute a lead later in the same
    // visit. Nothing is sent anywhere until the visitor submits that form themselves, and the
    // advertising click IDs specifically are stripped again at submit time unless Advertising
    // consent was granted by then — see filterAttributionForConsent in lib/attribution.ts.
    ensureAttributionCaptured();
  }, []);

  useEffect(() => {
    let saved: ConsentState | null = null;
    try {
      saved = readConsentState();
    } catch {
      saved = null;
    }
    const frame = window.requestAnimationFrame(() => {
      setState(saved);
      setShowBanner(saved === null);
      setDraft(saved ?? DENY_ALL_STATE);
      if (saved) {
        updateGoogleConsent(saved);
        if (saved.analytics === 'granted') loadAnalytics();
      }
    });

    // Reopening via the footer's "Налаштування cookie" link is a settings *review*, not the
    // first-time ask — a visitor who already chose something goes straight to the two toggles
    // pre-filled with their current state, not back through the "Прийняти все" quick actions.
    const showSettings = () => {
      let current: ConsentState | null = null;
      try {
        current = readConsentState();
      } catch {
        current = null;
      }
      setDraft(current ?? DENY_ALL_STATE);
      setCustomizing(true);
      setShowBanner(true);
    };
    window.addEventListener(settingsEvent, showSettings);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(settingsEvent, showSettings);
    };
  }, []);

  useEffect(() => {
    if (state?.analytics !== 'granted') return;

    // The initial page view is sent by gtag('config'). Track only later
    // client-side route changes so Next.js navigation is not undercounted.
    if (trackedPath.current === null) {
      trackedPath.current = pathname;
      return;
    }

    if (trackedPath.current === pathname) return;
    trackedPath.current = pathname;
    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
    });
  }, [state, pathname]);

  useEffect(() => {
    if (state?.analytics !== 'granted') return;

    const trackContact = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const contact = target?.closest<HTMLElement>('[data-contact-method], a[href^="tel:"]');
      if (!contact) return;
      const type = contactType(contact);
      if (type) window.gtag?.('event', 'contact_click', { contact_method: type });
    };

    document.addEventListener('click', trackContact);
    return () => document.removeEventListener('click', trackContact);
  }, [state]);

  function applyChoice(next: ConsentState) {
    writeConsentState(next);
    setState(next);
    setShowBanner(false);
    setCustomizing(false);
    updateGoogleConsent(next);
    if (next.analytics === 'granted') loadAnalytics();
  }

  if (!showBanner) return null;

  return (
    <aside
      className="cookie-banner"
      role="region"
      aria-live="polite"
      aria-labelledby="analytics-consent-title"
    >
      <div className="cookie-banner-body">
        <div>
          <strong id="analytics-consent-title">Файли cookie</strong>
          <p>
            За вашою згодою використовуємо аналітичні та рекламні cookie Google, щоб розуміти,
            які сторінки корисні відвідувачам, і — якщо ви прийшли за рекламним оголошенням —
            оцінити його ефективність. Необхідні функції сайту працюють у будь-якому разі.
          </p>
          <a href={siteRoutes.privacy}>Докладніше про конфіденційність</a>
        </div>

        {customizing && (
          <div className="cookie-toggles">
            <ConsentToggleGroup
              name="analyticsConsent"
              legend="Аналітика"
              description="Google Analytics: кількість відвідувань і які сторінки цікавлять відвідувачів."
              value={draft.analytics}
              onChange={(next) => setDraft((prev) => ({ ...prev, analytics: next }))}
            />
            <ConsentToggleGroup
              name="advertisingConsent"
              legend="Реклама"
              description="Google Ads: пов’язати заявку з рекламним переходом для оцінки ефективності реклами."
              value={draft.advertising}
              onChange={(next) => setDraft((prev) => ({ ...prev, advertising: next }))}
            />
          </div>
        )}
      </div>

      <div className="cookie-actions">
        {customizing ? (
          <>
            <button className="cookie-accept" type="button" onClick={() => applyChoice(draft)}>
              Зберегти вибір
            </button>
            <button type="button" onClick={() => applyChoice(DENY_ALL_STATE)}>Лише необхідні</button>
          </>
        ) : (
          <>
            <button className="cookie-accept" type="button" onClick={() => applyChoice(GRANT_ALL_STATE)}>
              Прийняти все
            </button>
            <button type="button" onClick={() => applyChoice(DENY_ALL_STATE)}>Лише необхідні</button>
            <button type="button" onClick={() => setCustomizing(true)}>Налаштувати</button>
          </>
        )}
      </div>
    </aside>
  );
}
