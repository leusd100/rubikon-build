import { brandedTitle } from '../lib/seo';

export type DirectionId =
  | 'angary'
  | 'zernoskhovyshcha'
  | 'metalokonstruktsii'
  | 'betonni-roboty'
  | 'pokrivelni-roboty';

export type Direction = {
  id: DirectionId;
  number: string;
  href: string;
  title: string;
  formLabel: string;
  serviceTitle: string;
  serviceText: string;
  routeText: string;
  cardTitle: string;
  cardText: string;
  image: string;
  imageAlt: string;
  cardClassName: string;
  seoTitle: string;
  seoDescription: string;
};

export const directions: readonly Direction[] = [
  {
    id: 'angary',
    number: '01',
    href: '/angary',
    title: 'Ангари та склади',
    formLabel: 'Ангари та склади',
    serviceTitle: 'Ангари та склади',
    serviceText: 'Швидкомонтовані споруди для виробництва, логістики, агросектору й комерційних завдань.',
    routeText: 'Швидкомонтовані споруди для виробництва, логістики, техніки, матеріалів і готової продукції.',
    cardTitle: 'Ангари та склади',
    cardText: 'Швидкомонтовані споруди для виробництва, логістики, агросектору та зберігання.',
    image: '/media/concepts/direction-hangars-v2.jpg',
    imageAlt: 'Каркас промислового ангара з повторюваними сталевими рамами',
    cardClassName: 'wide',
    seoTitle: brandedTitle('Ангари та склади у Дніпрі'),
    seoDescription: 'Будівництво швидкомонтованих ангарів, складів і виробничих споруд у Дніпрі та області: конструкції, огородження, монтаж і координація робіт.',
  },
  {
    id: 'zernoskhovyshcha',
    number: '02',
    href: '/zernoskhovyshcha',
    title: 'Зерносховища',
    formLabel: 'Зерносховища',
    serviceTitle: 'Зерносховища',
    serviceText: 'Комплексна реалізація: основа, каркас, огороджувальні конструкції та монтаж.',
    routeText: 'Підготовка основи, металевий каркас, огороджувальні конструкції, монтаж і координація суміжних етапів.',
    cardTitle: 'Зерносховища',
    cardText: 'Основа, металевий каркас, огороджувальні конструкції та координація монтажу.',
    image: '/media/concepts/direction-grain-v2.jpg',
    imageAlt: 'Конструкція зерносховища з оцинкованим силосом і сталевими опорами',
    cardClassName: 'tall',
    seoTitle: brandedTitle('Зерносховища у Дніпрі'),
    seoDescription: 'Будівництво зерносховищ у Дніпрі та Україні: основа, металевий каркас, огородження, покрівля, монтаж і координація робіт.',
  },
  {
    id: 'metalokonstruktsii',
    number: '03',
    href: '/metalokonstruktsii',
    title: 'Металоконструкції',
    formLabel: 'Металоконструкції',
    serviceTitle: 'Металоконструкції',
    serviceText: 'Проєктування, виготовлення та монтаж каркасів, ферм, балок і складних металевих вузлів.',
    routeText: 'Каркаси, колони, балки, ферми, опорні та нестандартні металеві вузли. Організовуємо виготовлення, доставку й монтаж.',
    cardTitle: 'Металоконструкції',
    cardText: 'Виготовлення та монтаж каркасів, балок, ферм і складних металевих вузлів.',
    image: '/media/concepts/direction-steel-v2.jpg',
    imageAlt: 'Болтовий вузол несучої металоконструкції з фасонними пластинами',
    cardClassName: 'compact',
    seoTitle: brandedTitle('Металоконструкції у Дніпрі'),
    seoDescription: 'Проєктування, виготовлення й монтаж металоконструкцій у Дніпрі та області: каркаси, колони, балки, ферми й нестандартні металеві вузли.',
  },
  {
    id: 'betonni-roboty',
    number: '04',
    href: '/betonni-roboty',
    title: 'Бетонні роботи',
    formLabel: 'Бетонні роботи',
    serviceTitle: 'Бетонні роботи',
    serviceText: 'Фундаменти, промислові підлоги, монолітні ділянки та основи під конструкції й обладнання.',
    routeText: 'Фундаменти, основи під конструкції та обладнання, промислові підлоги й монолітні ділянки відповідно до завдання об’єкта.',
    cardTitle: 'Бетонні роботи',
    cardText: 'Фундаменти, основи, промислові підлоги та монолітні елементи відповідно до завдання об’єкта.',
    image: '/media/concepts/direction-concrete-v2.jpg',
    imageAlt: 'Армування промислового фундаменту з анкерною групою',
    cardClassName: 'concrete',
    seoTitle: brandedTitle('Бетонні роботи у Дніпрі'),
    seoDescription: 'Бетонні роботи у Дніпрі та області: фундаменти, основи під конструкції й обладнання, промислові підлоги та монолітні ділянки.',
  },
  {
    id: 'pokrivelni-roboty',
    number: '05',
    href: '/pokrivelni-roboty',
    title: 'Покрівельні роботи',
    formLabel: 'Покрівельні роботи',
    serviceTitle: 'Покрівельні роботи',
    serviceText: 'Монтаж і ремонт покрівель промислових, складських та аграрних споруд із герметизацією вузлів і примикань.',
    routeText: 'Монтаж і ремонт покрівель промислових, складських та аграрних споруд із герметизацією вузлів і примикань.',
    cardTitle: 'Покрівельні роботи',
    cardText: 'Монтаж, ремонт і герметизація покрівель промислових, складських та аграрних споруд.',
    image: '/media/concepts/direction-roofing-v2.jpg',
    imageAlt: 'Монтаж вузла металевої покрівлі промислової споруди',
    cardClassName: 'roof',
    seoTitle: brandedTitle('Покрівельні роботи у Дніпрі'),
    seoDescription: 'Монтаж і ремонт промислових покрівель у Дніпрі та області: профільований лист, утеплені системи, герметизація вузлів і примикань.',
  },
] as const;

export function getDirection(id: DirectionId): Direction {
  const direction = directions.find((item) => item.id === id);

  if (!direction) {
    throw new Error(`Unknown direction: ${id}`);
  }

  return direction;
}

export const inquiryDirectionOptions = [
  ...directions.map(({ formLabel }) => formLabel),
  'Комплексне будівництво',
  'Інше',
] as const;
