import { Breadcrumbs } from '../components/SiteChrome';
import { company, companyContactLinks } from '../data/company';
import { siteRoutes } from '../data/navigation';
import { brandedTitle, createBasicPageMetadata } from '../lib/seo';

export const metadata = createBasicPageMetadata({
  path: '/polityka-konfidentsiinosti',
  title: brandedTitle('Політика конфіденційності'),
  description: `Інформація про обробку даних і використання Google Analytics на сайті ${company.name}.`,
});

export default function PrivacyPolicyPage() {
  return (
    <main className="inner-page privacy-page" id="main-content">
      <section className="privacy-hero">
        <div className="shell">
          <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Політика конфіденційності', href: siteRoutes.privacy }]} />
          <p className="eyebrow light"><span /> Дані та конфіденційність</p>
          <h1>Політика<br />конфіденційності</h1>
          <p>Останнє оновлення: 28 серпня 2026 року</p>
        </div>
      </section>

      <section className="page-section">
        <div className="shell privacy-content">
          <article>
            <h2>Які дані ми отримуємо</h2>
            <p>Форма запиту може містити ім’я, номер телефону, бажаний спосіб зв’язку та відомості про майбутній об’єкт. Сайт формує текст звернення у вашому браузері й не зберігає його на сервері. Дані передаються лише після вашої дії через телефон або обраний месенджер.</p>
          </article>
          <article>
            <h2>Мета обробки</h2>
            <p>Контактні дані використовуємо, щоб опрацювати запит, уточнити вихідні дані, підготувати відповідь і продовжити погоджену комунікацію. Підставою для цього є ваша згода, яку ви надаєте перед використанням форми.</p>
          </article>
          <article>
            <h2>Месенджери та зберігання</h2>
            <p>Після переходу в Telegram, WhatsApp або Viber обробка повідомлення також регулюється політикою відповідного сервісу. Листування зберігаємо лише стільки, скільки потрібно для опрацювання звернення, виконання домовленостей і дотримання вимог законодавства.</p>
          </article>
          <article>
            <h2>Google Analytics</h2>
            <p>На сайті встановлено Google Analytics 4 у режимі згоди. До вашого дозволу аналітичне зберігання вимкнене. Після згоди сервіс допомагає оцінювати кількість відвідувань, переглянуті сторінки, приблизні технічні характеристики пристрою та переходи до контактів. Ми використовуємо ці дані у зведеному вигляді для покращення сайту.</p>
          </article>
          <article>
            <h2>Ваш вибір</h2>
            <p>Ви можете не надсилати форму, відкликати згоду щодо подальшої комунікації або відмовитися від аналітичних cookies у повідомленні на сайті. Змінити вибір аналітики можна будь-коли через пункт «Налаштування cookies» у нижній частині сторінки.</p>
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
