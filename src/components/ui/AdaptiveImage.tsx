'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface AdaptiveImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  onClick?: () => void;
}

// Determine image quality based on network conditions
function getAdaptiveQuality(): number {
  if (typeof window === 'undefined') return 75;

  // Check Network Information API
  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      saveData?: boolean;
      downlink?: number;
    };
  }).connection;

  if (connection) {
    // If data saver is enabled, use lowest quality
    if (connection.saveData) {
      return 30;
    }

    // Adjust quality based on effective connection type
    switch (connection.effectiveType) {
      case 'slow-2g':
        return 30;
      case '2g':
        return 40;
      case '3g':
        return 60;
      case '4g':
        return 85;
      default:
        // If downlink is available, use it
        if (connection.downlink) {
          if (connection.downlink < 1) return 40;
          if (connection.downlink < 5) return 60;
          if (connection.downlink < 10) return 75;
          return 90;
        }
        return 75;
    }
  }

  return 75; // Default quality
}

export function AdaptiveImage({
  src,
  alt,
  fill,
  width,
  height,
  className = '',
  sizes,
  priority = false,
  onClick,
}: AdaptiveImageProps) {
  // Use consistent initial quality for SSR to prevent hydration mismatch
  const [quality, setQuality] = useState(75);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Mark as mounted and then adjust quality based on network
  useEffect(() => {
    setIsMounted(true);
    // Only update quality after mount to prevent hydration issues
    const adaptiveQuality = getAdaptiveQuality();
    if (adaptiveQuality !== 75) {
      setQuality(adaptiveQuality);
    }

    // Listen for connection changes
    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (event: string, callback: () => void) => void;
        removeEventListener?: (event: string, callback: () => void) => void;
      };
    }).connection;

    if (connection?.addEventListener) {
      const handleChange = () => setQuality(getAdaptiveQuality());
      connection.addEventListener('change', handleChange);
      return () => connection.removeEventListener?.('change', handleChange);
    }
  }, []);

  // Use consistent quality for initial render to prevent hydration mismatch
  // Only use adaptive quality after mount is confirmed and initial render is complete
  const effectiveQuality = isMounted ? quality : 75;

  // Common image props
  const imageProps = {
    src,
    alt,
    quality: effectiveQuality,
    className: `transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`,
    onLoad: () => setIsLoaded(true),
    priority,
    onClick,
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAHxAAAgICAgMBAAAAAAAAAAAAAQIDBAARBSEGEjFB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAZEQADAAMAAAAAAAAAAAAAAAAAAQIDESH/2gAMAwEAAhEDEQA/AGvcTxtNcleJViijVSxLBASQPp0GMT5Hi5oOYsxQ2JY40lZVRHOgJPQH5jBgs+Aqp8H/2Q==',
    sizes: sizes || '100vw',
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
      />
    );
  }

  return (
    <Image
      {...imageProps}
      width={width || 800}
      height={height || 600}
    />
  );
}

// Hook to get current network quality for display purposes
export function useNetworkQuality() {
  const [quality, setQuality] = useState<'slow' | 'medium' | 'fast' | 'unknown'>('unknown');

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        addEventListener?: (event: string, callback: () => void) => void;
        removeEventListener?: (event: string, callback: () => void) => void;
      };
    }).connection;

    const updateQuality = () => {
      if (!connection?.effectiveType) {
        setQuality('unknown');
        return;
      }

      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          setQuality('slow');
          break;
        case '3g':
          setQuality('medium');
          break;
        case '4g':
          setQuality('fast');
          break;
        default:
          setQuality('unknown');
      }
    };

    updateQuality();

    if (connection?.addEventListener) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener?.('change', updateQuality);
    }
  }, []);

  return quality;
}
