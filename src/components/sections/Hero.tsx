'use client';

import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useContentTexts } from '@/contexts/ContentTextsContext';
import { motion } from 'framer-motion';
import { ChevronDown, Users, Dog, Star, Mountain, TreePine, Flame } from 'lucide-react';
import Image from 'next/image';

// Logo green color (matches the logo)
const LOGO_GREEN = '#1e5631';

export function Hero() {
  const { t } = useLanguage();
  const { getText, getTextStyle } = useContentTexts();

  const [isMounted, setIsMounted] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  // Mark as mounted on client to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use preloaded URLs from LoadingScreen, or fetch as fallback
  useEffect(() => {
    if (!isMounted) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;

    // Check for preloaded thumbnail from LoadingScreen
    if (win.__heroThumbnailUrl) {
      setThumbnailUrl(win.__heroThumbnailUrl as string);
    } else {
      fetch('/api/media?category=hero-thumbnail&type=image', { cache: 'no-store' })
        .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
        .then((data) => {
          if (data.media?.[0]?.url) setThumbnailUrl(data.media[0].url);
        })
        .catch(() => {});
    }

    // Check for preloaded video URL from LoadingScreen
    if (win.__heroVideoUrl) {
      setVideoUrl(win.__heroVideoUrl as string);
    } else {
      fetch('/api/media?category=hero&type=video', { cache: 'no-store' })
        .then((res) => res.json() as Promise<{ media?: { url: string }[] }>)
        .then((data) => {
          if (data.media?.[0]?.url) {
            setVideoUrl(data.media[0].url);
          }
        })
        .catch(() => {
          setVideoError(true);
        });
    }
  }, [isMounted]);

  // Ensure video element is muted before anything else
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.defaultMuted = true;
    }
  }, []);

  // Set up HLS.js or native HLS playback
  useEffect(() => {
    if (!videoRef.current || !videoUrl) return;

    const video = videoRef.current;
    let cancelled = false;

    // Force muted state before any source attachment
    video.muted = true;
    video.volume = 0;
    video.defaultMuted = true;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const tryPlay = () => {
      if (cancelled) return;
      video.muted = true;
      video.volume = 0;
      const p = video.play();
      if (p) {
        p.then(() => {
          if (!cancelled) {
            setVideoLoaded(true);
            setTimeout(() => setShowPlaceholder(false), 300);
          }
        }).catch(() => {
          // Autoplay still blocked — start on any user interaction
          const playOnInteraction = () => {
            video.muted = true;
            video.play().then(() => {
              setVideoLoaded(true);
              setTimeout(() => setShowPlaceholder(false), 300);
            }).catch(() => {});
          };
          document.addEventListener('click', playOnInteraction, { once: true });
          document.addEventListener('touchstart', playOnInteraction, { once: true });
          document.addEventListener('scroll', playOnInteraction, { once: true });
        });
      }
    };

    const initHls = async () => {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isSafari = !isIOS && /^((?!chrome|android).)*safari/i.test(ua);
      const useNativeHls = (isIOS || isSafari) && !!video.canPlayType('application/vnd.apple.mpegurl');

      if (useNativeHls) {
        video.src = videoUrl;
        tryPlay();
        return;
      }

      try {
        const Hls = (await import('hls.js')).default;
        if (!Hls.isSupported() || cancelled) {
          if (!cancelled) video.src = videoUrl;
          return;
        }

        const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
        const hls = new Hls({
          enableWorker: false,
          maxBufferLength: isMobile ? 15 : 30,
          maxMaxBufferLength: isMobile ? 30 : 60,
          startLevel: isMobile ? 0 : -1,
        });

        hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; type: string; details: string }) => {
          if (data.fatal) {
            if (data.type === 'networkError') {
              hls.startLoad();
            } else {
              hls.destroy();
              hlsRef.current = null;
              if (!cancelled) setVideoError(true);
            }
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          tryPlay();
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } catch {
        if (!cancelled) video.src = videoUrl;
      }
    };

    initHls();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // Also try play when video reports it can play (belt and suspenders)
  const handleVideoCanPlay = () => {
    if (videoRef.current && !videoLoaded) {
      videoRef.current.muted = true;
      videoRef.current.volume = 0;
      videoRef.current.play().then(() => {
        setVideoLoaded(true);
        setTimeout(() => setShowPlaceholder(false), 300);
      }).catch(() => {});
    }
  };

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
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-500 ${videoLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            style={{ zIndex: videoLoaded ? -1 : 10 }}
          >
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

        {/* Video layer - always in DOM with autoPlay muted for browser autoplay policy */}
        <video
          ref={videoRef}
          id="hero-video"
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          preload="auto"
          className={`h-full w-full object-cover ${videoError ? 'hidden' : ''}`}
          onCanPlay={handleVideoCanPlay}
          onError={handleVideoError}
        />
      </div>

      {/* Overlay - leichter Gradient für Lesbarkeit */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />

      {/* Content Container - Full height with flex column */}
      <div className="relative z-10 flex flex-col h-full text-white px-4 sm:px-6 md:px-10 lg:px-16 pt-5">

        {/* Upper area - Left-aligned headline with green accent */}
        <div className="flex-1 flex items-end md:items-center pb-4 md:pb-0 pt-20 sm:pt-24 md:pt-8">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-stretch gap-4 md:gap-6 max-w-3xl"
          >
            {/* Green accent line */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-1 md:w-1.5 rounded-full origin-top"
              style={{ backgroundColor: LOGO_GREEN }}
            />

            <div>
              <motion.p
                data-text-key="hero_title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-[clamp(2.2rem,6vw,4.5rem)] leading-[1.1] text-white drop-shadow-lg text-left"
                style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('hero_title') }}
              >
                {getText('hero_title')}
              </motion.p>
              <motion.p
                data-text-key="hero_subtitle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="text-[clamp(1.5rem,4vw,2.5rem)] leading-snug mt-1 md:mt-2 text-white/90 drop-shadow-md text-left"
                style={{ fontFamily: 'FeelingPassionate, cursive', ...getTextStyle('hero_subtitle') }}
              >
                {getText('hero_subtitle')}
              </motion.p>
              <motion.p
                data-text-key="hero_description"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="text-[clamp(0.8rem,1.8vw,1.1rem)] leading-relaxed text-white/80 drop-shadow-sm mt-3 md:mt-4 max-w-xl text-left"
                style={getTextStyle('hero_description')}
              >
                {getText('hero_description')}
              </motion.p>
            </div>
          </motion.div>
        </div>

        {/* Lower area - Feature icons */}
        <div className="pb-20 sm:pb-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: videoLoaded ? 0 : 1.0 }}
            className="grid grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 md:gap-6 max-w-4xl"
          >
            {features.map((feature, index) => (
              <motion.button
                key={index}
                onClick={feature.onClick}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: videoLoaded ? 0.4 : 0.8,
                  delay: videoLoaded ? index * 0.05 : 1.2 + index * 0.15,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center group cursor-pointer"
              >
                <motion.div
                  className="w-11 h-11 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-full backdrop-blur-sm flex items-center justify-center mb-1.5 sm:mb-2"
                  style={{ backgroundColor: LOGO_GREEN }}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <feature.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
                </motion.div>
                <span className="text-[clamp(0.6rem,1.4vw,0.8rem)] font-semibold text-white drop-shadow-sm leading-tight">
                  {feature.label}
                </span>
              </motion.button>
            ))}
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
