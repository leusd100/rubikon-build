import { brandedTitle } from '../lib/seo';
import { directionHeroImageAssets, type DirectionHeroImageAsset } from './directionHeroImageManifest';

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
  heroPoster: string;
  heroPosterMobile: string;
  heroImage: DirectionHeroImageAsset;
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
    routeText: 'Якщо потрібна швидкомонтована споруда під виробництво, логістику, техніку або зберігання.',
    cardTitle: 'Ангари та склади',
    cardText: 'Каркас, огородження та ворота — під виробництво, логістику, техніку або зберігання.',
    image: '/media/concepts/direction-hangars-v2.jpg',
    heroPoster: '/media/directions/hangars-poster.webp',
    heroPosterMobile: '/media/directions/hangars-poster-768w.webp',
    heroImage: directionHeroImageAssets.angary,
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
    routeText: 'Якщо будівельну частину потрібно узгодити з вимогами обладнання для зберігання та переміщення зерна.',
    cardTitle: 'Зерносховища',
    cardText: 'Основа, металевий каркас і огороджувальний контур з урахуванням вимог технологічного обладнання.',
    image: '/media/concepts/direction-grain-v2.jpg',
    heroPoster: '/media/directions/grain-poster.webp',
    heroPosterMobile: '/media/directions/grain-poster-768w.webp',
    heroImage: directionHeroImageAssets.zernoskhovyshcha,
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
    routeText: 'Якщо потрібне виготовлення або монтаж каркаса, ферм чи окремих металевих вузлів за погодженою документацією.',
    cardTitle: 'Металоконструкції',
    cardText: 'Виготовлення та монтаж каркасів, ферм і окремих конструктивних вузлів за погодженою документацією.',
    image: '/media/concepts/direction-steel-v2.jpg',
    heroPoster: '/media/directions/steel-poster.webp',
    heroPosterMobile: '/media/directions/steel-poster-768w.webp',
    heroImage: directionHeroImageAssets.metalokonstruktsii,
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
    routeText: 'Якщо потрібен фундамент, основа під обладнання, бетонна площадка або промислова підлога.',
    cardTitle: 'Бетонні роботи',
    cardText: 'Фундаменти, основи під обладнання та промислові підлоги з урахуванням навантажень і умов експлуатації.',
    image: '/media/concepts/direction-concrete-v2.jpg',
    heroPoster: '/media/directions/concrete-poster.webp',
    heroPosterMobile: '/media/directions/concrete-poster-768w.webp',
    heroImage: directionHeroImageAssets['betonni-roboty'],
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
    routeText: 'Якщо потрібен монтаж нової покрівлі, заміна існуючої або ремонт проблемних ділянок і примикань.',
    cardTitle: 'Покрівельні роботи',
    cardText: 'Монтаж нових покрівель і ремонт існуючих — з увагою до вузлів, примикань та герметичності.',
    image: '/media/concepts/direction-roofing-v2.jpg',
    heroPoster: '/media/directions/roofing-poster.webp',
    heroPosterMobile: '/media/directions/roofing-poster-768w.webp',
    heroImage: directionHeroImageAssets['pokrivelni-roboty'],
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
