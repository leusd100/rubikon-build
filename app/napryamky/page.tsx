import { Breadcrumbs, SectionHeader } from '../components/SiteChrome';
import InquirySection from '../components/InquirySection';
import { DirectionRouteList } from '../components/DirectionCards';
import { DirectionHeroVideo } from '../components/DirectionHeroVideo';
import { DirectionFaq, type DirectionFaqItem } from '../components/DirectionDetail';
import { brandedTitle, createPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';

export const metadata = createPageMetadata({
  path: '/napryamky',
  title: brandedTitle('Напрями промислового будівництва у Дніпрі'),
  description: 'Ангари, склади, зерносховища, металоконструкції, бетонні та покрівельні роботи у Дніпрі й області: під ключ або як окремий етап.',
  socialTitle: `Напрями робіт ${company.name}`,
  socialDescription: 'Комплексне промислове будівництво або окремі роботи у форматі підряду чи субпідряду.',
  image: '/media/hero-steel-frame.jpg',
  imageAlt: `Промислове будівництво ${company.name}`,
});

export default function DirectionsPage() {
  const faqItems: DirectionFaqItem[] = [
    ['Де ви працюєте?', 'Основний регіон — Дніпро та Дніпропетровська область. Масштабні промислові й аграрні об’єкти розглядаємо по всій Україні.'],
    ['Чи працюєте під ключ і з окремими етапами?', 'Так. Можемо вести погоджений комплекс робіт або долучитися як підрядник чи субпідрядник до конкретного етапу.'],
    ['З чого починається робота?', 'Із короткого опису завдання, вивчення вихідних даних та, за потреби, виїзду на майданчик.'],
  ];

  return (
    <main className="inner-page" id="main-content">
      <section className="subhero subhero-media directions-subhero">
        <DirectionHeroVideo
          sources={['/media/directions/directions-montage.mp4']}
          poster="/media/directions/directions-montage-poster.webp"
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
            <p>Беремо на себе комплексну реалізацію об’єкта або виконуємо визначений етап як підрядник чи субпідрядник. Межі відповідальності узгоджуємо до початку робіт.</p>
            <a className="button button-primary subhero-side-cta" href="#inquiry">
              Обговорити проєкт <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="shell">
          <SectionHeader
            className="page-heading"
            eyebrow="Що ми робимо"
            title="П’ять напрямків. Один відповідальний підхід"
            supporting="Точний перелік робіт визначаємо після знайомства з об’єктом. Можемо виконати комплекс робіт або долучитися до визначеного етапу."
          />
          <DirectionRouteList />
        </div>
      </section>

      <DirectionFaq title="Коротко про головне" items={faqItems} />
      <InquirySection eyebrow="Почнемо з розмови" title="Маєте будівельне завдання? Обговорімо його" />
    </main>
  );
}
