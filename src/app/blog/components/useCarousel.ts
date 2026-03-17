'use client';

import { useState } from 'react';

interface UseCarouselOptions {
  itemCount: number;
  isMobile: boolean;
  itemsPerSlide?: number;
}

interface UseCarouselReturn {
  currentIndex: number;
  maxIndex: number;
  totalDots: number;
  translateValue: number;
  goTo: (index: number) => void;
  prev: () => void;
  next: () => void;
}

export function useCarousel({
  itemCount,
  isMobile,
  itemsPerSlide = 2,
}: UseCarouselOptions): UseCarouselReturn {
  const [currentIndex, setCurrentIndex] = useState(0);

  const maxIndex = isMobile ? itemCount - 1 : Math.ceil(itemCount / itemsPerSlide) - 1;
  const totalDots = isMobile ? itemCount : Math.ceil(itemCount / itemsPerSlide);
  const translateValue = isMobile ? currentIndex * 100 : currentIndex * (100 / itemsPerSlide);

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(maxIndex, index)));
  };

  const prev = () => goTo(currentIndex - 1);
  const next = () => goTo(currentIndex + 1);

  return {
    currentIndex,
    maxIndex,
    totalDots,
    translateValue,
    goTo,
    prev,
    next,
  };
}
