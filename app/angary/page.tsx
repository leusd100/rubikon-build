import type { Metadata } from 'next';
import { ClipboardList, DraftingCompass, HardHat, MapPinned } from 'lucide-react';
import {
  DirectionCostSection,
  DirectionFaq,
  DirectionHero,
  DirectionProcess,
  type DirectionFaqItem,
  type DirectionItem,
  type DirectionStep,
} from '../components/DirectionDetail';
import { PageCta } from '../components/SiteChrome';

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

const stages: DirectionStep[] = [
  ['01', 'Задача і майданчик', 'Визначаємо призначення споруди, потрібні габарити, режим експлуатації та особливості ділянки.', MapPinned],
  ['02', 'Концепція', 'Погоджуємо конструктивну схему, огородження, ворота, інженерні потреби та склад робіт.', DraftingCompass],
  ['03', 'Підготовка', 'Формуємо кошторис, послідовність робіт, комплектування та план організації монтажу.', ClipboardList],
  ['04', 'Будівництво', 'Виконуємо або координуємо основу, каркас, огороджувальні конструкції та завершальні етапи.', HardHat],
];

const costFactors: DirectionItem[] = [
  ['01', 'Габарити й проліт', 'Довжина, ширина, висота та схема без внутрішніх або з проміжними опорами.'],
  ['02', 'Теплий чи холодний контур', 'Профільований лист, сендвіч-панелі, утеплення та вимоги до експлуатації.'],
  ['03', 'Отвори й обладнання', 'Ворота, двері, світлові прорізи, вентиляція та майбутні технологічні навантаження.'],
  ['04', 'Майданчик і логістика', 'Основа, під’їзд для техніки, регіон будівництва та умови виконання монтажу.'],
];

const faqItems: DirectionFaqItem[] = [
  ['Чи будуєте ангари під ключ?', 'Так. Також можемо долучитися до окремого етапу як підрядник або субпідрядник — наприклад, виготовити каркас, виконати монтаж чи огородження.'],
  ['Чи працюєте за межами області?', 'Так, розглядаємо масштабні промислові, складські та аграрні об’єкти в інших регіонах України.'],
  ['Що потрібно для попередньої оцінки?', 'Призначення споруди, орієнтовні довжина, ширина й висота, місце будівництва та бажані строки.'],
];

export default function HangarsPage() {
  return (
    <main className="inner-page">
      <DirectionHero
        path="/angary"
        number="01"
        breadcrumbLabel="Ангари"
        title="Ангари та склади"
        accent="під задачу бізнесу"
        intro="Реалізуємо швидкомонтовані споруди під ключ або беремо на себе окремі етапи — від каркаса й огородження до монтажу на об’єкті."
        poster="/media/competence-hangar.jpg"
        video="/media/directions/hangars.mp4"
      />

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

      <DirectionProcess
        eyebrow="Етапи"
        title="Від задуму — до готового контуру"
        text="Для повного циклу координуємо основу, каркас, покрівлю, стіни, ворота й суміжні роботи. За потреби виконуємо лише погоджену частину цього комплексу."
        steps={stages}
      />
      <DirectionCostSection
        title="Ціна ангара починається з його майбутньої функції"
        text="Однакова площа не означає однакову вартість. На рішення впливають проліт, висота, утеплення, навантаження, комплектація та умови майданчика."
        items={costFactors}
      />
      <DirectionFaq title="Перед будівництвом" items={faqItems} />
      <PageCta eyebrow="Обговорити ангар" title="Опишіть майбутню споруду — сформуємо наступний крок" />
    </main>
  );
}
