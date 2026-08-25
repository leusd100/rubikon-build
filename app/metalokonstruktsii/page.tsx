import type { Metadata } from 'next';
import { ClipboardList, DraftingCompass, Factory, HardHat } from 'lucide-react';
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
import { getDirection } from '../data/directions';
import { createPageMetadata } from '../lib/seo';

const direction = getDirection('metalokonstruktsii');

export const metadata: Metadata = createPageMetadata({
  path: direction.href,
  title: direction.seoTitle,
  description: direction.seoDescription,
  image: direction.image,
  imageAlt: direction.imageAlt,
});

const steps: DirectionStep[] = [
  ['01', 'Вихідні дані', 'Уточнюємо призначення конструкції, геометрію, навантаження та умови монтажу.', ClipboardList],
  ['02', 'Технічне рішення', 'Формуємо конструктивну схему, вузли, склад матеріалів і послідовність робіт.', DraftingCompass],
  ['03', 'Виготовлення', 'Організовуємо заготівлю, складання, зварювання та підготовку конструкцій до монтажу.', Factory],
  ['04', 'Монтаж', 'Доставляємо елементи на об’єкт, виконуємо складання та контролюємо ключові з’єднання.', HardHat],
];

const costFactors: DirectionItem[] = [
  ['01', 'Обсяг металу', 'Тоннаж, довжина елементів і загальна кількість деталей у комплекті.'],
  ['02', 'Складність вузлів', 'Кількість операцій, типи з’єднань, точність і повторюваність елементів.'],
  ['03', 'Захист поверхні', 'Підготовка металу, ґрунтування, фарбування або інший погоджений захист.'],
  ['04', 'Умови монтажу', 'Відстань до об’єкта, доступ техніки, висота робіт і організація майданчика.'],
];

const faqItems: DirectionFaqItem[] = [
  ['Чи працюєте за готовим проєктом?', 'Так. Спочатку перевіряємо комплектність вихідних даних і погоджуємо межі відповідальності.'],
  ['Чи можна замовити окремо виготовлення або монтаж?', 'Так. Погоджуємо конкретний етап, вхідні дані та межі відповідальності. Для монтажу конструкції й документація мають бути придатними до безпечного виконання робіт.'],
  ['Як формується вартість?', 'На неї впливають тоннаж, складність вузлів, покриття, логістика, умови майданчика та обсяг монтажу.'],
];

export default function SteelPage() {
  return (
    <main className="inner-page">
      <DirectionHero
        path="/metalokonstruktsii"
        number="03"
        breadcrumbLabel="Металоконструкції"
        title="Металоконструкції"
        accent="від деталі до монтажу"
        intro="Закриваємо весь цикл робіт із металоконструкціями або окремо виконуємо виготовлення, доставку чи монтаж у форматі підряду та субпідряду."
        poster="/media/competence-steel.jpg"
        video="/media/directions/steel.mp4"
      />

      <section className="page-section">
        <div className="shell page-two-col align-start">
          <div className="sticky-heading">
            <p className="eyebrow"><span /> Що виконуємо</p>
            <h2>Несуча основа, розрахована на реальну експлуатацію</h2>
          </div>
          <div className="feature-list">
            <article><span>01</span><h3>Каркаси будівель</h3><p>Колони, ригелі, балки та зв’язки для промислових, складських і комерційних споруд.</p></article>
            <article><span>02</span><h3>Ферми та балки</h3><p>Елементи покриття й перекриття з урахуванням прольотів, навантажень і монтажної схеми.</p></article>
            <article><span>03</span><h3>Опорні конструкції</h3><p>Майданчики, сходи, рами та допоміжні конструкції для обладнання й технологічних потреб.</p></article>
            <article><span>04</span><h3>Нестандартні вузли</h3><p>Виготовлення деталей і з’єднань під конкретну задачу, креслення або наявні умови об’єкта.</p></article>
          </div>
        </div>
      </section>

      <DirectionProcess
        title="Керуємо не лише металом, а всім процесом"
        text="Надійність конструкції залежить від точності вихідних даних, якості виготовлення та правильної роботи на монтажі."
        steps={steps}
      />
      <DirectionCostSection
        title="Вартість визначає конструкція, а не одна цифра за тонну"
        text="Для попередньої оцінки потрібні креслення або базові параметри майбутньої конструкції. Після цього можна предметно оцінити склад робіт."
        items={costFactors}
      />
      <DirectionFaq title="Перед замовленням" items={faqItems} />
      <PageCta eyebrow="Обговорити металоконструкції" title="Є креслення або лише задача? Почнемо з вихідних даних" />
    </main>
  );
}
