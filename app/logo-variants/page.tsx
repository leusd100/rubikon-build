import { brandedTitle, createBasicPageMetadata } from '../lib/seo';
import { siteRoutes } from '../data/navigation';
import { company } from '../data/company';
import { BrandMark } from '../components/SiteChrome';

export const metadata = createBasicPageMetadata({
  title: brandedTitle('Варіанти логотипа'),
  description: `Робочі концепції фірмового знака ${company.name}.`,
  robots: { index: false, follow: false },
});

const variants = [
  {
    number: '01',
    key: 'evolution',
    title: 'Еволюція',
    note: 'Найбільша спадкоємність',
    description: 'Зберігає впізнавану модульну геометрію поточного знака, але робить її чистішою, стійкішою та виразнішою у малому розмірі.',
    strength: 'Спадкоємність без різкої зміни образу компанії.',
    use: 'Основний логотип, документи, транспорт і будівельні каски.',
  },
  {
    number: '02',
    key: 'frame',
    title: 'Інженерна рама',
    note: 'Найвиразніша інженерна мова',
    description: 'Знак побудований як конструктивна рама з центральною віссю та вузлом. Він підтримує мову креслень, каркасів і точних рішень.',
    strength: 'Найсильніше пов’язує айдентику з інженерією та будівництвом.',
    use: 'Сайт, вивіска, технічні матеріали та навігація на об’єктах.',
  },
  {
    number: '03',
    key: 'monogram',
    title: 'Геометрична монограма',
    note: 'Найкомпактніший',
    description: 'Літери R і B зібрані в компактний технічний знак і перетнуті помаранчевою діагоналлю — символом руху, переходу та розвитку.',
    strength: 'Працює як самостійний цифровий знак та іконка.',
    use: 'Іконка сайту, соціальні мережі, аватар, маркування інструментів і спецодягу.',
  },
] as const;

const selectedVariant = 'frame';

function ProposalMark({ variant }: { variant: (typeof variants)[number]['key'] }) {
  if (variant === 'evolution') {
    return <span className="proposal-mark mark-evolution" aria-hidden="true"><i /><i /><i /><b /></span>;
  }

  if (variant === 'frame') {
    return <BrandMark className="proposal-mark" />;
  }

  return <span className="proposal-mark mark-monogram" aria-hidden="true"><b>R</b><strong>B</strong><i /><em /></span>;
}

function LogoLockup({ variant }: { variant: (typeof variants)[number]['key'] }) {
  return (
    <span className="proposal-lockup">
      <ProposalMark variant={variant} />
      <span className="proposal-wordmark">
        <b>RUBIKON BUILD</b>
        <small>Construction &amp; Engineering</small>
      </span>
    </span>
  );
}

export default function LogoVariantsPage() {
  return (
    <main className="logo-lab" id="main-content">
      <section className="logo-lab-intro">
        <div className="shell">
          <a className="logo-lab-back" href={siteRoutes.home}>← Повернутися на сайт</a>
          <p className="eyebrow light"><span /> Оновлення айдентики</p>
          <h1>Три напрями розвитку<br /><em>фірмового знака</em></h1>
          <p>Обрано напрям 02 — «Інженерна рама». Інші концепції залишаємо поруч, щоб зберегти логіку рішення й бачити різницю характерів.</p>
        </div>
      </section>

      <section className="logo-lab-options">
        <div className="shell">
          <div className="logo-options-grid">
            {variants.map((variant) => (
              <article className={`logo-option${variant.key === selectedVariant ? ' is-selected' : ''}`} key={variant.key}>
                <div className="logo-option-meta">
                  <span>{variant.number}</span>
                  <small>{variant.key === selectedVariant ? 'Обрано · Інженерна система' : variant.note}</small>
                </div>
                <div className="logo-preview logo-preview-dark">
                  <LogoLockup variant={variant.key} />
                </div>
                <div className="logo-preview logo-preview-light">
                  <LogoLockup variant={variant.key} />
                </div>
                <div className="logo-utility-row" aria-label={`Компактне застосування концепції ${variant.number}`}>
                  <span className="proposal-compact">
                    <ProposalMark variant={variant.key} />
                    <b>RB</b>
                  </span>
                  <span className="proposal-icon-tile"><ProposalMark variant={variant.key} /></span>
                  <span className="proposal-document-sample">
                    <i />
                    <b>RUBIKON BUILD</b>
                    <small>CONSTRUCTION &amp; ENGINEERING</small>
                  </span>
                </div>
                <div className="logo-option-copy">
                  <h2>{variant.title}</h2>
                  <p>{variant.description}</p>
                  <dl className="logo-option-facts">
                    <div><dt>Сильна сторона</dt><dd>{variant.strength}</dd></div>
                    <div><dt>Основне застосування</dt><dd>{variant.use}</dd></div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
          <p className="logo-choice-note"><strong>Обрано 02.</strong> Цей знак стає основою головної, компактної, іконкової та темної/світлої версій Rubikon Build.</p>
        </div>
      </section>
    </main>
  );
}
