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

// Determine TARGET video quality based on network speed (for progressive upgrade)
// We always START with 360p for fast initial load, then upgrade to this target
function getTargetVideoQuality(): '1080p' | '720p' | '480p' | '360p' {
  if (typeof window === 'undefined') return '720p';

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    // Use saveData preference - stay at 360p
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
          // For 4G, check downlink for 1080p capability
          if (connection.downlink !== undefined && connection.downlink >= 10) {
            return '1080p';
          }
          return '720p';
      }
    }

    // Use downlink speed (Mbps)
    if (connection.downlink !== undefined) {
      if (connection.downlink < 1) return '360p';
      if (connection.downlink < 5) return '480p';
      if (connection.downlink >= 10) return '1080p';
      return '720p';
    }
  }

  // Default to HD quality for upgrade target
  return '720p';
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
  const [currentQuality, setCurrentQuality] = useState<'1080p' | '720p' | '480p' | '360p' | null>(null);
  const [targetQuality, setTargetQuality] = useState<'1080p' | '720p' | '480p' | '360p'>('720p');
  const [upgradeUrl, setUpgradeUrl] = useState<string | null>(null);
  const [isUpgradeReady, setIsUpgradeReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const upgradeVideoRef = useRef<HTMLVideoElement>(null);
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

    // Clear old cache to ensure fresh fetch
    sessionStorage.removeItem('hero-video-url');
    sessionStorage.removeItem('hero-video-quality');

    // Determine target quality based on network speed (for later upgrade)
    const target = getTargetVideoQuality();
    setTargetQuality(target);
    console.log('[Hero] Target quality:', target);

    // ALWAYS start with 360p for fast initial load, then upgrade
    // Fallback order: 360p first, then higher qualities if 360p not available
    const categoriesToTry = ['hero-360p', 'hero-480p', 'hero-720p', 'hero-1080p', 'hero'];
    console.log('[Hero] Starting with 360p for fast load, will upgrade to', target);

    async function findVideo() {
      for (const category of categoriesToTry) {
        console.log(`[Hero] Trying category: ${category}`);
        try {
          const res = await fetch(`/api/media?category=${category}&type=video`);
          const data = await res.json() as { media?: { url: string }[] };
          console.log(`[Hero] ${category} response:`, data);

          if (data.media?.[0]) {
            const url = `/api/video-stream?category=${category}`;
            console.log('[Hero] Found video, using URL:', url);
            setVideoUrl(url);
            // Extract quality from category (e.g., 'hero-720p' -> '720p')
            const qualityMatch = category.match(/hero-(\d+p)/);
            if (qualityMatch) {
              setCurrentQuality(qualityMatch[1] as '1080p' | '720p' | '480p' | '360p');
            }
            return;
          }
        } catch (err) {
          console.error(`[Hero] Error fetching ${category}:`, err);
        }
      }
      console.log('[Hero] No video found in any category');
    }

    findVideo();
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

  // Progressive quality upgrade: After initial video loads, upgrade to target quality
  useEffect(() => {
    if (!isMounted || !videoLoaded || !currentQuality) return;

    // Already at target quality or higher - no upgrade needed
    const qualityRank = { '360p': 1, '480p': 2, '720p': 3, '1080p': 4 };
    if (qualityRank[currentQuality] >= qualityRank[targetQuality]) {
      console.log(`[Hero] Already at target quality (${currentQuality}), no upgrade needed`);
      return;
    }

    console.log(`[Hero] Upgrading from ${currentQuality} to target ${targetQuality}...`);

    // Try to load target quality, with fallbacks to lower qualities
    const tryUpgrade = async () => {
      // Build upgrade path from target down to current+1
      const upgradeQualities: ('1080p' | '720p' | '480p')[] = [];
      if (targetQuality === '1080p') upgradeQualities.push('1080p');
      if (targetQuality === '1080p' || targetQuality === '720p') upgradeQualities.push('720p');
      if (targetQuality === '1080p' || targetQuality === '720p' || targetQuality === '480p') upgradeQualities.push('480p');

      // Filter out qualities we already have or lower
      const qualitiesToTry = upgradeQualities.filter(q => qualityRank[q] > qualityRank[currentQuality]);

      for (const upgradeQuality of qualitiesToTry) {
        const upgradeCategory = `hero-${upgradeQuality}`;
        try {
          const res = await fetch(`/api/media?category=${upgradeCategory}&type=video`);
          const data = await res.json() as { media?: { url: string }[] };

          if (data.media?.[0]) {
            console.log(`[Hero] Found ${upgradeQuality}, preloading...`);
            setUpgradeUrl(`/api/video-stream?category=${upgradeCategory}`);
            return; // Stop after finding first available upgrade
          }
        } catch (err) {
          console.error(`[Hero] Error checking ${upgradeQuality}:`, err);
        }
      }
      console.log(`[Hero] No higher quality available for upgrade`);
    };

    tryUpgrade();
  }, [isMounted, videoLoaded, currentQuality, targetQuality]);

  // Handle upgrade video ready - swap to higher quality
  const handleUpgradeCanPlay = () => {
    if (!upgradeVideoRef.current || !videoRef.current || isUpgradeReady) return;

    // Determine the upgrade quality from the URL
    const upgradeQualityMatch = upgradeUrl?.match(/hero-(\d+p)/);
    const newQuality = (upgradeQualityMatch?.[1] as '1080p' | '720p') || '720p';

    console.log(`[Hero] Higher quality video (${newQuality}) ready, preparing swap...`);

    // Get current playback position from the old video
    const currentTime = videoRef.current.currentTime;

    // Set the upgrade video to the same position
    upgradeVideoRef.current.currentTime = currentTime;

    // Start playing the upgrade video (still invisible due to opacity 0)
    upgradeVideoRef.current.play().then(() => {
      // Now trigger the cross-fade
      setIsUpgradeReady(true);
      setCurrentQuality(newQuality);

      // After the fade transition (300ms), pause the old video to save resources
      setTimeout(() => {
        videoRef.current?.pause();
        console.log(`[Hero] Successfully upgraded to ${newQuality}`);
      }, 350);
    }).catch(err => {
      console.error('[Hero] Failed to play upgrade video:', err);
    });
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
            className={`h-full w-full object-cover transition-opacity duration-300 ${isUpgradeReady ? 'opacity-0' : 'opacity-100'}`}
            onCanPlay={handleVideoCanPlay}
            onError={handleVideoError}
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}

        {/* Hidden upgrade video - preloads higher quality in background */}
        {isMounted && upgradeUrl && !videoError && (
          <video
            ref={upgradeVideoRef}
            muted
            loop
            playsInline
            disablePictureInPicture
            preload="auto"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isUpgradeReady ? 'opacity-100' : 'opacity-0'}`}
            onCanPlay={handleUpgradeCanPlay}
          >
            <source src={upgradeUrl} type="video/mp4" />
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: videoLoaded ? 0 : 1.0 }}
              className="grid grid-cols-2 min-[400px]:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 md:gap-6 px-2"
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
                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full backdrop-blur-sm flex items-center justify-center mb-1.5 sm:mb-2"
                    style={{ backgroundColor: LOGO_GREEN }}
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-white" />
                  </motion.div>
                  <span className="text-[clamp(0.625rem,1.5vw,0.875rem)] font-semibold text-white drop-shadow-sm leading-tight">
                    {feature.label}
                  </span>
                </motion.button>
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
