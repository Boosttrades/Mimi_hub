import { useRoute } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { BackButton } from '@/components/layout/BackButton';
import { ProductCard } from '@/components/product/ProductCard';
import { LoadingPage, LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { useListCategories, useListProducts } from '@workspace/api-client-react';
import { PackageSearch } from 'lucide-react';
import { useMemo } from 'react';

export function Category() {
  const [matchCategory, paramsCategory] = useRoute('/category/:slug');
  const [matchSub, paramsSub] = useRoute('/category/:slug/:subSlug');

  const slug = paramsSub?.slug || paramsCategory?.slug;
  const subSlug = paramsSub?.subSlug;

  const { data: categories, isLoading: loadingCats, isError: errorCats } = useListCategories();

  const category = useMemo(() => {
    return categories?.find(c => c.slug === slug);
  }, [categories, slug]);

  const subcategory = useMemo(() => {
    if (!category || !subSlug) return null;
    return category.subcategories?.find(s => s.slug === subSlug);
  }, [category, subSlug]);

  const { data: products, isLoading: loadingProducts } = useListProducts(
    { categoryId: category?.id, subcategoryId: subcategory?.id },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { query: { enabled: !!category?.id } as any }
  );

  if (loadingCats) return <LoadingPage />;
  if (errorCats || (!loadingCats && !category)) {
    return (
      <Layout>
        <ErrorState title="Category Not Found" message="The category you're looking for doesn't exist." />
      </Layout>
    );
  }

  const title = subcategory ? subcategory.name : category?.name;
  const description = category?.description || `Explore our collection of ${title?.toLowerCase()}`;
  const image = category?.image || 'https://placehold.co/1200x400/D4B483/FAF6F0?text=Category';

  return (
    <Layout>
      {/* Category Banner */}
      <div className="relative h-[30vh] min-h-[250px] w-full bg-secondary overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
          <BackButton
            fallback="/categories"
            className="absolute left-4 top-4 border-white/50 bg-black/20 text-white hover:bg-white hover:text-foreground"
          />
          <div className="text-center text-white max-w-2xl">
            <h1 className="font-serif text-3xl md:text-4xl mb-4">{title}</h1>
            <p className="text-white/90 text-xs md:text-sm">{description}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="font-serif text-xl text-foreground">
            All {title} <span className="text-muted-foreground text-base ml-2">({products?.length || 0})</span>
          </h2>
          
          {/* Subcategory Pills */}
          {!subcategory && category?.subcategories && category.subcategories.length > 0 && (
            <div className="flex overflow-x-auto pb-2 w-full md:w-auto hide-scrollbar gap-2">
              {category.subcategories.map(sub => (
                <a
                  key={sub.id}
                  href={`/category/${category.slug}/${sub.slug}`}
                  className="px-4 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium whitespace-nowrap hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {sub.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {loadingProducts ? (
          <LoadingSpinner size="lg" />
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={<PackageSearch className="h-12 w-12" />} 
            title="No products found" 
            description={`We don't have any products in ${title} yet. Check back later!`} 
          />
        )}
      </div>
    </Layout>
  );
}
