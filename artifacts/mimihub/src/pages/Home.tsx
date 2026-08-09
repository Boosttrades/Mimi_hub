import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Award, Heart, ShieldCheck, Truck, Users } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { CategoryCard } from '@/components/product/CategoryCard';
import { Button } from '@/components/ui/button';

const collections = [
  {
    id: 'personal-care',
    title: 'Personal Care',
    description: 'Perfumes, body oils, creams, feminine wash, toothpaste, wellness products and more.',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=85',
    href: '/category/personal-care',
  },
  {
    id: 'home-essentials',
    title: 'Home Essentials',
    description: 'Curtains, poles, rugs, bedsheets, duvets and more for your home.',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85',
    href: '/category/home-essentials',
  },
];

const categories = [
  {
    id: 1,
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Premium personal care and wellness products',
    image: collections[0].image,
    subcategories: [
      { id: 1, name: 'Perfumes' },
      { id: 2, name: 'Feminine Wash' },
      { id: 3, name: 'Creams' },
      { id: 4, name: 'Wellness Products' },
      { id: 5, name: 'Toothpaste' },
      { id: 6, name: 'Body Oils' },
    ],
  },
  {
    id: 2,
    name: 'Home Essentials',
    slug: 'home-essentials',
    description: 'Premium essentials for a beautiful and comfortable home',
    image: collections[1].image,
    subcategories: [
      { id: 7, name: 'Curtains' },
      { id: 8, name: 'Bedsheets and Duvets' },
      { id: 9, name: 'Rugs' },
      { id: 10, name: 'Poles and Hanger' },
    ],
  },
];

const trustItems = [
  { title: 'Premium Quality', subtitle: 'Carefully selected', icon: Award },
  { title: 'Fast Delivery', subtitle: 'Nationwide', icon: Truck },
  { title: 'Secure Shopping', subtitle: '100% safe', icon: ShieldCheck },
  { title: 'Dedicated Support', subtitle: "We're here to help", icon: Users },
];

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((slide) => (slide + 1) % collections.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Layout>
      <section className="px-4 pb-8 pt-7 md:px-8 md:pb-12 md:pt-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
              Curated for you
            </p>
            <h1 className="mt-1 font-serif text-3xl text-foreground md:text-4xl">Collections</h1>
          </div>
          <div className="flex gap-1.5 pb-1" aria-label="Collection slides">
            {collections.map((collection, index) => (
              <button
                key={collection.id}
                type="button"
                aria-label={`Show ${collection.title}`}
                onClick={() => setCurrentSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  currentSlide === index ? 'w-7 bg-primary' : 'w-1.5 bg-primary/30'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative min-h-[430px] md:min-h-[500px]">
          {collections.map((collection, index) => (
            <article
              key={collection.id}
              className={`absolute inset-0 overflow-hidden rounded-2xl bg-secondary shadow-sm transition-opacity duration-700 ${
                currentSlide === index ? 'z-10 opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <img
                src={collection.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/30 to-black/5" />
              <div className="relative flex h-full max-w-xl flex-col justify-center p-7 text-white md:p-12">
                <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/80">MimiiHub edit</p>
                <h2 className="font-serif text-4xl leading-tight md:text-6xl">{collection.title}</h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-white/85 md:text-base">
                  {collection.description}
                </p>
                <Link href={collection.href} className="mt-7 inline-flex">
                  <Button className="rounded-md bg-background px-5 text-xs font-semibold uppercase tracking-widest text-foreground hover:bg-background/90">
                    Shop now
                  </Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-secondary/25 px-4 py-8 md:px-8 md:py-10">
        <div className="grid grid-cols-2 gap-y-7 md:grid-cols-4 md:gap-4">
          {trustItems.map(({ title, subtitle, icon: Icon }) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-sm font-semibold md:text-base">{title}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 md:py-14">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">Explore</p>
            <h2 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">Shop by Category</h2>
          </div>
          <Link href="/categories" className="text-xs font-semibold uppercase tracking-wider text-primary">
            View all
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="px-4 pb-10 text-center md:px-8 md:pb-14">
        <div className="mx-auto flex max-w-2xl items-center justify-center gap-2 text-primary">
          <Heart className="h-4 w-4" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.25em]">MimiiHub</span>
          <Heart className="h-4 w-4" />
        </div>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Thoughtfully selected essentials for your beauty, wellness, and home.
        </p>
      </section>
    </Layout>
  );
}