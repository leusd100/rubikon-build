import { Breadcrumbs, GhostWord, SectionHeader } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import { DirectionRouteList } from '../components/DirectionCards';
import { DirectionsHeroImageSequence } from '../components/DirectionsHeroImageSequence';
import { DirectionFaq, type DirectionFaqItem } from '../components/DirectionDetail';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/napryamky',
  title: brandedTitle('Оберіть напрям будівництва у Дніпрі'),
  description: 'Ангари, зерносховища, металоконструкції, бетонні й покрівельні роботи у Дніпрі. Оберіть напрям або опишіть завдання, якщо об’єкт поєднує кілька видів робіт.',
  socialTitle: `Оберіть напрям будівництва — ${company.name}`,
  socialDescription: 'П’ять напрямів промислового будівництва у Дніпрі. Один об’єкт може поєднувати кілька — підкажемо, які саме.',
  image: '/media-responsive/directions-sequence-angary-1200w.bf92dcbc.webp',
  imageAlt: `Промислові напрями будівництва ${company.name} — металевий каркас на будівельному майданчику`,
});

export default function DirectionsPage() {
  const faqItems: DirectionFaqItem[] = [
    ['Де ви працюєте?', 'Основний регіон — Дніпро та Дніпропетровська область. Масштабні промислові й аграрні об’єкти розглядаємо по всій Україні.'],
    ['З чого починається робота?', 'Із короткого опису завдання, вивчення вихідних даних та, за потреби, виїзду на майданчик.'],
    ['Не впевнені, який напрямок підходить?', 'Опишіть завдання своїми словами в короткій формі. Якщо об’єкт поєднує кілька напрямків, це можна визначити вже під час першого обговорення.'],
  ];

  return (
    <main className="inner-page" id="main-content">
      <section className="subhero subhero-media directions-subhero">
        <DirectionsHeroImageSequence />
        <div className="subhero-overlay" />
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Напрямки', href: siteRoutes.directions }]} />
            <p className="eyebrow light"><span /> Сфери компетенції</p>
            <h1>П’ять напрямків робіт<br /><em>Один об’єкт може поєднувати кілька</em></h1>
          </div>
          <div className="subhero-side">
            <p>Кожен напрямок має свою специфіку — від металевого каркаса й бетонної основи до покрівлі та будівельної частини зерносховища. Оберіть потрібний напрямок або коротко опишіть завдання, якщо ваш об’єкт поєднує кілька видів робіт.</p>
            <a className="button button-primary subhero-side-cta" href="#inquiry">
              Обговорити проєкт <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="page-section ghost-section">
        <GhostWord word="STRUCTURE" />
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Що ми робимо"
            title="Оберіть напрямок"
            supporting="Точний перелік робіт визначаємо після знайомства з об’єктом. Можемо виконати комплекс робіт або долучитися до визначеного етапу."
          />
          <DirectionRouteList />
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Комплексні об’єкти"
            title="Коли один об’єкт поєднує кілька напрямків"
            supporting="Багато промислових та аграрних об’єктів не обмежуються одним видом робіт. Наприклад, ангар може одночасно включати бетонну основу, металевий каркас і покрівлю. У такому випадку важливо узгодити послідовність етапів, стики між ними та межі відповідальності ще до початку робіт."
          />
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Якщо проєкт уже сформований"
            title="Можемо долучитися до окремої частини робіт"
            supporting="Якщо у вас уже є проєкт, документація або визначений обсяг робіт, можемо долучитися як підрядник або субпідрядник на конкретний етап. До початку робіт уточнюємо вихідні дані, технічні вимоги, склад робіт і межі нашої відповідальності."
          />
        </div>
      </section>

      <DirectionFaq title="Коротко про головне" items={faqItems} />
      <InquirySection eyebrow="Почнемо з розмови" title="Не впевнені, який напрямок підходить? Опишіть завдання — розберемося разом." />
    </main>
  );
}
