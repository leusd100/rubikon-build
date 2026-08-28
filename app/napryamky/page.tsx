import { Breadcrumbs, PageCta, SectionHeader } from '../components/SiteChrome';
import { DirectionRouteList } from '../components/DirectionCards';
import { DirectionHeroVideo } from '../components/DirectionHeroVideo';
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
    ['З чого починається робота?', 'Із короткого опису завдання, вивчення вихідних даних та, за потреби, виїзду на майданчик.'],
  ];

  return (
    <main className="inner-page" id="main-content">
      <section className="subhero subhero-media directions-subhero">
        <DirectionHeroVideo
          sources={['/media/directions/directions-montage.mp4']}
          poster="/media/hero-steel-frame.webp"
          playbackRate={0.85}
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
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Що ми робимо"
            title="П’ять напрямків. Один відповідальний підхід"
            supporting="Точний перелік робіт визначаємо після знайомства з об’єктом. Можемо сформувати весь цикл або долучитися лише там, де потрібна наша компетенція."
          />
          <DirectionRouteList />
        </div>
      </section>

      <DirectionFaq title="Коротко про головне" items={faqItems} />
      <PageCta />
    </main>
  );
}
