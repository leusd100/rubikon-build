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
    routeText: 'Швидкомонтовані споруди під виробництво, логістику, техніку чи зберігання.',
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
    routeText: 'Коли будівельна частина має збігтися з вимогами обладнання для зберігання й переміщення зерна.',
    cardTitle: 'Зерносховища',
    cardText: 'Основа, металевий каркас і огороджувальний контур з урахуванням вимог технологічного обладнання.',
    image: '/media/concepts/direction-grain-v2.jpg',
    heroPoster: '/media/directions/grain-poster.webp',
    heroPosterMobile: '/media/directions/grain-poster-768w.webp',
    heroImage: directionHeroImageAssets.zernoskhovyshcha,
    imageAlt: 'Конструкція зерносховища з оцинкованим силосом і сталевими опорами',
    cardClassName: 'tall',
    seoTitle: brandedTitle('Зерносховища у Дніпрі'),
    seoDescription: 'Будівельна частина зерносховищ у Дніпропетровській області: основа, монтаж каркаса, огородження й покрівля в погодженому обсязі.',
  },
  {
    id: 'metalokonstruktsii',
    number: '03',
    href: '/metalokonstruktsii',
    title: 'Металоконструкції',
    formLabel: 'Металоконструкції',
    serviceTitle: 'Металоконструкції',
    routeText: 'Виготовлення або монтаж каркасів, ферм і окремих вузлів — за погодженою документацією.',
    cardTitle: 'Металоконструкції',
    cardText: 'Організовуємо виготовлення й монтуємо каркаси, ферми та вузли за документацією замовника.',
    image: '/media/concepts/direction-steel-v2.jpg',
    heroPoster: '/media/directions/steel-poster.webp',
    heroPosterMobile: '/media/directions/steel-poster-768w.webp',
    heroImage: directionHeroImageAssets.metalokonstruktsii,
    imageAlt: 'Болтовий вузол несучої металоконструкції з фасонними пластинами',
    cardClassName: 'compact',
    seoTitle: brandedTitle('Металоконструкції у Дніпрі'),
    seoDescription: 'Організація виготовлення та монтаж металоконструкцій у Дніпропетровській області за документацією замовника.',
  },
  {
    id: 'betonni-roboty',
    number: '04',
    href: '/betonni-roboty',
    title: 'Бетонні роботи',
    formLabel: 'Бетонні роботи',
    serviceTitle: 'Бетонні роботи',
    routeText: 'Фундаменти, основи під обладнання, бетонні площадки й промислові підлоги.',
    cardTitle: 'Бетонні роботи',
    cardText: 'Типові фундаменти й бетонні основи за проєктом; спеціалізовані етапи підлог погоджуємо окремо.',
    image: '/media/concepts/direction-concrete-v2.jpg',
    heroPoster: '/media/directions/concrete-poster.webp',
    heroPosterMobile: '/media/directions/concrete-poster-768w.webp',
    heroImage: directionHeroImageAssets['betonni-roboty'],
    imageAlt: 'Армування промислового фундаменту з анкерною групою',
    cardClassName: 'concrete',
    seoTitle: brandedTitle('Бетонні роботи у Дніпрі'),
    seoDescription: 'Типові фундаменти й бетонні основи у Дніпропетровській області. Спеціалізовані етапи промислових підлог — за окремим погодженням.',
  },
  {
    id: 'pokrivelni-roboty',
    number: '05',
    href: '/pokrivelni-roboty',
    title: 'Покрівельні роботи',
    formLabel: 'Покрівельні роботи',
    serviceTitle: 'Покрівельні роботи',
    routeText: 'Монтаж нової покрівлі, заміна старої або ремонт проблемних ділянок і примикань.',
    cardTitle: 'Покрівельні роботи',
    cardText: 'Монтаж і ремонт промислових, складських і комерційних покрівель — з увагою до вузлів і герметичності.',
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

// A real answer, not a skipped field: the visitor has a task but has not picked a direction yet. /napryamky's form
// starts on it, because that page invites people who do not know their direction.
export const undecidedDirection = 'Ще не визначено';

export const inquiryDirectionOptions = [
  ...directions.map(({ formLabel }) => formLabel),
  'Комплексне будівництво',
  'Інше',
  undecidedDirection,
] as const;
