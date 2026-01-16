'use client';

import { useState, useEffect } from 'react';

export function MobileScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="md:hidden fixed right-0 top-0 bottom-0 w-1 z-50 pointer-events-none">
      {/* Background track */}
      <div className="absolute inset-0 bg-gray-200/30" />
      {/* Progress bar */}
      <div
        className="absolute top-0 left-0 right-0 bg-logo-green/70 transition-all duration-100"
        style={{ height: `${scrollProgress}%` }}
      />
    </div>
  );
}
