import { Breadcrumbs, PageCta } from '../components/SiteChrome';
import { DirectionHeroVideo } from '../components/DirectionHeroVideo';
import { directions } from '../data/directions';
import { DirectionFaq, type DirectionFaqItem } from '../components/DirectionDetail';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/napryamky',
  title: brandedTitle('Напрямки будівництва у Дніпрі'),
  description: 'Ангари, склади, зерносховища, металоконструкції, бетонні та покрівельні роботи у Дніпрі й області: під ключ або як окремий етап.',
  socialTitle: `Напрямки робіт ${company.name}`,
  socialDescription: 'Повний цикл будівництва або окремі роботи як підрядник чи субпідрядник.',
  image: '/media/hero-steel-frame.jpg',
  imageAlt: `Промислове будівництво ${company.name}`,
});

export default function DirectionsPage() {
  const faqItems: DirectionFaqItem[] = [
    ['Де ви працюєте?', 'Основний регіон — Дніпро та Дніпропетровська область. Цікаві масштабні об’єкти розглядаємо по всій Україні.'],
    ['Під ключ чи окремий етап?', 'Працюємо в обох форматах: ведемо погоджений комплекс робіт або долучаємося як підрядник чи субпідрядник до конкретного етапу.'],
    ['З чого починається робота?', 'Із короткого опису задачі, вивчення вихідних даних та, за потреби, виїзду на майданчик.'],
  ];

  return (
    <main className="inner-page" id="main-content">
      <section className="subhero subhero-media">
        <DirectionHeroVideo
          sources={['/media/directions/directions-montage.mp4']}
          poster="/media/hero-steel-frame.jpg"
        />
        <div className="subhero-overlay" />
        <div className="subhero-grid" aria-hidden="true" />
        <div className="shell subhero-layout">
          <div>
            <Breadcrumbs items={[{ label: 'Головна', href: siteRoutes.home }, { label: 'Напрямки', href: siteRoutes.directions }]} />
            <p className="eyebrow light"><span /> Сфери компетенції</p>
            <h1>Від окремої роботи<br /><em>до готового об’єкта</em></h1>
          </div>
          <div className="subhero-side">
            <p>Беремо об’єкти під ключ або виконуємо визначений етап як підрядник чи субпідрядник. Межі відповідальності узгоджуємо до початку робіт.</p>
            <p className="stock-video-note">Відеоматеріали ілюструють напрямки робіт. Власне портфоліо буде додано окремим розділом.</p>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <div className="page-heading split-heading">
            <div>
              <p className="eyebrow"><span /> Що ми робимо</p>
              <h2>П’ять напрямків. Один відповідальний підхід</h2>
            </div>
            <p>Точний перелік робіт визначаємо після знайомства з об’єктом. Можемо сформувати весь цикл або долучитися лише там, де потрібна наша компетенція.</p>
          </div>
          <div className="route-service-list">
            {directions.map((direction) => {
              const content = (
                <>
                  <span>{direction.number}</span>
                  <div><h3>{direction.serviceTitle}</h3><p>{direction.routeText}</p></div>
                  <b aria-hidden="true">↗</b>
                </>
              );
              return <a className="route-service" href={direction.href} id={direction.id} key={direction.id}>{content}</a>;
            })}
          </div>
        </div>
      </section>

      <DirectionFaq title="Коротко про головне" items={faqItems} />
      <PageCta />
    </main>
  );
}
