'use client';

import { X, Cog } from 'lucide-react';

interface HeroVideoQualityModalProps {
  heroVideoFile: File;
  onUploadQuality: (quality: '1080p' | '720p' | '480p' | '360p') => void;
  onAutoDetect: () => void;
  onClose: () => void;
}

export default function HeroVideoQualityModal({
  heroVideoFile,
  onUploadQuality,
  onAutoDetect,
  onClose,
}: HeroVideoQualityModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Video-Qualität wählen
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Welche Auflösung hat dieses Video?
        </p>

        <p className="text-xs text-gray-500 mb-4">
          Datei: {heroVideoFile.name}
        </p>

        <div className="space-y-2">
          <button
            onClick={onAutoDetect}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-left flex items-center gap-3"
          >
            <Cog className="w-5 h-5" />
            <div>
              <span className="font-bold">Qualität erkennen</span>
              <span className="text-white/80 ml-2">— Automatisch</span>
            </div>
          </button>

          <div className="border-t border-gray-200 my-3 pt-3">
            <p className="text-xs text-gray-500 mb-2">Oder manuell auswählen:</p>
          </div>

          <button
            onClick={() => onUploadQuality('1080p')}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-left"
          >
            <span className="font-bold">1080p</span>
            <span className="text-white/80 ml-2">— 1920 × 1080 (Full HD)</span>
          </button>
          <button
            onClick={() => onUploadQuality('720p')}
            className="w-full px-4 py-3 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition text-left"
          >
            <span className="font-bold">720p</span>
            <span className="text-white/80 ml-2">— 1280 × 720 (HD)</span>
          </button>
          <button
            onClick={() => onUploadQuality('480p')}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-left"
          >
            <span className="font-bold">480p</span>
            <span className="text-gray-500 ml-2">— 854 × 480 (SD)</span>
          </button>
          <button
            onClick={() => onUploadQuality('360p')}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-left"
          >
            <span className="font-bold">360p</span>
            <span className="text-gray-500 ml-2">— 640 × 360 (Mobil)</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-gray-500 hover:text-gray-700 transition"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
