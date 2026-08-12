import { Link } from 'wouter';
import { ChevronRight } from 'lucide-react';
import { categoryImages } from '@/data/categoryImages';

interface CategoryCardCategory {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  description?: string | null;
  subcategories?: Array<{ id: number; name: string; slug?: string }>;
}

interface CategoryCardProps {
  category: CategoryCardCategory;
  className?: string;
}

export function CategoryCard({ category, className = '' }: CategoryCardProps) {
  const subcategories = category.subcategories ?? [];
  const categoryImage =
    category.image && !category.image.includes('placehold.co')
      ? category.image
      : categoryImages[category.slug];

  return (
    <Link href={`/category/${category.slug}`} className={`block ${className}`}>
      <article className="relative aspect-[5/3] overflow-hidden rounded-2xl bg-secondary shadow-sm group">
        <img
          src={
            categoryImage ||
            'https://placehold.co/800x600/D4B483/FAF6F0?text=Category'
          }
          alt={category.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-white">
          <h3 className="font-serif text-2xl md:text-3xl">{category.name}</h3>
          {category.description && (
            <p className="mt-1 line-clamp-2 text-xs text-white/80">{category.description}</p>
          )}
          {subcategories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subcategories.map((subcategory) => (
                <span
                  key={subcategory.id}
                  className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] backdrop-blur-sm"
                >
                  {subcategory.name}
                </span>
              ))}
            </div>
          )}
          <span className="mt-3 inline-flex items-center text-xs font-semibold uppercase tracking-wider transition-colors group-hover:text-primary">
            Shop now <ChevronRight className="ml-1 h-4 w-4" />
          </span>
        </div>
      </article>
    </Link>
  );
}