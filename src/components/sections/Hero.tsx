'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Users, Dog, Star, Mountain, TreePine, Flame } from 'lucide-react';

export function Hero() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/media?category=hero&type=video')
      .then((res) => res.json())
      .then((data) => {
        if (data.media?.[0]) {
          setVideoUrl(data.media[0].url);
        }
      })
      .catch(() => {
        // Use fallback
      });
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToGalleryCategory = (category: string) => {
    const galerie = document.querySelector('#galerie');
    if (galerie) {
      galerie.scrollIntoView({ behavior: 'smooth' });
      // Wait for scroll, then click the category button
      setTimeout(() => {
        const categoryButton = document.querySelector(`#galerie button[data-category="${category}"]`) as HTMLButtonElement;
        if (categoryButton) {
          categoryButton.click();
        }
      }, 500);
    }
  };

  const features = [
    { icon: Mountain, label: '1.700 m Höhe', onClick: () => scrollToSection('#heidiAlm') },
    { icon: TreePine, label: 'Alleinlage', onClick: () => scrollToGalleryCategory('aussen') },
    { icon: Flame, label: 'Sauna & Wellness', onClick: () => scrollToGalleryCategory('bad') },
    { icon: Users, label: 'Bis zu 5 Personen', onClick: () => scrollToGalleryCategory('schlafen') },
    { icon: Dog, label: 'Hundefreundlich', onClick: () => scrollToSection('#dog-trips') },
    { icon: Star, label: '5-Sterne Bewertungen', onClick: () => scrollToSection('#reviews') },
  ];

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Video/Image Background */}
      <div className="absolute inset-0 bg-gray-900">
        {videoUrl ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-green-900 via-gray-800 to-gray-900" />
        )}
      </div>

      {/* Overlay - leichter Gradient für Lesbarkeit */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* Content Container - Full height with flex column */}
      <div className="relative z-10 flex flex-col h-full text-white text-center px-4">

        {/* Upper Third - Brittany Signature Headlines */}
        <div className="flex-1 flex items-center justify-center pt-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-6xl -mt-8"
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-2 text-white drop-shadow-lg"
              style={{ fontFamily: 'RetroSignature, cursive' }}
            >
              Herzlich Willkommen in der Sechszirbenhütte!
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl text-white drop-shadow-lg"
              style={{ fontFamily: 'RetroSignature, cursive' }}
            >
              Ihr Hüttenurlaub am Falkert
            </motion.p>
          </motion.div>
        </div>

        {/* Middle Third - Empty space */}
        <div className="flex-1" />

        {/* Lower Third - Text and Icons */}
        <div className="flex-1 flex flex-col items-center justify-center pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-5xl"
          >
            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-lg md:text-2xl lg:text-3xl mb-4 text-white drop-shadow-md whitespace-nowrap"
            >
              Premium-Hüttenurlaub auf 1.700 m in den Kärntner Nockbergen
            </motion.p>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-base md:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto drop-shadow-sm mb-8"
            >
              Erleben Sie unvergessliche Urlaubstage in unserer über 250 Jahre alten Berghütte – liebevoll restauriert, mit Sauna-Anbau und in absoluter Alleinlage inmitten von Zirben- und Lärchenwäldern am Falkert.
            </motion.p>

            {/* 6 Icons Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6"
            >
              {features.map((feature, index) => (
                <button
                  key={index}
                  onClick={feature.onClick}
                  className="flex flex-col items-center group cursor-pointer hover:scale-105 transition-transform"
                >
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 group-hover:bg-white/30 transition-colors">
                    <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-white drop-shadow-sm">
                    {feature.label}
                  </span>
                </button>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={() => scrollToSection('#reviews')}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown size={40} />
      </motion.button>
    </section>
  );
}
