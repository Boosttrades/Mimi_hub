import { Layout } from '@/components/layout/Layout';
import { BackButton } from '@/components/layout/BackButton';
import { CategoryCard } from '@/components/product/CategoryCard';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useListCategories } from '@workspace/api-client-react';

export function Categories() {
  const {
    data: categories = [],
    isLoading,
    isError,
    refetch,
  } = useListCategories();

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
          {isLoading ? (
            <div className="col-span-full"><LoadingSpinner size="lg" /></div>
          ) : isError ? (
            <div className="col-span-full">
              <ErrorState
                title="Categories could not be loaded"
                message="Please check your connection and try again."
                onRetry={() => { void refetch(); }}
              />
            </div>
          ) : categories.length > 0 ? (
            categories.map((category) => <CategoryCard key={category.id} category={category} />)
          ) : (
            <p className="col-span-full py-16 text-center text-muted-foreground">No categories are available right now.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
