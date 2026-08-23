import type { Metadata } from 'next';
import Image from 'next/image';
import { ClipboardList, DraftingCompass, HardHat, MapPinned } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Breadcrumbs, PageCta } from '../components/SiteChrome';

const liveUrl = 'https://rubikonbuild.com';

export const metadata: Metadata = {
  title: 'Ангари та склади під ключ у Дніпрі | RUBIKON BUILD',
  description: 'Будівництво швидкомонтованих ангарів, складів і виробничих споруд у Дніпрі та області: конструкції, огородження, монтаж і координація робіт.',
  alternates: { canonical: '/angary' },
  openGraph: {
    title: 'Ангари та склади під ключ | RUBIKON BUILD',
    description: 'Швидкомонтовані споруди для виробництва, логістики, агросектору та зберігання.',
    url: '/angary',
    images: [{ url: `${liveUrl}/media/competence-hangar.jpg`, alt: 'Ангари та склади RUBIKON BUILD' }],
  },
  twitter: { card: 'summary_large_image', images: [`${liveUrl}/media/competence-hangar.jpg`] },
};

const stages: Array<[string, string, string, LucideIcon]> = [
  ['01', 'Задача і майданчик', 'Визначаємо призначення споруди, потрібні габарити, режим експлуатації та особливості ділянки.', MapPinned],
  ['02', 'Концепція', 'Погоджуємо конструктивну схему, огородження, ворота, інженерні потреби та склад робіт.', DraftingCompass],
  ['03', 'Підготовка', 'Формуємо кошторис, послідовність робіт, комплектування та план організації монтажу.', ClipboardList],
  ['04', 'Будівництво', 'Виконуємо або координуємо основу, каркас, огороджувальні конструкції та завершальні етапи.', HardHat],
];

const costFactors = [
  ['01', 'Габарити й проліт', 'Довжина, ширина, висота та схема без внутрішніх або з проміжними опорами.'],
  ['02', 'Теплий чи холодний контур', 'Профільований лист, сендвіч-панелі, утеплення та вимоги до експлуатації.'],
  ['03', 'Отвори й обладнання', 'Ворота, двері, світлові прорізи, вентиляція та майбутні технологічні навантаження.'],
  ['04', 'Майданчик і логістика', 'Основа, під’їзд для техніки, регіон будівництва та умови виконання монтажу.'],
];

export default function HangarsPage() {
  return (
    <main className="inner-page">
      <section className="service-subhero">
        <div className="service-subhero-media"><Image src="/media/competence-hangar.jpg" alt="Промисловий ангар і складська споруда" fill priority sizes="100vw" /></div>
        <div className="service-subhero-overlay" />
        <div className="shell service-subhero-content">
          <Breadcrumbs items={[{ label: 'Головна', href: '/' }, { label: 'Напрямки', href: '/napryamky' }, { label: 'Ангари', href: '/angary' }]} />
          <p className="eyebrow light"><span /> Напрямок 01</p>
          <h1>Ангари та склади<br /><em>під задачу бізнесу</em></h1>
          <p>Реалізуємо швидкомонтовані споруди під ключ або беремо на себе окремі етапи — від каркаса й огородження до монтажу на об’єкті.</p>
        </div>
      </section>

      <section className="page-section">
        <div className="shell page-heading split-heading">
          <div><p className="eyebrow"><span /> Типи об’єктів</p><h2>Простір, який працює на ваш процес</h2></div>
          <p>Починаємо не з універсального шаблону, а з функції споруди: що всередині, як рухається техніка, де потрібні ворота, світло й інженерні мережі.</p>
        </div>
        <div className="shell use-case-grid">
          <article><span>01</span><h3>Складські споруди</h3><p>Для матеріалів, готової продукції, техніки й логістичних операцій.</p></article>
          <article><span>02</span><h3>Виробничі ангари</h3><p>З урахуванням розміщення обладнання, робочих зон і технологічних вимог.</p></article>
          <article><span>03</span><h3>Аграрні об’єкти</h3><p>Для зберігання зерна, техніки, добрив та інших потреб господарства.</p></article>
        </div>
      </section>

      <section className="page-section page-section-dark">
        <div className="shell">
          <div className="page-heading split-heading">
            <div><p className="eyebrow light"><span /> Етапи</p><h2>Від задуму — до готового контуру</h2></div>
            <p>Для повного циклу координуємо основу, каркас, покрівлю, стіни, ворота й суміжні роботи. За потреби виконуємо лише погоджену частину цього комплексу.</p>
          </div>
          <ol className="detail-steps">
            {stages.map(([number, title, text, Icon]) => <li key={number}><span>{number}</span><Icon className="detail-step-icon" aria-hidden="true" /><h3>{title}</h3><p>{text}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="page-section">
        <div className="shell page-two-col reverse-mobile">
          <div className="copy-column">
            <p className="eyebrow"><span /> Продумані рішення</p>
            <h2>Враховуємо експлуатацію ще до монтажу</h2>
            <p className="lead-copy">Габарити прольотів, висота, крок колон, тип огородження, ворота та майбутні навантаження впливають на вартість і зручність споруди.</p>
            <p>Тому на старті ставимо питання про технологію роботи всередині, рух транспорту, потребу в утепленні й можливе розширення об’єкта.</p>
          </div>
          <div className="page-image"><Image src="/media/hero-steel-frame.jpg" alt="Монтаж каркаса майбутнього ангару" fill sizes="(max-width: 850px) 100vw, 48vw" /></div>
        </div>
      </section>

      <section className="page-section cost-section">
        <div className="shell">
          <div className="page-heading split-heading">
            <div><p className="eyebrow"><span /> Формування кошторису</p><h2>Ціна ангара починається з його майбутньої функції</h2></div>
            <p>Однакова площа не означає однакову вартість. На рішення впливають проліт, висота, утеплення, навантаження, комплектація та умови майданчика.</p>
          </div>
          <div className="cost-grid">
            {costFactors.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="page-section faq-section">
        <div className="shell faq-grid">
          <div><p className="eyebrow"><span /> Питання</p><h2>Перед будівництвом</h2></div>
          <div className="faq-list">
            <article><h3>Чи будуєте ангари під ключ?</h3><p>Так. Також можемо долучитися до окремого етапу як підрядник або субпідрядник — наприклад, виготовити каркас, виконати монтаж чи огородження.</p></article>
            <article><h3>Чи працюєте за межами області?</h3><p>Так, розглядаємо масштабні промислові, складські та аграрні об’єкти в інших регіонах України.</p></article>
            <article><h3>Що потрібно для попередньої оцінки?</h3><p>Призначення споруди, орієнтовні довжина, ширина й висота, місце будівництва та бажані строки.</p></article>
          </div>
        </div>
      </section>
      <PageCta eyebrow="Обговорити ангар" title="Опишіть майбутню споруду — сформуємо наступний крок" />
    </main>
  );
}
