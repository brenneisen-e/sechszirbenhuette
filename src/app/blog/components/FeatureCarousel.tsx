'use client';

import Image from 'next/image';
import { Compass, Mountain, Globe, Calendar, Palmtree, CreditCard, ExternalLink } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarousel } from './useCarousel';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  category?: string;
}

interface Feature {
  title: string;
  description: string;
}

interface FeatureCarouselProps {
  features: Record<string, Feature>;
  images: MediaItem[];
  isMobile: boolean;
  onImageClick: (index: number) => void;
}

const featureIcons = {
  central: Compass,
  nationalpark: Mountain,
  dreilaendereck: Globe,
  activities: Calendar,
  heidiAlm: Palmtree,
  kaerntenCard: CreditCard,
};

const featureKeys = ['central', 'nationalpark', 'dreilaendereck', 'activities', 'heidiAlm', 'kaerntenCard'] as const;

export function FeatureCarousel({ features, images, isMobile, onImageClick }: FeatureCarouselProps) {
  const { currentIndex, maxIndex, totalDots, translateValue, goTo, prev, next } = useCarousel({
    itemCount: featureKeys.length,
    isMobile,
  });

  return (
    <div className="relative">
      {/* Navigation Buttons */}
      <button
        onClick={prev}
        className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition -translate-x-1/2 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={currentIndex === 0}
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={next}
        className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 transition translate-x-1/2 ${currentIndex >= maxIndex ? 'opacity-30 cursor-not-allowed' : ''}`}
        disabled={currentIndex >= maxIndex}
      >
        <ChevronRight size={24} />
      </button>

      {/* Carousel Track */}
      <div className="overflow-hidden mx-4 md:mx-8">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${translateValue}%)` }}
        >
          {featureKeys.map((key, index) => {
            const Icon = featureIcons[key];
            const feature = features[key];
            const featureImage = images[index] || null;

            return (
              <div key={key} className="w-full md:w-1/2 flex-shrink-0 px-2">
                <div className="bg-gray-50 rounded-2xl shadow-md overflow-hidden">
                  {/* Portrait Image or Icon Placeholder */}
                  <div className="relative aspect-[3/4] bg-gray-100">
                    {featureImage ? (
                      <button
                        onClick={() => onImageClick(index)}
                        className="w-full h-full"
                      >
                        <Image
                          src={featureImage.url}
                          alt={featureImage.alt_text || feature.title}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </button>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-logo-green/10 to-logo-green/20">
                        <Icon size={80} className="text-logo-green/40" />
                      </div>
                    )}
                    {/* Number Badge */}
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-logo-green flex items-center justify-center text-white font-bold shadow-lg">
                      {index + 1}
                    </div>
                    {/* Icon Badge */}
                    <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-logo-green shadow-lg">
                      <Icon size={20} />
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="p-5">
                    <h4 className="text-lg font-bold text-logo-green mb-3">{feature.title}</h4>
                    <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
                    {key === 'kaerntenCard' && (
                      <div className="mt-4 flex flex-wrap gap-3">
                        <a
                          href="https://www.kaerntencard.at"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-wood-600 hover:text-logo-green flex items-center gap-1"
                        >
                          Kärnten Card <ExternalLink size={14} />
                        </a>
                        <a
                          href="https://www.heidialm.at"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-wood-600 hover:text-logo-green flex items-center gap-1"
                        >
                          Heidialm <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: totalDots }).map((_, index) => (
          <button
            key={index}
            onClick={() => goTo(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              currentIndex === index
                ? 'bg-logo-green w-6'
                : 'bg-logo-green/30 hover:bg-logo-green/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
