'use client';

import Image from 'next/image';
import { Dog, Clock } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCarousel } from './useCarousel';

interface MediaItem {
  id: number;
  url: string;
  alt_text: string;
  category?: string;
}

interface DogTrip {
  title: string;
  difficulty: string;
  description: string;
  duration?: string;
  tip?: string;
}

interface DogTripsCarouselProps {
  trips: DogTrip[];
  dogTripImages: Record<string, MediaItem[]>;
  dogTripCategories: string[];
  isMobile: boolean;
  noteLabel: string;
  addImageLabel: string;
}

export function DogTripsCarousel({
  trips,
  dogTripImages,
  dogTripCategories,
  isMobile,
  noteLabel,
  addImageLabel,
}: DogTripsCarouselProps) {
  const { currentIndex, maxIndex, totalDots, translateValue, goTo, prev, next } = useCarousel({
    itemCount: trips.length,
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
          className="flex items-stretch transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${translateValue}%)` }}
        >
          {trips.map((trip, index) => {
            const categoryKey = dogTripCategories[index];
            const tripImages = dogTripImages[categoryKey] || [];
            const firstImage = tripImages[0];

            return (
              <div key={index} className="w-full md:w-1/2 flex-shrink-0 px-2">
                <div className="bg-gray-50 rounded-2xl shadow-md overflow-hidden h-full flex flex-col">
                  {/* Portrait Image */}
                  <div className="relative aspect-[3/4] bg-gray-100">
                    {firstImage ? (
                      <Image
                        src={firstImage.url}
                        alt={firstImage.alt_text || trip.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-wood-100 to-wood-200">
                        <div className="text-center text-wood-600">
                          <Dog size={48} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{addImageLabel}</p>
                        </div>
                      </div>
                    )}
                    {/* Number Badge */}
                    <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-wood-600 flex items-center justify-center text-white font-bold shadow-lg">
                      {index + 1}
                    </div>
                  </div>

                  {/* Text Content */}
                  <div className="p-5 flex-1">
                    <h4 className="text-lg font-bold text-logo-green mb-1">{trip.title}</h4>
                    <p className="text-sm text-logo-green/70 font-medium mb-3">{trip.difficulty}</p>
                    <p className="text-gray-600 text-sm leading-relaxed mb-3">{trip.description}</p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      {trip.duration && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <Clock size={14} /> {trip.duration}
                        </span>
                      )}
                      {trip.tip && (
                        <span className="text-wood-600 font-medium">
                          {noteLabel}: {trip.tip}
                        </span>
                      )}
                    </div>
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
