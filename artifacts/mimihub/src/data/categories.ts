import { categoryImages } from '@/data/categoryImages';

export interface StaticSubcategory {
  id: number;
  name: string;
  slug: string;
}

export interface StaticCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string;
  subcategories: StaticSubcategory[];
}

export const staticCategories: StaticCategory[] = [
  {
    id: 1,
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Premium personal care and wellness products',
    image: categoryImages['personal-care'],
    subcategories: [
      { id: 1, name: 'Perfumes', slug: 'perfumes' },
      { id: 2, name: 'Feminine Wash', slug: 'feminine-wash' },
      { id: 3, name: 'Creams', slug: 'creams' },
      { id: 4, name: 'Wellness Products', slug: 'wellness-products' },
      { id: 5, name: 'Toothpaste', slug: 'toothpaste' },
      { id: 6, name: 'Body Oils', slug: 'body-oils' },
    ],
  },
  {
    id: 2,
    name: 'Home Essentials',
    slug: 'home-essentials',
    description: 'Premium essentials for a beautiful and comfortable home',
    image: categoryImages['home-essentials'],
    subcategories: [
      { id: 7, name: 'Curtains', slug: 'curtains' },
      { id: 8, name: 'Bedsheets and Duvets', slug: 'bedsheets-and-duvets' },
      { id: 9, name: 'Rugs', slug: 'rugs' },
      { id: 10, name: 'Poles and Hanger', slug: 'poles-and-hanger' },
    ],
  },
];