import type { Metadata } from 'next';
import { Breadcrumbs } from '../components/SiteChrome';
import { company, companyContactLinks } from '../data/company';

export const metadata: Metadata = {
  title: 'Політика конфіденційності | RUBIKON BUILD',
  description: 'Інформація про обробку даних і використання Google Analytics на сайті RUBIKON BUILD.',
  alternates: { canonical: '/polityka-konfidentsiinosti' },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="inner-page privacy-page" id="main-content">
      <section className="privacy-hero">
        <div className="shell">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Політика конфіденційності', href: '/polityka-konfidentsiinosti' }]} />
          <p className="eyebrow light"><span /> Дані та конфіденційність</p>
          <h1>Політика<br />конфіденційності</h1>
          <p>Останнє оновлення: 23 серпня 2026 року</p>
        </div>
      </section>

      <section className="page-section">
        <div className="shell privacy-content">
          <article>
            <h2>Які дані ми отримуємо</h2>
            <p>Під час звичайного перегляду сайт не просить створювати обліковий запис і не збирає дані через контактні форми. Якщо ви самостійно телефонуєте або пишете в месенджер, подальша комунікація відбувається через обраний вами сервіс.</p>
          </article>
          <article>
            <h2>Google Analytics</h2>
            <p>На сайті встановлено Google Analytics 4 у режимі згоди. До вашого дозволу аналітичне зберігання вимкнене. Після згоди сервіс допомагає оцінювати кількість відвідувань, переглянуті сторінки, приблизні технічні характеристики пристрою та переходи до контактів. Ми використовуємо ці дані у зведеному вигляді для покращення сайту.</p>
          </article>
          <article>
            <h2>Ваш вибір</h2>
            <p>Ви можете відмовитися від аналітичних cookies у повідомленні на сайті. Змінити вибір можна будь-коли через пункт «Налаштування cookies» у нижній частині сторінки.</p>
          </article>
          <article>
            <h2>Контакт</h2>
            <p>З питань щодо даних і роботи сайту зв’яжіться з RUBIKON BUILD за номером <a href={companyContactLinks.phone}>{company.phone.display}</a>.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
