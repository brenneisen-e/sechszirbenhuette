'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Users, Dog, Star } from 'lucide-react';

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
        <div className="flex-1 flex items-center justify-center pt-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-5xl"
          >
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-4xl md:text-6xl lg:text-7xl mb-2 text-white drop-shadow-lg"
              style={{ fontFamily: 'BrittanySignature, RetroSignature, cursive' }}
            >
              Herzlich Willkommen in der Sechszirbenhütte!
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-3xl md:text-5xl lg:text-6xl text-white drop-shadow-lg"
              style={{ fontFamily: 'BrittanySignature, RetroSignature, cursive' }}
            >
              Ihr Hüttenurlaub am Falkert
            </motion.p>
          </motion.div>
        </div>

        {/* Middle Third - Empty space */}
        <div className="flex-1" />

        {/* Lower Third - Text and Icons */}
        <div className="flex-1 flex flex-col items-center justify-center pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="max-w-4xl"
          >
            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-xl md:text-2xl lg:text-3xl mb-4 text-white drop-shadow-md"
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

            {/* Icons Row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="flex justify-center gap-8 md:gap-16"
            >
              {/* Bis zu 5 Personen */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                  <Users className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <span className="text-sm md:text-base text-white drop-shadow-sm">Bis zu 5 Personen</span>
              </div>

              {/* Hundefreundlich */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                  <Dog className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <span className="text-sm md:text-base text-white drop-shadow-sm">Hundefreundlich</span>
              </div>

              {/* 5-Sterne Bewertung */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                  <Star className="w-6 h-6 md:w-7 md:h-7 text-white" />
                </div>
                <span className="text-sm md:text-base text-white drop-shadow-sm">5-Sterne Bewertung</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        onClick={() => scrollToSection('#features')}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown size={40} />
      </motion.button>
    </section>
  );
}
