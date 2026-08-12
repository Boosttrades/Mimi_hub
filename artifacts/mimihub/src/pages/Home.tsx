import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Award, Heart, ShieldCheck, Truck, Users } from 'lucide-react';
import { useListProducts } from '@workspace/api-client-react';
import { Layout } from '@/components/layout/Layout';
import { CategoryCard } from '@/components/product/CategoryCard';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { staticCategories } from '@/data/categories';

const categories = staticCategories;
const collections = staticCategories.map((category) => ({
  id: category.slug,
  title: category.name,
  description: category.description,
  image: category.image,
  href: `/category/${category.slug}`,
}));

const trustItems = [
  { title: 'Premium Quality', subtitle: 'Carefully selected', icon: Award },
  { title: 'Fast Delivery', subtitle: 'Nationwide', icon: Truck },
  { title: 'Secure Shopping', subtitle: '100% safe', icon: ShieldCheck },
  { title: 'Dedicated Support', subtitle: "We're here to help", icon: Users },
];

export function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { data: featuredProducts = [] } = useListProducts({ featured: true, visible: true });
  const { data: favoriteProducts = [] } = useListProducts({ bestSeller: true, visible: true });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((slide) => (slide + 1) % collections.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <Layout>
      <section className="px-4 pb-8 pt-7 md:px-8 md:pb-12 md:pt-10">
        <div className="relative min-h-[430px] md:min-h-[500px]">
          <div className="absolute right-4 top-4 z-20 flex gap-1.5" aria-label="Collection slides">
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

      <section className="bg-secondary/25 px-4 py-10 md:px-8 md:py-14">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">Shop our edit</p>
            <h2 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">Featured Products</h2>
          </div>
          <Link href="/categories" className="text-xs font-semibold uppercase tracking-wider text-primary">
            View all
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Award className="h-10 w-10" />}
            title="Featured products coming soon"
            description="Our featured collection will appear here once products are added."
          />
        )}
      </section>

      <section className="px-4 py-10 md:px-8 md:py-14">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">Chosen for you</p>
            <h2 className="mt-1 font-serif text-2xl text-foreground md:text-3xl">MimiiHub Favorites</h2>
          </div>
          <Link href="/categories" className="text-xs font-semibold uppercase tracking-wider text-primary">
            View all
          </Link>
        </div>
        {favoriteProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {favoriteProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Heart className="h-10 w-10" />}
            title="MimiiHub favorites coming soon"
            description="Our favorite picks will appear here once products are added."
          />
        )}
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