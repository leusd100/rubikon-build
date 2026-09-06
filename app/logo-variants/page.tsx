import Image from 'next/image';
import { brandedTitle, createBasicPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';

export const metadata = createBasicPageMetadata({
  title: brandedTitle('Фірмовий знак'),
  description: 'Обраний логотип RUBIKON BUILD — «Каркас». Версії для темного та світлого тла.',
  robots: { index: false, follow: false },
});

const versions = [
  { key: 'dark', title: 'Темне тло', text: 'Мідний знак і світлий напис. Основна версія для шапки та підвалу сайту.' },
  { key: 'light', title: 'Світле тло', text: 'Графітовий напис і темніша мідь для світлих поверхонь.' },
  { key: 'black', title: 'Один колір', text: 'Монохромна версія для документів і друку.' },
] as const;

export default function LogoVariantsPage() {
  return (
    <main className="logo-lab" id="main-content">
      <section className="logo-lab-intro">
        <div className="shell">
          <a className="logo-lab-back" href={siteRoutes.home}>← Повернутися на сайт</a>
          <p className="eyebrow light"><span /> RUBIKON BUILD · Айдентика</p>
          <h1>Обраний знак — <em>«Каркас»</em></h1>
          <p>Варіант 01. Вертикальна опора, верхня балка та діагональ утворюють літеру R.</p>
        </div>
      </section>
      <section className="logo-lab-options">
        <div className="shell">
          <div className="logo-options-grid">
            {versions.map(({ key, title, text }) => (
              <article className="logo-option" key={key}>
                <div className={`logo-preview logo-preview-${key === 'dark' ? 'dark' : 'light'}`}>
                  <Image src={`/brand/rubikon-build-${key}.svg`} width={471} height={100} alt={`RUBIKON BUILD — ${title}`} unoptimized style={{ width: '100%', height: 'auto' }} />
                </div>
                <div className="logo-option-copy">
                  <h2>{title}</h2>
                  <p>{text}</p>
                  <a className="section-link" href={`/brand/rubikon-build-${key}.svg`} download>Завантажити SVG <span aria-hidden="true">↓</span></a>
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
