'use client';

import { useState } from 'react';
import { Car, ChevronDown, ChevronUp } from 'lucide-react';

interface KidsTrip {
  title: string;
  distance: string;
  age: string;
  description: string;
}

interface FeaturedTrip {
  title: string;
  distance: string;
  age: string;
  description: string;
}

interface KidsTripsSectionProps {
  title: string;
  featured?: FeaturedTrip;
  trips: KidsTrip[];
}

export function KidsTripsSection({ title, featured, trips }: KidsTripsSectionProps) {
  const [expandedKidsTrip, setExpandedKidsTrip] = useState<number | null>(null);

  return (
    <>
      <div className="flex flex-col items-center text-center mb-8">
        <h3
          className="text-2xl sm:text-3xl md:text-4xl text-logo-green"
          style={{ fontFamily: 'FeelingPassionate, cursive' }}
        >
          {title}
        </h3>
      </div>

      {/* Featured: Heidi-Alm */}
      {featured && (
        <div className="mb-8">
          <div className="bg-logo-green/15 rounded-2xl p-6 md:p-8 shadow-md border-2 border-logo-green/30">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-logo-green/20 flex items-center justify-center text-logo-green font-bold">
                1
              </span>
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-logo-green">
                  {featured.title}
                </h4>
                <p className="text-sm text-gray-500 font-medium">
                  <Car className="inline w-4 h-4 mr-1" />
                  {featured.distance} | {featured.age}
                </p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">
              {featured.description}
            </p>
          </div>
        </div>
      )}

      {/* Grid: weitere Ausflugsziele */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trips.map((trip, index) => (
          <div
            key={index}
            className="bg-gray-50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-logo-green/20"
          >
            <button
              onClick={() => setExpandedKidsTrip(expandedKidsTrip === index ? null : index)}
              className="w-full p-4 md:p-5 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-logo-green/20 flex items-center justify-center text-logo-green font-bold text-sm flex-shrink-0">
                  {index + 2}
                </span>
                <div>
                  <h4 className="font-bold text-logo-green text-sm md:text-base">{trip.title}</h4>
                  <p className="text-xs text-gray-500">
                    <Car className="inline w-3 h-3 mr-1" />
                    {trip.distance} | {trip.age}
                  </p>
                </div>
              </div>
              {expandedKidsTrip === index ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {expandedKidsTrip === index && (
              <div className="px-4 md:px-5 pb-4 md:pb-5 border-t border-logo-green/20">
                <p className="text-gray-600 text-sm leading-relaxed pt-4">{trip.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
