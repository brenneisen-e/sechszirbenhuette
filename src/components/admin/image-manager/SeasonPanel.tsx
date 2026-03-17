'use client';

import { Sun, Snowflake, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { ImageRecord, SeasonImageReplacement, SUMMER_ACTIVITY_NAMES, WINTER_ACTIVITY_NAMES } from '../image-manager';

interface SeasonPanelProps {
  showSeasonPanel: boolean;
  onToggle: () => void;
  summerImages: ImageRecord[];
  winterImages: ImageRecord[];
  onSetReplacingSeasonImage: (replacement: SeasonImageReplacement) => void;
}

export function SeasonPanel({ showSeasonPanel, onToggle, summerImages, winterImages, onSetReplacingSeasonImage }: SeasonPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      <button onClick={onToggle} className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <Sun className="w-5 h-5 text-amber-500" />
        <Snowflake className="w-5 h-5 text-blue-500" />
        Saison-Aktivitäten
        <span className="text-sm font-normal text-gray-500">({showSeasonPanel ? 'ausblenden' : 'anzeigen'})</span>
      </button>

      {showSeasonPanel && (
        <div className="mt-4 grid md:grid-cols-2 gap-6">
          {/* Summer Activities */}
          <div>
            <h3 className="font-medium text-amber-700 mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Sommer ({summerImages.length}/6)
            </h3>
            <div className="space-y-2">
              {SUMMER_ACTIVITY_NAMES.map((name, i) => {
                const img = summerImages[i];
                return (
                  <div key={i} className="flex items-center gap-3 bg-amber-50 rounded-lg p-2">
                    {img ? (
                      <div className="relative w-16 h-12 rounded overflow-hidden">
                        <Image src={img.image_url} alt={img.alt_text} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 bg-amber-100 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-amber-300" />
                      </div>
                    )}
                    <span className="flex-1 text-sm">{img?.alt_text || name}</span>
                    <button
                      onClick={() => onSetReplacingSeasonImage({ season: 'summer', index: i, existingImage: img || null })}
                      className="px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600"
                    >
                      {img ? 'Ersetzen' : 'Hinzufügen'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Winter Activities */}
          <div>
            <h3 className="font-medium text-blue-700 mb-3 flex items-center gap-2">
              <Snowflake className="w-4 h-4" />
              Winter ({winterImages.length}/6)
            </h3>
            <div className="space-y-2">
              {WINTER_ACTIVITY_NAMES.map((name, i) => {
                const img = winterImages[i];
                return (
                  <div key={i} className="flex items-center gap-3 bg-blue-50 rounded-lg p-2">
                    {img ? (
                      <div className="relative w-16 h-12 rounded overflow-hidden">
                        <Image src={img.image_url} alt={img.alt_text} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-12 bg-blue-100 rounded flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-blue-300" />
                      </div>
                    )}
                    <span className="flex-1 text-sm">{img?.alt_text || name}</span>
                    <button
                      onClick={() => onSetReplacingSeasonImage({ season: 'winter', index: i, existingImage: img || null })}
                      className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      {img ? 'Ersetzen' : 'Hinzufügen'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
