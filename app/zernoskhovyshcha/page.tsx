import type { Metadata } from 'next';
import { ClipboardList, DraftingCompass, HardHat, Layers3 } from 'lucide-react';
import { DirectionDetail } from '../components/DirectionDetail';
import { getDirection } from '../data/directions';
import { createPageMetadata } from '../lib/seo';

const direction = getDirection('zernoskhovyshcha');

export const metadata: Metadata = createPageMetadata({
  path: direction.href,
  title: direction.seoTitle,
  description: direction.seoDescription,
  image: direction.image,
  imageAlt: direction.imageAlt,
});

export default function GrainStoragePage() {
  return <DirectionDetail
    path="/zernoskhovyshcha"
    number="02"
    title="Зерносховища"
    accent="від основи до готового контуру"
    intro="Реалізуємо зерносховища комплексно або беремо на себе визначений етап — бетонну основу, металевий каркас, огородження, покрівлю чи монтаж."
    image="/media/competence-grain.jpg"
    video="/media/directions/grain.mp4"
    overviewEyebrow="Склад робіт"
    overviewTitle="Рішення під технологію зберігання"
    overviewText="Склад споруди визначають обсяг зберігання, схема завантаження й вивантаження, вимоги до вентиляції та умови майданчика."
    items={[
      ['01', 'Основа й фундаменти', 'Готуємо бетонні основи під силоси, каркас, технологічне обладнання та допоміжні конструкції.'],
      ['02', 'Металевий каркас', 'Виготовляємо й монтуємо несучі елементи, майданчики, сходи та опорні конструкції.'],
      ['03', 'Огородження та покрівля', 'Формуємо захищений контур споруди з увагою до герметичності та складних примикань.'],
      ['04', 'Координація монтажу', 'Узгоджуємо послідовність загальнобудівельних і суміжних робіт на майданчику.'],
    ]}
    processTitle="Від вихідних даних до узгодженого монтажу"
    processText="До старту фіксуємо межі відповідальності, технічні вимоги та послідовність робіт — особливо там, де будівельна частина стикується з обладнанням."
    steps={[
      ['01', 'Вихідні дані', 'Уточнюємо місткість, технологію, габарити, навантаження та умови ділянки.', ClipboardList],
      ['02', 'Технічне рішення', 'Формуємо схему основ, каркаса, огородження й монтажних вузлів.', DraftingCompass],
      ['03', 'Будівельна частина', 'Виконуємо погоджені бетонні, металеві та огороджувальні роботи.', Layers3],
      ['04', 'Монтаж і перевірка', 'Координуємо збирання, стикування етапів і перевіряємо результат.', HardHat],
    ]}
    ctaEyebrow="Обговорити зерносховище"
    ctaTitle="Є технологічне завдання або лише місткість? Почнемо з вихідних даних"
  />;
}
