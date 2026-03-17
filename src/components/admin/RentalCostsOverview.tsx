'use client';

import { useState } from 'react';
import { Euro, Calendar, Building2, Info, ChevronDown, ChevronUp, TrendingUp, BarChart3, Users, Ruler, Flame, Bed, Bath, Mountain } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatting';

interface RentalCostsOverviewProps {
  adminPassword: string;
  demoMode?: boolean;
}

// Seasonal pricing structure
interface SeasonPeriod {
  name: string;
  from: string;
  to: string;
  pricePerNight: number;
  description: string;
  color: string;
  isWinter: boolean;
}

// Platform configuration
interface PlatformConfig {
  name: string;
  color: string;
  hasNebenkosten: boolean;
  nebenkostenNote: string;
  hasCleaning: boolean;
  cleaningAmount: number;
  cleaningNote: string;
  commission: number;
}

// Market comparison data
interface MarketProperty {
  name: string;
  persons: number;
  size: number | null;
  hasSauna: boolean;
  segment: 'budget' | 'mittelklasse' | 'premium';
  priceNebensaison: number;
  priceHauptsaison: number;
  priceHochsaison: number;
  notes: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    name: 'FeWo-direkt / VRBO',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    hasNebenkosten: true,
    nebenkostenNote: 'Werden separat berechnet',
    hasCleaning: true,
    cleaningAmount: 100,
    cleaningNote: 'In Miete inkludiert oder bar vor Ort',
    commission: 8,
  },
  {
    name: 'Booking.com',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    hasNebenkosten: false,
    nebenkostenNote: 'NICHT berechenbar!',
    hasCleaning: true,
    cleaningAmount: 100,
    cleaningNote: 'Nur Reinigung wird berechnet',
    commission: 15,
  },
  {
    name: 'Feratel',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    hasNebenkosten: true,
    nebenkostenNote: 'Vor Ort berechnet',
    hasCleaning: true,
    cleaningAmount: 100,
    cleaningNote: 'Vor Ort zu zahlen',
    commission: 12,
  },
  {
    name: 'Direktbuchung',
    color: 'bg-green-100 text-green-800 border-green-200',
    hasNebenkosten: true,
    nebenkostenNote: 'Vor Ort berechnet',
    hasCleaning: true,
    cleaningAmount: 100,
    cleaningNote: 'Bar vor Ort',
    commission: 0,
  },
];

// Market comparison: Real data from Marktstudie Falkertsee 2025/2026
const MARKET_PROPERTIES: MarketProperty[] = [
  // Budget Segment (61-100€)
  { name: 'Almbachhütte', persons: 8, size: 147, hasSauna: false, segment: 'budget', priceNebensaison: 61, priceHauptsaison: 75, priceHochsaison: 95, notes: 'Kamin' },
  { name: 'Falkertbachhütte', persons: 8, size: 147, hasSauna: false, segment: 'budget', priceNebensaison: 68, priceHauptsaison: 85, priceHochsaison: 105, notes: 'Kamin' },
  { name: 'Almhaus an der Sonne', persons: 5, size: 76, hasSauna: false, segment: 'budget', priceNebensaison: 75, priceHauptsaison: 95, priceHochsaison: 115, notes: 'Kamin, Balkon' },
  { name: 'Maibachhütte', persons: 8, size: 147, hasSauna: true, segment: 'budget', priceNebensaison: 78, priceHauptsaison: 100, priceHochsaison: 120, notes: 'Sauna, Kamin' },
  { name: 'Sechszirbenhütte', persons: 5, size: 80, hasSauna: true, segment: 'budget', priceNebensaison: 86, priceHauptsaison: 110, priceHochsaison: 135, notes: 'Pelletofen, NK inkl.' },
  // Mittelklasse (100-200€)
  { name: 'Ferienhaus Baar', persons: 9, size: 90, hasSauna: true, segment: 'mittelklasse', priceNebensaison: 116, priceHauptsaison: 145, priceHochsaison: 180, notes: 'Sauna, Kamin' },
  { name: 'Zirbenhütte (Heidi)', persons: 6, size: 50, hasSauna: false, segment: 'mittelklasse', priceNebensaison: 120, priceHauptsaison: 200, priceHochsaison: 250, notes: 'Kamin' },
  { name: 'Almhaus Heidi Nockberge', persons: 10, size: 100, hasSauna: true, segment: 'mittelklasse', priceNebensaison: 124, priceHauptsaison: 155, priceHochsaison: 190, notes: 'Sauna, Kachelofen' },
  { name: 'Heidi Chalet Almsommer', persons: 8, size: 160, hasSauna: true, segment: 'mittelklasse', priceNebensaison: 150, priceHauptsaison: 295, priceHochsaison: 395, notes: 'Sauna, HotPot, Kamin' },
  { name: 'Chalet Heidi Alm (Grether)', persons: 9, size: null, hasSauna: true, segment: 'mittelklasse', priceNebensaison: 180, priceHauptsaison: 217, priceHochsaison: 280, notes: 'Sauna' },
  // Premium/Luxus (250-650€)
  { name: 'Almhaus Seeblick', persons: 4, size: null, hasSauna: false, segment: 'premium', priceNebensaison: 240, priceHauptsaison: 320, priceHochsaison: 420, notes: 'Kamin, Terrasse' },
  { name: 'Chalet Panorama', persons: 11, size: 205, hasSauna: true, segment: 'premium', priceNebensaison: 280, priceHauptsaison: 350, priceHochsaison: 450, notes: 'Sauna, Wellness' },
  { name: 'Heidi-Alm Lodge', persons: 8, size: 180, hasSauna: true, segment: 'premium', priceNebensaison: 400, priceHauptsaison: 500, priceHochsaison: 600, notes: 'Sauna, Kamin, Premium' },
  { name: 'Wellness-Chalet (Grether)', persons: 8, size: null, hasSauna: true, segment: 'premium', priceNebensaison: 400, priceHauptsaison: 499, priceHochsaison: 580, notes: 'Sauna, HotPot, Whirlpool' },
  { name: 'Luxuschalet (Grether)', persons: 8, size: null, hasSauna: true, segment: 'premium', priceNebensaison: 450, priceHauptsaison: 561, priceHochsaison: 650, notes: 'Sauna, HotPot, Premium' },
];

// Market statistics from study
const MARKET_STATS = {
  nebensaison: { median: 120, avg: 159, min: 61, max: 450 },
  hauptsaison: { median: 175, avg: 232, min: 75, max: 561 },
  hochsaison: { median: 235, avg: 296, min: 95, max: 650 },
  sommer: { median: 165, avg: 208, min: 80, max: 420 },
};

// NK-Aufschlag pro Nacht für Booking (da NK nicht separat berechenbar)
// Basiert auf: Kurtaxe ~3€ + Holz ~8€ + Strom ~5€ + Wasser ~2€ = ~18€/Nacht (4 Pers., Winter)
const NK_AUFSCHLAG_WINTER = 45; // pro Nacht
const NK_AUFSCHLAG_SOMMER = 35; // pro Nacht (weniger Holz/Strom)

// Season type for market comparison tooltips
type SeasonType = 'hochsaison' | 'hauptsaison' | 'nebensaison' | 'sommer';

// Seasonal pricing - EMPFOHLEN basierend auf Marktstudie (Basispreis für FeWo/Feratel)
// Zeiträume: Samstag bis Samstag
const SEASONS_2026: (SeasonPeriod & { seasonType: SeasonType })[] = [
  { name: 'Neujahr', from: '28.12.', to: '10.01.', pricePerNight: 320, description: 'Silvester/Neujahr - Peak', color: '', isWinter: true, seasonType: 'hochsaison' },
  { name: 'Skisaison', from: '10.01.', to: '14.02.', pricePerNight: 170, description: 'Skisaison', color: '', isWinter: true, seasonType: 'hauptsaison' },
  { name: 'Fasching', from: '14.02.', to: '21.02.', pricePerNight: 220, description: 'Faschingsferien - Hochsaison', color: '', isWinter: true, seasonType: 'hochsaison' },
  { name: 'Spätwinter', from: '21.02.', to: '28.03.', pricePerNight: 170, description: 'Spätwinter/Skisaison', color: '', isWinter: true, seasonType: 'hauptsaison' },
  { name: 'Ostern', from: '28.03.', to: '11.04.', pricePerNight: 220, description: 'Osterferien (5.4.-6.4.)', color: '', isWinter: true, seasonType: 'hochsaison' },
  { name: 'Nebensaison Frühjahr', from: '11.04.', to: '27.06.', pricePerNight: 130, description: 'Nebensaison', color: '', isWinter: false, seasonType: 'nebensaison' },
  { name: 'Sommerferien', from: '27.06.', to: '05.09.', pricePerNight: 155, description: 'Sommersaison', color: '', isWinter: false, seasonType: 'sommer' },
  { name: 'Nebensaison Herbst', from: '05.09.', to: '28.11.', pricePerNight: 130, description: 'Nebensaison', color: '', isWinter: false, seasonType: 'nebensaison' },
  { name: 'Advent', from: '28.11.', to: '19.12.', pricePerNight: 145, description: 'Vorweihnachtszeit', color: '', isWinter: true, seasonType: 'nebensaison' },
  { name: 'Weihnachten', from: '19.12.', to: '28.12.', pricePerNight: 320, description: 'Weihnachten - Peak', color: '', isWinter: true, seasonType: 'hochsaison' },
];

// 2027 prices: 5% increase compared to 2026 (rounded to 5€)
// Zeiträume: Samstag bis Samstag
const SEASONS_2027: (SeasonPeriod & { seasonType: SeasonType })[] = [
  { name: 'Neujahr', from: '26.12.', to: '09.01.', pricePerNight: 335, description: 'Silvester/Neujahr - Peak (+5%)', color: '', isWinter: true, seasonType: 'hochsaison' },
  { name: 'Skisaison', from: '09.01.', to: '06.02.', pricePerNight: 180, description: 'Skisaison (+5%)', color: '', isWinter: true, seasonType: 'hauptsaison' },
  { name: 'Fasching', from: '06.02.', to: '13.02.', pricePerNight: 230, description: 'Faschingsferien - Hochsaison (+5%)', color: '', isWinter: true, seasonType: 'hochsaison' },
  { name: 'Spätwinter', from: '13.02.', to: '20.03.', pricePerNight: 180, description: 'Spätwinter/Skisaison (+5%)', color: '', isWinter: true, seasonType: 'hauptsaison' },
  { name: 'Ostern', from: '20.03.', to: '03.04.', pricePerNight: 230, description: 'Osterferien (28.3.) (+5%)', color: '', isWinter: true, seasonType: 'hochsaison' },
  { name: 'Nebensaison Frühjahr', from: '03.04.', to: '26.06.', pricePerNight: 135, description: 'Nebensaison (+5%)', color: '', isWinter: false, seasonType: 'nebensaison' },
  { name: 'Sommerferien', from: '26.06.', to: '04.09.', pricePerNight: 165, description: 'Sommersaison (+5%)', color: '', isWinter: false, seasonType: 'sommer' },
  { name: 'Nebensaison Herbst', from: '04.09.', to: '27.11.', pricePerNight: 135, description: 'Nebensaison (+5%)', color: '', isWinter: false, seasonType: 'nebensaison' },
  { name: 'Advent', from: '27.11.', to: '18.12.', pricePerNight: 150, description: 'Vorweihnachtszeit (+5%)', color: '', isWinter: true, seasonType: 'nebensaison' },
  { name: 'Weihnachten', from: '18.12.', to: '26.12.', pricePerNight: 335, description: 'Weihnachten - Peak (+5%)', color: '', isWinter: true, seasonType: 'hochsaison' },
];

const TYPICAL_NK_WEEK = { winter: 320, summer: 260 };

export default function RentalCostsOverview({ adminPassword, demoMode = false }: RentalCostsOverviewProps) {
  const [selectedYear, setSelectedYear] = useState<2026 | 2027>(2026);
  const [showPlatformDetails, setShowPlatformDetails] = useState(false);
  const [showMarketDetails, setShowMarketDetails] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<SeasonPeriod | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'budget' | 'mittelklasse' | 'premium'>('all');

  const seasons = selectedYear === 2026 ? SEASONS_2026 : SEASONS_2027;
  const filteredProperties = segmentFilter === 'all'
    ? MARKET_PROPERTIES
    : MARKET_PROPERTIES.filter(p => p.segment === segmentFilter);

  const calculateYearlyStats = () => {
    let totalDays = 0;
    let weightedSum = 0;
    seasons.forEach(season => {
      // Parse DD.MM. format
      const fromParts = season.from.replace('.', '').split('.').map(Number);
      const toParts = season.to.replace('.', '').split('.').map(Number);
      const fromDate = new Date(selectedYear, fromParts[1] - 1, fromParts[0]);
      const toDate = new Date(selectedYear, toParts[1] - 1, toParts[0]);
      const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDays += days;
      weightedSum += days * season.pricePerNight;
    });
    return {
      avgPrice: Math.round(weightedSum / totalDays),
      minPrice: Math.min(...seasons.map(s => s.pricePerNight)),
      maxPrice: Math.max(...seasons.map(s => s.pricePerNight)),
    };
  };

  // Get competitor prices for a season type
  const getCompetitorPrices = (seasonType: SeasonType) => {
    const priceKey = seasonType === 'hochsaison' ? 'priceHochsaison'
      : seasonType === 'hauptsaison' ? 'priceHauptsaison'
      : seasonType === 'sommer' ? 'priceHauptsaison' // Use Hauptsaison for summer
      : 'priceNebensaison';

    return MARKET_PROPERTIES.slice(0, 6).map(p => ({
      name: p.name,
      price: p[priceKey]
    }));
  };

  const yearlyStats = calculateYearlyStats();

  const calculateWeekExample = (pricePerNight: number, platform: PlatformConfig, isWinter: boolean = true) => {
    const nights = 7;
    const baseRent = pricePerNight * nights;
    const cleaning = 125;
    const estimatedNK = platform.hasNebenkosten ? (isWinter ? TYPICAL_NK_WEEK.winter : TYPICAL_NK_WEEK.summer) : 0;
    const platformCommission = baseRent * (platform.commission / 100);
    const totalGuest = baseRent + cleaning + estimatedNK;
    const netRevenue = baseRent - platformCommission;
    const lostNK = platform.hasNebenkosten ? 0 : (isWinter ? TYPICAL_NK_WEEK.winter : TYPICAL_NK_WEEK.summer);
    return { baseRent, cleaning, estimatedNK, totalGuest, platformCommission, netRevenue, lostNK };
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'budget': return 'bg-green-100 text-green-800';
      case 'mittelklasse': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Euro className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              Mietkosten & Marktanalyse
            </h2>
            <p className="text-sm text-gray-600 mt-1">Marktstudie Falkertsee 2025/2026</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedYear(2026)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedYear === 2026 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>2026</button>
            <button onClick={() => setSelectedYear(2027)} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${selectedYear === 2027 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>2027</button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-xs text-green-700 font-medium">Ø Preis/Nacht</div>
            <div className="text-xl font-bold text-green-800">{formatCurrency(yearlyStats.avgPrice)}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 border border-red-200">
            <div className="text-xs text-red-700 font-medium">Hochsaison</div>
            <div className="text-xl font-bold text-red-800">{formatCurrency(yearlyStats.maxPrice)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="text-xs text-gray-700 font-medium">Nebensaison</div>
            <div className="text-xl font-bold text-gray-800">{formatCurrency(yearlyStats.minPrice)}</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="text-xs text-blue-700 font-medium">Markt-Median</div>
            <div className="text-xl font-bold text-blue-800">{formatCurrency(MARKET_STATS.hauptsaison.median)}</div>
          </div>
        </div>
      </div>

      {/* Market Comparison */}
      <div className="bg-white rounded-xl overflow-hidden">
        <button onClick={() => setShowMarketDetails(!showMarketDetails)} className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-6 py-4 border-b flex items-center justify-between hover:from-blue-100 hover:to-indigo-100 transition-colors">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Marktvergleich Falkertsee ({MARKET_PROPERTIES.length} Objekte)
          </h3>
          {showMarketDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showMarketDetails && (
          <>
            {/* Market Statistics by Season */}
            <div className="bg-indigo-50/50 px-4 py-4 border-b">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Nebensaison</div>
                  <div className="text-lg font-bold text-indigo-700">{formatCurrency(MARKET_STATS.nebensaison.median)}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(MARKET_STATS.nebensaison.min)}-{formatCurrency(MARKET_STATS.nebensaison.max)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Hauptsaison</div>
                  <div className="text-lg font-bold text-indigo-700">{formatCurrency(MARKET_STATS.hauptsaison.median)}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(MARKET_STATS.hauptsaison.min)}-{formatCurrency(MARKET_STATS.hauptsaison.max)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Hochsaison</div>
                  <div className="text-lg font-bold text-red-700">{formatCurrency(MARKET_STATS.hochsaison.median)}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(MARKET_STATS.hochsaison.min)}-{formatCurrency(MARKET_STATS.hochsaison.max)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase mb-1">Sommer</div>
                  <div className="text-lg font-bold text-amber-700">{formatCurrency(MARKET_STATS.sommer.median)}</div>
                  <div className="text-xs text-gray-500">{formatCurrency(MARKET_STATS.sommer.min)}-{formatCurrency(MARKET_STATS.sommer.max)}</div>
                </div>
              </div>
            </div>

            {/* Segment Filter */}
            <div className="px-4 py-3 border-b flex gap-2 flex-wrap">
              <button onClick={() => setSegmentFilter('all')} className={`px-3 py-1 rounded text-sm font-medium ${segmentFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}>Alle</button>
              <button onClick={() => setSegmentFilter('budget')} className={`px-3 py-1 rounded text-sm font-medium ${segmentFilter === 'budget' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'}`}>Budget (61-100€)</button>
              <button onClick={() => setSegmentFilter('mittelklasse')} className={`px-3 py-1 rounded text-sm font-medium ${segmentFilter === 'mittelklasse' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}>Mittelklasse (100-200€)</button>
              <button onClick={() => setSegmentFilter('premium')} className={`px-3 py-1 rounded text-sm font-medium ${segmentFilter === 'premium' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'}`}>Premium (250-650€)</button>
            </div>

            {/* Properties Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Objekt</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Pers.</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">m²</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Sauna</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Neben</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-blue-600 uppercase">Haupt</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-red-600 uppercase">Hoch</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Sechszirbenhütte highlighted */}
                  <tr className="bg-primary/10 font-medium">
                    <td className="px-4 py-3"><span className="font-bold text-primary">Sechszirbenhütte (EMPFOHLEN)</span></td>
                    <td className="px-4 py-3 text-center">8</td>
                    <td className="px-4 py-3 text-center">125</td>
                    <td className="px-4 py-3 text-center text-green-600">✓</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(130)}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCurrency(170)}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700">{formatCurrency(240)}</td>
                    <td className="px-4 py-3"><span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">Mittelklasse</span></td>
                  </tr>
                  {filteredProperties.map((property, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{property.name}</div>
                        <div className="text-xs text-gray-500">{property.notes}</div>
                      </td>
                      <td className="px-4 py-3 text-center">{property.persons}</td>
                      <td className="px-4 py-3 text-center">{property.size || '-'}</td>
                      <td className="px-4 py-3 text-center">{property.hasSauna ? <span className="text-green-600">✓</span> : <span className="text-gray-300">-</span>}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(property.priceNebensaison)}</td>
                      <td className="px-4 py-3 text-right text-blue-700">{formatCurrency(property.priceHauptsaison)}</td>
                      <td className="px-4 py-3 text-right text-red-700">{formatCurrency(property.priceHochsaison)}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${getSegmentColor(property.segment)}`}>{property.segment}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Market Analysis */}
            <div className="bg-blue-50 px-4 py-3 border-t">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" />Marktpositionierung</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Aktueller Basispreis (130€)</strong> entspricht dem unteren Mittelfeld vergleichbarer Objekte</li>
                <li>• <strong>Premium-Ausstattung:</strong> Sauna, 125m², ideal für Familien (8 Pers.)</li>
                <li>• <strong>Empfohlene Position:</strong> Oberes Mittelfeld (170€ Hauptsaison, 220€ Hochsaison)</li>
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Platform Comparison */}
      <div className="bg-white rounded-xl overflow-hidden">
        <button onClick={() => setShowPlatformDetails(!showPlatformDetails)} className="w-full bg-gray-50 px-4 sm:px-6 py-4 border-b flex items-center justify-between hover:bg-gray-100 transition-colors">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Plattform-Vergleich
          </h3>
          {showPlatformDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showPlatformDetails && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Plattform</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">NK</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Reinigung</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Provision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PLATFORMS.map((platform) => (
                  <tr key={platform.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium border ${platform.color}`}>{platform.name}</span></td>
                    <td className="px-4 py-3 text-center">
                      {platform.hasNebenkosten ? <span className="text-green-700 font-medium">✓</span> : <span className="text-red-600 font-medium">✗</span>}
                      <div className="text-xs text-gray-500">{platform.nebenkostenNote}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{formatCurrency(platform.cleaningAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold text-lg ${platform.commission > 10 ? 'text-red-600' : platform.commission > 0 ? 'text-orange-600' : 'text-green-600'}`}>{platform.commission}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!showPlatformDetails && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PLATFORMS.map((platform) => (
              <div key={platform.name} className={`rounded-lg p-3 border ${platform.color}`}>
                <div className="font-medium text-sm">{platform.name}</div>
                <div className="text-xs mt-1">NK: {platform.hasNebenkosten ? '✓' : '✗'} | {platform.commission}%</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seasonal Pricing */}
      <div className="bg-white rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 sm:px-6 py-4 border-b">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Saisonpreise {selectedYear} - Plattform-Vergleich
          </h3>
          <p className="text-xs text-gray-500 mt-1">FeWo/Feratel: NK separat | Booking: NK inkludiert (außer Reinigung) | Hover für Marktpreise</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Saison</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Zeitraum</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">FeWo/Feratel</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Booking</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">NK/Nacht</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">7 Nächte</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {seasons.map((season, index) => {
                const nkAufschlag = season.isWinter ? NK_AUFSCHLAG_WINTER : NK_AUFSCHLAG_SOMMER;
                const bookingPrice = season.pricePerNight + nkAufschlag;
                const competitors = getCompetitorPrices(season.seasonType);
                const marketStats = MARKET_STATS[season.seasonType === 'sommer' ? 'sommer' : season.seasonType];
                return (
                  <tr
                    key={index}
                    className="hover:bg-blue-50 cursor-pointer group relative"
                    onClick={() => setSelectedSeason(selectedSeason?.name === season.name ? null : season)}
                    title={`Markt ${season.seasonType}: Median ${formatCurrency(marketStats.median)} | ${competitors.map(c => `${c.name}: ${formatCurrency(c.price)}`).join(' | ')}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {season.name}
                      <span className="ml-2 text-xs text-gray-400">({season.seasonType})</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-600">{season.from} - {season.to}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(season.pricePerNight)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-gray-900">{formatCurrency(bookingPrice)}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">+{formatCurrency(nkAufschlag)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-700">{formatCurrency(season.pricePerNight * 7)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Platform pricing explanation */}
        <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
          <div className="flex flex-wrap gap-4">
            <div><span className="font-medium">FeWo/Feratel:</span> Basis-Preis, NK werden vor Ort abgerechnet</div>
            <div><span className="font-medium">Booking:</span> Inkl. NK-Pauschale ({formatCurrency(NK_AUFSCHLAG_WINTER)} Winter / {formatCurrency(NK_AUFSCHLAG_SOMMER)} Sommer)</div>
          </div>
        </div>
      </div>

      {/* Selected Season Detail */}
      {selectedSeason && (
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="bg-primary/10 px-4 sm:px-6 py-4 border-b">
            <h3 className="font-bold text-gray-900">{selectedSeason.name}: {formatCurrency(selectedSeason.pricePerNight)}/Nacht × 7 = {formatCurrency(selectedSeason.pricePerNight * 7)}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Plattform</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Miete</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">+ER</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">+NK</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-600 bg-emerald-50">Gast</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-red-600">-Prov</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-orange-600">NK-Verl.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-green-600 bg-green-50">Netto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {PLATFORMS.map((platform) => {
                  const calc = calculateWeekExample(selectedSeason.pricePerNight, platform, true);
                  return (
                    <tr key={platform.name}>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium border ${platform.color}`}>{platform.name}</span></td>
                      <td className="px-4 py-3 text-right">{formatCurrency(calc.baseRent)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{formatCurrency(calc.cleaning)}</td>
                      <td className="px-4 py-3 text-right">{calc.estimatedNK > 0 ? formatCurrency(calc.estimatedNK) : <span className="text-red-500">-</span>}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700 bg-emerald-50">{formatCurrency(calc.totalGuest)}</td>
                      <td className="px-4 py-3 text-right text-red-600">-{formatCurrency(calc.platformCommission)}</td>
                      <td className="px-4 py-3 text-right">{calc.lostNK > 0 ? <span className="text-orange-600">-{formatCurrency(calc.lostNK)}</span> : '0'}</td>
                      <td className={`px-4 py-3 text-right font-bold bg-green-50 ${calc.lostNK > 0 ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(calc.netRevenue - calc.lostNK)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
        <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2"><Info className="w-4 h-4" />Nebenkosten</h4>
        <div className="text-sm text-amber-800 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>Endreinigung: 75€</div>
          <div>Kurtaxe: 2€/Pers./Nacht</div>
          <div>Strom: 0,30-0,55€/kWh</div>
          <div>Holz: 30-60€/Woche</div>
        </div>
      </div>

      {/* Price Legend - simplified */}
      <div className="bg-white rounded-xl p-4">
        <h4 className="font-bold text-gray-900 mb-3">Preisstufen (empfohlen)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-600">
          <div><strong>Hochsaison:</strong> 220-320€</div>
          <div><strong>Hauptsaison:</strong> 170-180€</div>
          <div><strong>Sommer:</strong> 155€</div>
          <div><strong>Nebensaison:</strong> 130€</div>
        </div>
      </div>
    </div>
  );
}
