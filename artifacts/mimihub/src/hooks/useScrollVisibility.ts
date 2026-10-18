import { useEffect, useState } from 'react';

const SCROLL_THRESHOLD = 8;

export function useScrollVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= SCROLL_THRESHOLD) {
        setIsVisible(true);
      } else if (currentScrollY > previousScrollY + SCROLL_THRESHOLD) {
        setIsVisible(false);
      } else if (currentScrollY < previousScrollY - SCROLL_THRESHOLD) {
        setIsVisible(true);
      }

      previousScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return isVisible;
}