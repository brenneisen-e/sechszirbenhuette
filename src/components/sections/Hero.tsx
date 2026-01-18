'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import { ChevronDown, Users, Dog, Star, Mountain, TreePine, Flame } from 'lucide-react';
import Image from 'next/image';

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

// Determine video quality based on network speed (only call on client)
function getVideoQuality(): '720p' | '480p' | '360p' {
  if (typeof window === 'undefined') return '480p';

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

  // Use refs for hydration-safe state initialization
  const [isMounted, setIsMounted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const placeholderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mark as mounted on client to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch thumbnail URL (for placeholder while video loads)
  useEffect(() => {
    if (!isMounted) return;

    fetch('/api/media?category=hero-thumbnail&type=image')
      .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
      .then((data) => {
        if (data.media?.[0]?.url) {
          setThumbnailUrl(data.media[0].url);
        }
      })
      .catch(() => {
        // Thumbnail fetch failed, will use gradient fallback
      });
  }, [isMounted]);

  // Fetch video URL with adaptive quality
  useEffect(() => {
    if (!isMounted) return;

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
  }, [isMounted]);

  // Set up 5-second timeout to show placeholder if video hasn't loaded
  useEffect(() => {
    if (!isMounted || !videoUrl) return;

    // Start 5-second timer - if video isn't loaded by then, keep showing placeholder
    placeholderTimeoutRef.current = setTimeout(() => {
      if (!videoLoaded) {
        // Video still loading after 5 seconds - placeholder is already showing
        // The video will continue to load in the background
      }
    }, 5000);

    return () => {
      if (placeholderTimeoutRef.current) {
        clearTimeout(placeholderTimeoutRef.current);
      }
    };
  }, [isMounted, videoUrl, videoLoaded]);

  // Handle video ready to play
  const handleVideoCanPlay = () => {
    if (videoRef.current && !videoLoaded) {
      // Reset to beginning before playing
      videoRef.current.currentTime = 0;
      // Try to play the video
      videoRef.current.play().then(() => {
        setVideoLoaded(true);
        // Fade out placeholder after video starts playing
        setTimeout(() => setShowPlaceholder(false), 300);
      }).catch(() => {
        // Autoplay blocked - keep showing placeholder
        setVideoLoaded(true);
        setTimeout(() => setShowPlaceholder(false), 300);
      });
    }
  };

  // Fallback: Try to play after 10 seconds even if canplay hasn't fired
  useEffect(() => {
    if (!isMounted || !videoUrl || videoLoaded) return;

    const fallbackTimer = setTimeout(() => {
      if (videoRef.current && !videoLoaded) {
        // Check if video has any data loaded
        if (videoRef.current.readyState >= 2) { // HAVE_CURRENT_DATA or better
          videoRef.current.currentTime = 0;
          videoRef.current.play().then(() => {
            setVideoLoaded(true);
            setTimeout(() => setShowPlaceholder(false), 300);
          }).catch(() => {
            // Failed to play - keep thumbnail
          });
        }
      }
    }, 10000);

    return () => clearTimeout(fallbackTimer);
  }, [isMounted, videoUrl, videoLoaded]);

  // Handle video error - show fallback gradient
  const handleVideoError = () => {
    setVideoError(true);
    setShowPlaceholder(true);
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
        {/* Placeholder layer - shows thumbnail or gradient while video loads */}
        {showPlaceholder && (
          <div className={`absolute inset-0 z-10 transition-opacity duration-500 ${videoLoaded ? 'opacity-0' : 'opacity-100'}`}>
            {thumbnailUrl && !videoError ? (
              <Image
                src={thumbnailUrl}
                alt="Sechszirbenhütte"
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-green-900 via-gray-800 to-gray-900" />
            )}
          </div>
        )}

        {/* Video layer - renders behind placeholder, fades in when ready */}
        {isMounted && videoUrl && !videoError && (
          <video
            ref={videoRef}
            id="hero-video"
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="auto"
            className="h-full w-full object-cover"
            onCanPlay={handleVideoCanPlay}
            onError={handleVideoError}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}

        {/* Fallback gradient when no video or thumbnail */}
        {!isMounted && (
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
