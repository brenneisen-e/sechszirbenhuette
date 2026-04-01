'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Logo green color
const LOGO_GREEN = '#1e5631';

interface LoadingScreenProps {
  onLoadComplete?: () => void;
  minDisplayTime?: number;
}

export function LoadingScreen({ onLoadComplete, minDisplayTime = 1500 }: LoadingScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Hide the initial CSS-only loader when this component mounts
  useEffect(() => {
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
      initialLoader.classList.add('loaded');
      setTimeout(() => {
        initialLoader.style.display = 'none';
      }, 300);
    }
  }, []);

  // Preload video URL and HLS manifest during loading animation
  useEffect(() => {
    (async () => {
      try {
        // 1. Fetch video URL from API
        const res = await fetch('/api/media?category=hero&type=video', { cache: 'no-store' });
        const data = await res.json() as { media?: { url: string }[] };
        const videoUrl = data.media?.[0]?.url;
        if (!videoUrl) return;

        // Store for Hero component to use immediately
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__heroVideoUrl = videoUrl;

        // 2. Preconnect to Stream domain
        const url = new URL(videoUrl);
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url.origin;
        document.head.appendChild(link);

        // 3. Prefetch the HLS manifest so it's cached by the browser
        fetch(videoUrl, { mode: 'cors' }).catch(() => {});

        // 4. Also preload thumbnail
        const thumbRes = await fetch('/api/media?category=hero-thumbnail&type=image', { cache: 'no-store' });
        const thumbData = await thumbRes.json() as { media?: { url: string }[] };
        const thumbUrl = thumbData.media?.[0]?.url;
        if (thumbUrl) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).__heroThumbnailUrl = thumbUrl;
        }
      } catch {
        // Preload failed, Hero component will fetch as fallback
      }
    })();
  }, []);

  // Minimum display time for the loading screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDisplayTime);
    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Listen for video load event - wait for actual playback to start
  useEffect(() => {
    const checkVideoReady = () => {
      const video = document.querySelector('#hero-video') as HTMLVideoElement;
      if (video) {
        if (!video.paused && video.currentTime > 0) {
          setVideoLoaded(true);
          return true;
        }

        const handlePlaying = () => setVideoLoaded(true);
        const handleTimeUpdate = () => {
          if (video.currentTime > 0.1) {
            setVideoLoaded(true);
            video.removeEventListener('timeupdate', handleTimeUpdate);
          }
        };

        video.addEventListener('playing', handlePlaying, { once: true });
        video.addEventListener('timeupdate', handleTimeUpdate);

        if (video.readyState >= 3 && video.paused) {
          video.play().catch(() => setVideoLoaded(true));
        }

        return () => {
          video.removeEventListener('playing', handlePlaying);
          video.removeEventListener('timeupdate', handleTimeUpdate);
        };
      } else {
        setTimeout(() => setVideoLoaded(true), 2000);
      }
      return false;
    };

    const cleanup = checkVideoReady();
    if (cleanup === true) return;

    const observer = new MutationObserver(() => {
      const video = document.querySelector('#hero-video');
      if (video) {
        checkVideoReady();
        observer.disconnect();
      }
    });
    const mainContent = document.getElementById('__next') || document.body;
    observer.observe(mainContent, { childList: true, subtree: true });

    const fallbackTimer = setTimeout(() => setVideoLoaded(true), 2500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  // Hide loading screen when both conditions are met
  useEffect(() => {
    if (videoLoaded && minTimeElapsed) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
        document.body.classList.remove('is-loading');
        onLoadComplete?.();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [videoLoaded, minTimeElapsed, onLoadComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          {/* Animated Mountain SVG */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <svg
              width="120"
              height="100"
              viewBox="0 0 120 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-lg"
            >
              {/* Background mountain (lighter) */}
              <motion.path
                d="M20 90 L50 40 L80 90 Z"
                fill={LOGO_GREEN}
                fillOpacity="0.3"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />

              {/* Main mountain */}
              <motion.path
                d="M5 90 L45 25 L60 45 L75 25 L115 90 Z"
                fill={LOGO_GREEN}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.6 }}
              />

              {/* Snow cap left */}
              <motion.path
                d="M45 25 L55 40 L35 40 Z"
                fill="white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
              />

              {/* Snow cap right */}
              <motion.path
                d="M75 25 L85 40 L65 40 Z"
                fill="white"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              />

              {/* Sun */}
              <motion.circle
                cx="100"
                cy="20"
                r="10"
                fill="#F59E0B"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.8 }}
              />

              {/* Sun rays */}
              <motion.g
                initial={{ opacity: 0, rotate: 0 }}
                animate={{ opacity: 1, rotate: 360 }}
                transition={{
                  opacity: { duration: 0.4, delay: 0.9 },
                  rotate: { duration: 20, repeat: Infinity, ease: 'linear' }
                }}
                style={{ transformOrigin: '100px 20px' }}
              >
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <line
                    key={i}
                    x1={100 + Math.cos((angle * Math.PI) / 180) * 14}
                    y1={20 + Math.sin((angle * Math.PI) / 180) * 14}
                    x2={100 + Math.cos((angle * Math.PI) / 180) * 18}
                    y2={20 + Math.sin((angle * Math.PI) / 180) * 18}
                    stroke="#F59E0B"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ))}
              </motion.g>
            </svg>

            {/* Animated loading indicator */}
            <motion.div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: LOGO_GREEN }}
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </motion.div>
          </motion.div>

          {/* Loading text */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-gray-600 text-sm tracking-wide"
          >
            Sechszirbenhütte wird geladen...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
