import Image from 'next/image';
import { brandedTitle, createBasicPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';

export const metadata = createBasicPageMetadata({
  title: brandedTitle('Фірмовий знак'),
  description: 'Затверджений логотип RUBIKON BUILD. Основний горизонтальний знак і компактна літера R.',
  robots: { index: false, follow: false },
});

const versions = [
  {
    asset: 'rubikon-build-horizontal-dark',
    context: 'dark',
    title: 'Основний логотип',
    text: 'Горизонтальна композиція R | RUBIKON / BUILD без слогану. Основна версія для шапки та підвалу сайту.',
    width: 1270,
    height: 272,
  },
  {
    asset: 'rubikon-build-horizontal-light',
    context: 'light',
    title: 'Для світлого тла',
    text: 'Той самий горизонтальний логотип із графітовим написом і темнішим помаранчевим акцентом.',
    width: 1270,
    height: 272,
  },
  {
    asset: 'rubikon-build-horizontal-premium',
    context: 'dark',
    title: 'Преміальна металева версія',
    text: 'Виразніший brushed-metal treatment для презентацій, hero-композицій, друку та signage. Не використовується у шапці сайту.',
    width: 1270,
    height: 272,
  },
  {
    asset: 'rubikon-mark-dark',
    context: 'dark mark',
    title: 'Компактний знак R',
    text: 'Окремий знак для favicon, app icon, avatar та інших контекстів малого розміру. Без декоративного кола.',
    width: 320,
    height: 280,
  },
] as const;

export default function LogoVariantsPage() {
  return (
    <main className="logo-lab" id="main-content">
      <section className="logo-lab-intro">
        <div className="shell">
          <a className="logo-lab-back" href={siteRoutes.home}>← Повернутися на сайт</a>
          <p className="eyebrow light"><span /> RUBIKON BUILD · Айдентика</p>
          <h1>Затверджений <em>логотип</em></h1>
          <p>Основний горизонтальний знак і компактна літера R відтворені як чисті векторні контури.</p>
        </div>
      </section>
      <section className="logo-lab-options">
        <div className="shell">
          <div className="logo-options-grid">
            {versions.map(({ asset, context, title, text, width, height }) => (
              <article className="logo-option" key={asset}>
                <div className={`logo-preview logo-preview-${context.split(' ').join(' logo-preview-')}`}>
                  <Image src={`/brand/${asset}.svg?v=rubikon-05`} width={width} height={height} alt={`RUBIKON BUILD — ${title}`} unoptimized style={{ width: '100%', height: 'auto' }} />
                </div>
                <div className="logo-option-copy">
                  <h2>{title}</h2>
                  <p>{text}</p>
                  <a className="section-link" href={`/brand/${asset}.svg`} download>Завантажити SVG <span aria-hidden="true">↓</span></a>
                </div>
              </article>
            ))}
          </div>
          <p className="logo-choice-note">Усі написи переведені в контури. Логотип зберігає форму без завантаження шрифтів.</p>
        </div>
      </section>
    </main>
  );
}
