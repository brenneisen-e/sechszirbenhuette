'use client';

import { useRef } from 'react';
import { Loader2, Upload, Calendar, Users, Info } from 'lucide-react';
import { PLATFORM_CONFIG, getPlatformType } from './platformConfig';

interface Step1Props {
  platform: string;
  setPlatform: (v: string) => void;
  bookingNumber: string;
  setBookingNumber: (v: string) => void;
  arrivalDate: string;
  setArrivalDate: (v: string) => void;
  departureDate: string;
  setDepartureDate: (v: string) => void;
  adults: number;
  setAdults: (v: number) => void;
  children: number;
  setChildren: (v: number) => void;
  pets: string;
  setPets: (v: string) => void;
  nights: number;
  isAnalyzing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  analyzeFile: (file: File) => void;
}

export function Step1({
  platform,
  setPlatform,
  bookingNumber,
  setBookingNumber,
  arrivalDate,
  setArrivalDate,
  departureDate,
  setDepartureDate,
  adults,
  setAdults,
  children,
  setChildren,
  pets,
  setPets,
  nights,
  isAnalyzing,
  fileInputRef,
  analyzeFile,
}: Step1Props) {
  const platformType = getPlatformType(platform);
  const config = PLATFORM_CONFIG[platformType];

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Buchungsdetails</h3>
        <p className="text-sm text-gray-500">Plattform, Zeitraum und Gäste</p>
      </div>

      {/* PDF/Screenshot Import */}
      {config.pdfSupport && (
        <div
          className="p-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (items) {
              for (const item of items) {
                if (item.type.startsWith('image/') || item.type === 'application/pdf') {
                  const file = item.getAsFile();
                  if (file) {
                    e.preventDefault();
                    analyzeFile(file);
                  }
                  break;
                }
              }
            }
          }}
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) analyzeFile(file);
            }}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-3">
            {isAnalyzing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-blue-700 font-medium">Analysiere...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-blue-600" />
                <div className="text-center">
                  <span className="text-blue-700 font-medium block">PDF oder Screenshot hochladen</span>
                  <span className="text-blue-500 text-xs">Strg+V zum Einfügen • Klicken zum Auswählen</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Plattform Auswahl */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Plattform *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
            const platformValue = key === 'booking' ? 'Booking.com'
              : key === 'fewo' ? 'FeWo-direkt'
              : key === 'airbnb' ? 'Airbnb'
              : key === 'private' ? 'Privat'
              : 'E-Mail';
            const isSelected = getPlatformType(platform) === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setPlatform(platformValue)}
                className={`
                  p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected
                    ? `border-primary bg-primary/5 ring-2 ring-primary/20`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                `}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded ${cfg.color} text-white`}>
                    {cfg.icon}
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-primary' : 'text-gray-700'}`}>
                    {cfg.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {platform && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Info className="w-3 h-3" />
            {config.description}
          </p>
        )}
      </div>

      {/* Buchungsnummer */}
      {platform && platformType !== 'private' && platformType !== 'direct' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Buchungsnummer</label>
          <input
            type="text"
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value)}
            placeholder="z.B. HA-1234567"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      )}

      {/* Datum */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Anreise *
          </label>
          <input
            type="date"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Abreise *
          </label>
          <input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            required
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {nights > 0 && (
        <div className="text-center text-sm text-gray-600 bg-gray-50 py-2 rounded-lg">
          <strong>{nights} Nächte</strong> • {new Date(arrivalDate).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })} bis {new Date(departureDate).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' })}
        </div>
      )}

      {/* Personen */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Users className="w-4 h-4 inline mr-1" />
            Erwachsene
          </label>
          <input
            type="number"
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value) || 2)}
            min={1}
            max={8}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kinder</label>
          <input
            type="number"
            value={children}
            onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
            min={0}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Haustiere</label>
          <input
            type="text"
            value={pets}
            onChange={(e) => setPets(e.target.value)}
            placeholder="z.B. 1 Hund"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
}
