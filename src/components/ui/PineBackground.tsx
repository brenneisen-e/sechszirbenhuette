'use client';

import { useEffect, useState } from 'react';

// Zirben tree background decoration - only visible after hero
export function PineBackground() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('#hero');
      if (heroSection) {
        const heroBottom = heroSection.getBoundingClientRect().bottom;
        setIsVisible(heroBottom < window.innerHeight * 0.5);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700"
      style={{
        backgroundImage: 'url(/images/Gemini_Generated_Image_zd78wazd78wazd78.png)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
        backgroundSize: '50%',
        opacity: 0.15,
      }}
    />
  );
}
