import type { Metadata } from 'next';
import { ClipboardList, Construction, Layers3, Ruler } from 'lucide-react';
import { DirectionDetail } from '../components/DirectionDetail';
import { getDirection } from '../data/directions';
import { createPageMetadata } from '../lib/seo';

const direction = getDirection('betonni-roboty');

export const metadata: Metadata = createPageMetadata({
  path: direction.href,
  title: direction.seoTitle,
  description: direction.seoDescription,
  image: direction.image,
  imageAlt: direction.imageAlt,
});

export default function ConcreteWorksPage() {
  return <DirectionDetail
    path="/betonni-roboty"
    number="04"
    title="Бетонні роботи"
    accent="під навантаження об’єкта"
    intro="Виконуємо фундаменти, основи, промислові підлоги та монолітні елементи як частину комплексного будівництва або окремий етап підряду."
    image="/media/competence-concrete.jpg"
    video="/media/directions/concrete.mp4"
    overviewEyebrow="Що виконуємо"
    overviewTitle="Основа, від якої залежить весь об’єкт"
    overviewText="До бетонування перевіряємо геометрію, відмітки, армування, закладні елементи та готовність майданчика."
    items={[
      ['01', 'Фундаменти', 'Стрічкові, плитні та локальні рішення під каркаси, стіни й технологічні навантаження.'],
      ['02', 'Основи під обладнання', 'Точні геометричні й висотні прив’язки, анкери та закладні елементи під конкретну техніку.'],
      ['03', 'Промислові підлоги', 'Підготовка основи, армування, бетонування та контроль площинності робочої поверхні.'],
      ['04', 'Монолітні ділянки', 'Плити, пояси, підпірні й допоміжні елементи в межах погодженого проєкту.'],
    ]}
    processTitle="Контроль до заливання важливіший за виправлення після"
    processText="Перевіряємо підготовчі роботи до подачі бетону, організовуємо послідовність і контролюємо ключові параметри виконання."
    steps={[
      ['01', 'Заміри й відмітки', 'Фіксуємо геометрію, висоти, навантаження та прив’язки майбутньої конструкції.', Ruler],
      ['02', 'Підготовка', 'Готуємо основу, опалубку, армування, закладні елементи й логістику бетонування.', ClipboardList],
      ['03', 'Бетонування', 'Організовуємо подачу, укладання та ущільнення бетонної суміші.', Construction],
      ['04', 'Контроль результату', 'Перевіряємо геометрію, поверхню та дотримання погодженої технології.', Layers3],
    ]}
    ctaEyebrow="Обговорити бетонні роботи"
    ctaTitle="Надішліть креслення або параметри основи — уточнимо склад робіт"
  />;
}
