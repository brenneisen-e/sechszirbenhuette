'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import { ChevronDown, Users, Dog, Star, Mountain, TreePine, Flame } from 'lucide-react';

// Logo green color (matches the logo)
const LOGO_GREEN = '#1e5631';

// Extend Navigator interface for connection API
interface NetworkInformation {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

// Determine video quality based on network speed
function getVideoQuality(): '720p' | '480p' | '360p' {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    // Use saveData preference
    if (connection.saveData) {
      return '360p';
    }

    // Use effective connection type
    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          return '360p';
        case '3g':
          return '480p';
        case '4g':
        default:
          return '720p';
      }
    }

    // Use downlink speed (Mbps)
    if (connection.downlink !== undefined) {
      if (connection.downlink < 1) return '360p';
      if (connection.downlink < 5) return '480p';
      return '720p';
    }
  }

  // Default to medium quality if we can't detect
  return '480p';
}

export function Hero() {
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  // Fetch video URL with adaptive quality
  useEffect(() => {
    // Check sessionStorage cache first to reduce API calls
    const cachedUrl = sessionStorage.getItem('hero-video-url');
    const cachedQuality = sessionStorage.getItem('hero-video-quality');
    const currentQuality = getVideoQuality();

    // Use cache if quality matches
    if (cachedUrl && cachedQuality === currentQuality) {
      setVideoUrl(cachedUrl);
      return;
    }

    // Check if multi-quality videos exist, otherwise fall back to standard hero
    const quality = currentQuality;

    // Try quality-specific video first (e.g., hero-720p)
    fetch(`/api/media?category=hero-${quality}&type=video`)
      .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
      .then((data) => {
        if (data.media?.[0]) {
          // Use streaming proxy with quality parameter
          const url = `/api/video-stream?category=hero-${quality}`;
          setVideoUrl(url);
          sessionStorage.setItem('hero-video-url', url);
          sessionStorage.setItem('hero-video-quality', quality);
        } else {
          // Fall back to standard hero video (legacy)
          return fetch('/api/media?category=hero&type=video')
            .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
            .then((data) => {
              if (data.media?.[0]) {
                const url = '/api/video-stream?category=hero';
                setVideoUrl(url);
                sessionStorage.setItem('hero-video-url', url);
                sessionStorage.setItem('hero-video-quality', 'default');
              }
            });
        }
      })
      .catch(() => {
        // Use fallback
        setVideoError(true);
      });
  }, []);

  // Handle video error - show fallback gradient
  const handleVideoError = () => {
    setVideoError(true);
  };

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
    { icon: Mountain, label: t.features.altitude.title, onClick: () => scrollToSection('#heidiAlm') },
    { icon: TreePine, label: t.features.secluded.title, onClick: () => scrollToGalleryCategory('aussen') },
    { icon: Flame, label: t.features.sauna.title, onClick: () => scrollToGalleryCategory('bad') },
    { icon: Users, label: t.features.guests.title, onClick: () => scrollToGalleryCategory('schlafen') },
    { icon: Dog, label: t.features.dogs.title, onClick: () => scrollToSection('#dog-trips') },
    { icon: Star, label: t.features.rating.title, onClick: () => scrollToSection('#bewertungen') },
  ];

  return (
    <section id="hero" className="relative h-screen w-full overflow-hidden">
      {/* Video/Image Background */}
      <div className="absolute inset-0 bg-gray-900">
        {videoUrl && !videoError ? (
          <video
            id="hero-video"
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="auto"
            className="h-full w-full object-cover"
            onError={handleVideoError}
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
      <div className="relative z-10 flex flex-col h-full text-white text-center px-3 sm:px-4 md:px-6 lg:px-8 pt-5">

        {/* Upper Third - Headline and Subtitle */}
        <div className="flex-1 flex items-center justify-center pt-16 sm:pt-20 md:pt-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full"
          >
            <motion.p
              data-text-key="hero_title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-[clamp(2.5rem,7vw,5rem)] leading-tight text-white drop-shadow-lg px-2"
              style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('hero_title') }}
            >
              {getText('hero_title')}
            </motion.p>
            <motion.p
              data-text-key="hero_subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="text-[clamp(1.75rem,5vw,3rem)] leading-snug mt-2 text-white drop-shadow-md px-2"
              style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('hero_subtitle') }}
            >
              {getText('hero_subtitle')}
            </motion.p>
          </motion.div>
        </div>

        {/* Middle Third - Flexible space */}
        <div className="flex-[0.5] sm:flex-1" />

        {/* Lower Third - Text and Icons */}
        <div className="flex-1 flex flex-col items-center justify-center pb-20 sm:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-5xl"
          >
            {/* Description */}
            <motion.p
              data-text-key="hero_description"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="text-[clamp(0.75rem,2vw,1.25rem)] leading-relaxed text-white/90 max-w-3xl mx-auto drop-shadow-sm mb-6 sm:mb-8 px-2"
              style={getTextStyle('hero_description')}
            >
              {getText('hero_description')}
            </motion.p>

            {/* 6 Icons Row - 2 cols on xs, 3 on sm, 6 on md+ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="grid grid-cols-2 min-[400px]:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 md:gap-6 px-2"
            >
              {features.map((feature, index) => (
                <button
                  key={index}
                  onClick={feature.onClick}
                  className="flex flex-col items-center group cursor-pointer hover:scale-105 transition-transform"
                >
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full backdrop-blur-sm flex items-center justify-center mb-1.5 sm:mb-2 transition-all group-hover:scale-110"
                    style={{ backgroundColor: LOGO_GREEN }}
                  >
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </div>
                  <span className="text-[clamp(0.625rem,1.5vw,0.875rem)] font-semibold text-white drop-shadow-sm leading-tight">
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
        onClick={() => scrollToSection('#bewertungen')}
        className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 text-white animate-bounce"
        aria-label="Scroll down"
      >
        <ChevronDown className="w-8 h-8 sm:w-10 sm:h-10" />
      </motion.button>
    </section>
  );
}
