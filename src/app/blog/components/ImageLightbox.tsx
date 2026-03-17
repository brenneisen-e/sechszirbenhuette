'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  category?: string;
}

interface ImageLightboxProps {
  images: MediaItem[];
  selectedIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function ImageLightbox({ images, selectedIndex, onClose, onNavigate }: ImageLightboxProps) {
  const image = images[selectedIndex];
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
      >
        <ChevronLeft size={32} className="rotate-45" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((selectedIndex - 1 + images.length) % images.length);
        }}
        className="absolute left-4 text-white p-2 hover:bg-white/10 rounded-full"
      >
        <ChevronLeft size={40} />
      </button>
      <Image
        src={image.url}
        alt={image.alt_text || 'Umgebung'}
        width={1200}
        height={800}
        className="max-w-full max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate((selectedIndex + 1) % images.length);
        }}
        className="absolute right-4 text-white p-2 hover:bg-white/10 rounded-full"
      >
        <ChevronRight size={40} />
      </button>
    </div>
  );
}
