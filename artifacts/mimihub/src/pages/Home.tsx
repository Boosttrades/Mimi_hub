import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingPage, LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { 
  useGetHomepageSettings, 
  useListCategories, 
  useListProducts 
} from '@workspace/api-client-react';
import { ChevronRight, ShieldCheck, Truck, Clock, CreditCard } from 'lucide-react';

export function Home() {
  const { data: settings, isLoading: loadingSettings, isError: errorSettings } = useGetHomepageSettings();
  const { data: categories, isLoading: loadingCategories } = useListCategories();
  const { data: featuredProducts, isLoading: loadingFeatured } = useListProducts({ featured: true });
  const { data: newArrivals, isLoading: loadingNew } = useListProducts({ newArrival: true });

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!settings?.heroBanners?.length) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % settings.heroBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [settings?.heroBanners?.length]);

  if (loadingSettings) return <LoadingPage />;
  if (errorSettings) return <Layout><ErrorState onRetry={() => window.location.reload()} /></Layout>;

  const banners = settings?.heroBanners || [];
  const trustItems = settings?.trustItems || [];
  const featuredCollections = settings?.featuredCollections || [];

  return (
    <Layout>
      {/* Hero Carousel */}
      {banners.length > 0 && (
        <section className="relative w-full h-[50vh] md:h-[70vh] bg-secondary overflow-hidden">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <img
                src={banner.image || 'https://placehold.co/1200x800/D4B483/FAF6F0?text=Hero'}
                alt={banner.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center text-center px-4">
                <div className="max-w-2xl text-white">
                  <p className="text-xs md:text-base tracking-[0.2em] uppercase mb-4 opacity-90">{banner.subtitle}</p>
                  <h1 className="text-3xl md:text-5xl font-serif mb-6 leading-tight">{banner.title}</h1>
                  {banner.buttonText && banner.buttonLink && (
                    <Link href={banner.buttonLink}>
                      <Button className="bg-white text-foreground hover:bg-white/90 hover:text-primary rounded-none px-8 py-6 text-sm tracking-widest uppercase transition-all">
                        {banner.buttonText}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
          {banners.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-20">
              {banners.map((_, index) => (
                <button
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
                  }`}
                  onClick={() => setCurrentSlide(index)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Featured Collections */}
      {featuredCollections.length > 0 && (
        <section className="py-12 px-4 container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {featuredCollections.map((collection) => (
              <Link key={collection.id} href={collection.link}>
                <div className="relative h-[300px] md:h-[400px] rounded-2xl overflow-hidden group cursor-pointer">
                  <img
                    src={collection.image || 'https://placehold.co/800x600/D4B483/FAF6F0?text=Collection'}
                    alt={collection.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                    <h3 className="text-white font-serif text-xl md:text-2xl mb-2">{collection.title}</h3>
                    <p className="text-white/90 text-xs mb-4 line-clamp-2">{collection.description}</p>
                    <span className="inline-flex items-center text-white text-xs font-semibold tracking-wider uppercase group-hover:text-primary transition-colors">
                      Shop Now <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Categories Grid */}
      <section className="py-8 px-4 container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-2xl text-foreground">Shop by Category</h2>
          <Link href="/categories">
            <span className="text-primary hover:text-primary/80 font-medium cursor-pointer inline-flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </span>
          </Link>
        </div>
        {loadingCategories ? (
          <LoadingSpinner />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories?.slice(0, 4).map((category) => (
              <Link key={category.id} href={`/category/${category.slug}`}>
                <div className="group cursor-pointer flex flex-col items-center text-center">
                  <div className="w-full aspect-square rounded-full overflow-hidden mb-4 bg-secondary border border-border/50 group-hover:border-primary transition-colors p-2">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <img
                        src={category.image || 'https://placehold.co/400x400/D4B483/FAF6F0?text=Cat'}
                        alt={category.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  </div>
                  <h3 className="font-serif text-base text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="py-12 px-4 container mx-auto bg-secondary/30">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-4">MimiiHub Favorites</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
        </div>
        
        {loadingFeatured ? (
          <LoadingSpinner />
        ) : featuredProducts && featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No featured products right now.</p>
        )}
      </section>

      {/* New Arrivals */}
      <section className="py-12 px-4 container mx-auto">
        <div className="text-center mb-10">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-4">New Arrivals</h2>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
        </div>
        
        {loadingNew ? (
          <LoadingSpinner />
        ) : newArrivals && newArrivals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No new arrivals right now.</p>
        )}
      </section>

      {/* Trust Bar */}
      {trustItems.length > 0 && (
        <section className="py-12 border-t border-border mt-auto">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4 text-center">
              {trustItems.map((item) => {
                // Determine icon component based on string mapping (simple for now)
                let Icon = ShieldCheck;
                if (item.icon === 'truck') Icon = Truck;
                else if (item.icon === 'clock') Icon = Clock;
                else if (item.icon === 'credit-card') Icon = CreditCard;

                return (
                  <div key={item.id} className="flex flex-col items-center">
                    <Icon className="w-8 h-8 text-primary mb-3" strokeWidth={1.5} />
                    <h4 className="font-serif font-semibold text-base mb-1">{item.title}</h4>
                    <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
