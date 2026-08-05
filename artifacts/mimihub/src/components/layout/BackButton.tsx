import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  fallback?: string;
  className?: string;
}

export function BackButton({ fallback = '/', className = '' }: BackButtonProps) {
  const [, navigate] = useLocation();

  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(fallback);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={goBack}
      className={className}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );
}