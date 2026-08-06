import { Layout } from '@/components/layout/Layout';
import { BackButton } from '@/components/layout/BackButton';
import { CategoryCard } from '@/components/product/CategoryCard';
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
        <div className="fixed left-4 top-20 z-40">
          <BackButton className="bg-background/95 shadow-md backdrop-blur" />
        </div>
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl text-foreground mb-4">All Categories</h1>
          <div className="w-16 h-0.5 bg-primary mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {categories?.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </Layout>
  );
}
