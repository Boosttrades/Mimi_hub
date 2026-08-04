import { Link } from 'wouter';
import { Layout } from '@/components/layout/Layout';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { ErrorState } from '@/components/ui/error-state';
import { useListCategories } from '@workspace/api-client-react';

export function Categories() {
  const { data: categories, isLoading, isError } = useListCategories();

  if (isLoading) return <LoadingPage />;
  if (isError) return <Layout><ErrorState onRetry={() => window.location.reload()} /></Layout>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-foreground mb-4">All Categories</h1>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories?.map((category) => (
            <Link key={category.id} href={`/category/${category.slug}`}>
              <div className="group cursor-pointer bg-card rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <div className="aspect-square w-full relative overflow-hidden bg-secondary">
                  <img
                    src={category.image || 'https://placehold.co/600x600/D4B483/FAF6F0?text=Category'}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                </div>
                <div className="p-4 text-center bg-card flex-1 flex flex-col justify-center">
                  <h3 className="font-serif text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
