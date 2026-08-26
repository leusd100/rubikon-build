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
    formLabel: 'Ангар або склад',
    serviceTitle: 'Ангари та склади',
    serviceText: 'Швидкомонтовані споруди для виробництва, логістики, агросектору й комерційних задач.',
    routeText: 'Швидкомонтовані споруди для виробництва, логістики, техніки, матеріалів і готової продукції.',
    cardTitle: 'Ангари та склади',
    cardText: 'Швидкомонтовані споруди для виробництва, логістики, агросектору та зберігання.',
    image: '/media/competence-hangar.webp',
    imageAlt: 'Промисловий ангар і складська будівля',
    cardClassName: 'wide',
    seoTitle: brandedTitle('Ангари та склади під ключ у Дніпрі'),
    seoDescription: 'Будівництво швидкомонтованих ангарів, складів і виробничих споруд у Дніпрі та області: конструкції, огородження, монтаж і координація робіт.',
  },
  {
    id: 'zernoskhovyshcha',
    number: '02',
    href: '/zernoskhovyshcha',
    title: 'Зерносховища',
    formLabel: 'Зерносховище',
    serviceTitle: 'Зерносховища під ключ',
    serviceText: 'Комплексна реалізація: основа, каркас, огороджувальні конструкції та монтаж.',
    routeText: 'Підготовка основи, металевий каркас, огороджувальні конструкції, монтаж і координація суміжних етапів.',
    cardTitle: 'Зерносховища',
    cardText: 'Основа, металевий каркас, огороджувальні конструкції та координація монтажу.',
    image: '/media/competence-grain.webp',
    imageAlt: 'Промислове зерносховище біля поля',
    cardClassName: 'tall',
    seoTitle: brandedTitle('Зерносховища під ключ у Дніпрі'),
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
    cardTitle: 'Несучі металоконструкції',
    cardText: 'Виготовлення та монтаж каркасів, балок, ферм і складних металевих вузлів.',
    image: '/media/competence-steel.webp',
    imageAlt: 'Монтаж і зварювання несучого сталевого каркаса',
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
    routeText: 'Фундаменти, основи під конструкції та обладнання, промислові підлоги й монолітні ділянки відповідно до задачі об’єкта.',
    cardTitle: 'Бетонні роботи',
    cardText: 'Фундаменти, основи, промислові підлоги та монолітні елементи під задачу об’єкта.',
    image: '/media/competence-concrete.webp',
    imageAlt: 'Армування залізобетонної основи на будівельному майданчику',
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
    image: '/media/competence-roofing.webp',
    imageAlt: 'Роботи на металевій покрівлі промислової споруди',
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
  'Комплексний об’єкт під ключ',
  'Інше',
] as const;
