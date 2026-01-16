'use client';

import { useState, useEffect } from 'react';
import { X, FileText, Upload, Check, AlertTriangle, User, Calendar, Euro } from 'lucide-react';
import { calculateUtilityCostsForBooking } from '../UtilityCostsCalculator';

interface Guest {
  id: number;
  guest_name: string;
  email: string | null;
  phone: string | null;
}

interface ParsedBooking {
  reservationNumber: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  adults: number;
  hasPet: boolean;
  guestName: string;
  phone: string;
  email: string;
  totalPayout: number;
  platform: string;
}

interface FewoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  guests: Guest[];
  onImport: (data: {
    guestId?: number;
    guestName: string;
    email: string;
    phone: string;
    arrivalDate: string;
    departureDate: string;
    adults: number;
    rentalPrice: number;
    platform: string;
    notes: string;
  }) => void;
}

// Parse German date format "Sa., 21. Feb. 2026" to ISO date
function parseGermanDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mär': '03', 'Apr': '04',
    'Mai': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Okt': '10', 'Nov': '11', 'Dez': '12'
  };

  // Match patterns like "21. Feb. 2026" or "Sa., 21. Feb. 2026"
  const match = dateStr.match(/(\d{1,2})\.\s*(\w{3})\.?\s*(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  return '';
}

// Parse the FeWo PDF text
function parseFewoText(text: string): ParsedBooking | null {
  try {
    // Reservation number
    const resMatch = text.match(/Reservierungsnr\.?:?\s*([A-Z0-9-]+)/i);
    const reservationNumber = resMatch ? resMatch[1] : '';

    // Date range - match "Sa., 21. Feb. 2026 — Sa., 28. Feb. 2026"
    const dateMatch = text.match(/(\w+\.?,?\s*\d{1,2}\.\s*\w{3}\.?\s*\d{4})\s*[—–-]\s*(\w+\.?,?\s*\d{1,2}\.\s*\w{3}\.?\s*\d{4})/);
    let arrivalDate = '';
    let departureDate = '';
    if (dateMatch) {
      arrivalDate = parseGermanDate(dateMatch[1]);
      departureDate = parseGermanDate(dateMatch[2]);
    }

    // Calculate nights
    let nights = 0;
    const nightsMatch = text.match(/(\d+)\s*Nächte?/i);
    if (nightsMatch) {
      nights = parseInt(nightsMatch[1]);
    } else if (arrivalDate && departureDate) {
      const start = new Date(arrivalDate);
      const end = new Date(departureDate);
      nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Guests count
    const guestsMatch = text.match(/(\d+)\s*Erwachsene/i);
    const adults = guestsMatch ? parseInt(guestsMatch[1]) : 2;

    // Pet
    const hasPet = /Haustier/i.test(text);

    // Guest name - look for name after date info, before phone
    // Pattern: after "über Vrbo gebucht" or just find name-like pattern
    let guestName = '';
    const namePatterns = [
      /gebucht\s+([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)/,
      /\n([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)\s*\n.*\+\d/,
    ];
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        guestName = match[1].trim();
        break;
      }
    }
    // Fallback: find name before phone number
    if (!guestName) {
      const phoneSection = text.match(/([A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+)\s*\n?\s*\+\d/);
      if (phoneSection) {
        guestName = phoneSection[1].trim();
      }
    }

    // Phone
    const phoneMatch = text.match(/(\+\d[\d\s-]+\d)/);
    const phone = phoneMatch ? phoneMatch[1].replace(/\s/g, '') : '';

    // Email
    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const email = emailMatch ? emailMatch[1] : '';

    // Total payout - look for "Ihre Gesamtauszahlung" or similar
    let totalPayout = 0;
    const payoutPatterns = [
      /Ihre Gesamtauszahlung\s*([\d.,]+)/i,
      /Gesamtauszahlung[:\s]*([\d.,]+)/i,
      /Voraussichtliche Auszahlung.*?\n([\d.,]+)\s*€/i,
      /([\d.,]+)\s*€\s*\n.*Voraussichtliche Auszahlung/i,
    ];
    for (const pattern of payoutPatterns) {
      const match = text.match(pattern);
      if (match) {
        totalPayout = parseFloat(match[1].replace('.', '').replace(',', '.'));
        break;
      }
    }
    // Fallback: look for the main amount at the top
    if (totalPayout === 0) {
      const topAmountMatch = text.match(/([\d.]+,\d{2})\s*€\s*\n[\s\S]*?Voraussichtliche Auszahlung/);
      if (topAmountMatch) {
        totalPayout = parseFloat(topAmountMatch[1].replace('.', '').replace(',', '.'));
      }
    }

    // Platform
    const platform = /Vrbo|FeWo-direkt|fewo-direkt/i.test(text) ? 'FeWo-Direkt' : 'Portal';

    return {
      reservationNumber,
      arrivalDate,
      departureDate,
      nights,
      adults,
      hasPet,
      guestName,
      phone,
      email,
      totalPayout,
      platform,
    };
  } catch (err) {
    console.error('Error parsing FeWo text:', err);
    return null;
  }
}

// Find matching guest by email or name
function findMatchingGuest(guests: Guest[], parsed: ParsedBooking): Guest | null {
  // First try exact email match
  if (parsed.email) {
    const emailMatch = guests.find(g =>
      g.email?.toLowerCase() === parsed.email.toLowerCase()
    );
    if (emailMatch) return emailMatch;
  }

  // Then try name match (case insensitive)
  if (parsed.guestName) {
    const nameMatch = guests.find(g =>
      g.guest_name.toLowerCase() === parsed.guestName.toLowerCase()
    );
    if (nameMatch) return nameMatch;

    // Partial name match (last name)
    const lastName = parsed.guestName.split(' ').pop()?.toLowerCase();
    if (lastName) {
      const partialMatch = guests.find(g =>
        g.guest_name.toLowerCase().includes(lastName)
      );
      if (partialMatch) return partialMatch;
    }
  }

  return null;
}

export function FewoImportModal({ isOpen, onClose, guests, onImport }: FewoImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [parsed, setParsed] = useState<ParsedBooking | null>(null);
  const [matchedGuest, setMatchedGuest] = useState<Guest | null>(null);
  const [useExistingGuest, setUseExistingGuest] = useState(true);
  const [calculatedCosts, setCalculatedCosts] = useState<{
    nk: number;
    provision: number;
    ertrag: number;
  } | null>(null);

  useEffect(() => {
    if (parsed) {
      // Find matching guest
      const match = findMatchingGuest(guests, parsed);
      setMatchedGuest(match);
      setUseExistingGuest(!!match);

      // Calculate costs if we have dates and adults
      if (parsed.arrivalDate && parsed.departureDate && parsed.adults) {
        const costCalc = calculateUtilityCostsForBooking(
          parsed.arrivalDate,
          parsed.departureDate,
          parsed.adults,
          undefined,
          parsed.hasPet // hasDog parameter
        );

        // Gesamtmiete - kalkulatorische NK = Nettomiete
        // Nettomiete * 10% = Provision
        // Gesamtmiete - NK - Provision = Ertrag
        const nk = costCalc.costs + costCalc.kurtaxe; // includes Kurtaxe + other costs
        const nettoMiete = parsed.totalPayout - nk;
        const provision = nettoMiete * 0.10;
        const ertrag = parsed.totalPayout - nk - provision;

        setCalculatedCosts({
          nk,
          provision,
          ertrag
        });
      }
    }
  }, [parsed, guests]);

  const handleParse = () => {
    const result = parseFewoText(inputText);
    setParsed(result);
  };

  const handleImport = () => {
    if (!parsed) return;

    const notes = [
      `FeWo-Direkt Buchung: ${parsed.reservationNumber}`,
      parsed.hasPet ? 'Haustier' : '',
      `Gesamtauszahlung: ${parsed.totalPayout.toFixed(2)}€`,
      calculatedCosts ? `Kalk. NK: ${calculatedCosts.nk.toFixed(2)}€, Provision: ${calculatedCosts.provision.toFixed(2)}€, Ertrag: ${calculatedCosts.ertrag.toFixed(2)}€` : ''
    ].filter(Boolean).join('\n');

    onImport({
      guestId: useExistingGuest && matchedGuest ? matchedGuest.id : undefined,
      guestName: useExistingGuest && matchedGuest ? matchedGuest.guest_name : parsed.guestName,
      email: parsed.email,
      phone: parsed.phone,
      arrivalDate: parsed.arrivalDate,
      departureDate: parsed.departureDate,
      adults: parsed.adults,
      rentalPrice: parsed.totalPayout,
      platform: parsed.platform,
      notes
    });

    // Reset and close
    setInputText('');
    setParsed(null);
    setMatchedGuest(null);
    onClose();
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            FeWo-Direkt Buchung importieren
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!parsed ? (
            <div className="space-y-4">
              <p className="text-gray-600">
                Füge den Text aus der FeWo-Direkt Buchungsbestätigung ein:
              </p>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Text hier einfügen..."
                className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
              />
              <button
                onClick={handleParse}
                disabled={!inputText.trim()}
                className="w-full py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
              >
                <Upload className="w-5 h-5" />
                Daten extrahieren
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Parsed Data */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  Extrahierte Daten
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Reservierung:</span>
                    <span className="ml-2 font-medium">{parsed.reservationNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Plattform:</span>
                    <span className="ml-2 font-medium">{parsed.platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Anreise:</span>
                    <span className="ml-2 font-medium">
                      {parsed.arrivalDate ? new Date(parsed.arrivalDate).toLocaleDateString('de-DE') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Abreise:</span>
                    <span className="ml-2 font-medium">
                      {parsed.departureDate ? new Date(parsed.departureDate).toLocaleDateString('de-DE') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Nächte:</span>
                    <span className="ml-2 font-medium">{parsed.nights}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Personen:</span>
                    <span className="ml-2 font-medium">
                      {parsed.adults} Erw. {parsed.hasPet && '+ Haustier'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{parsed.guestName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{parsed.email || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Telefon:</span>
                    <span className="ml-2 font-medium">{parsed.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Auszahlung:</span>
                    <span className="ml-2 font-medium text-green-700">
                      {formatCurrency(parsed.totalPayout)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guest Matching */}
              {matchedGuest && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Bestehender Gast gefunden
                  </h3>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{matchedGuest.guest_name}</p>
                      <p className="text-sm text-blue-700">{matchedGuest.email}</p>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={useExistingGuest}
                        onChange={(e) => setUseExistingGuest(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm">Diesem Gast zuordnen</span>
                    </label>
                  </div>
                </div>
              )}

              {!matchedGuest && parsed.guestName && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Kein bestehender Gast gefunden. Ein neuer Gast wird angelegt.
                  </p>
                </div>
              )}

              {/* Financial Calculation */}
              {calculatedCosts && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                    <Euro className="w-5 h-5" />
                    Finanzielle Berechnung
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Gesamtmiete (Auszahlung):</span>
                      <span className="font-medium">{formatCurrency(parsed.totalPayout)}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>- Kalkulatorische Nebenkosten:</span>
                      <span className="font-medium">-{formatCurrency(calculatedCosts.nk)}</span>
                    </div>
                    <div className="flex justify-between text-gray-500 border-t pt-1">
                      <span>= Nettomiete:</span>
                      <span className="font-medium">{formatCurrency(parsed.totalPayout - calculatedCosts.nk)}</span>
                    </div>
                    <div className="flex justify-between text-red-700">
                      <span>- Provision (10%):</span>
                      <span className="font-medium">-{formatCurrency(calculatedCosts.provision)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-2 text-green-700">
                      <span>= Ertrag:</span>
                      <span>{formatCurrency(calculatedCosts.ertrag)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setParsed(null);
                    setMatchedGuest(null);
                  }}
                  className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Zurück
                </button>
                <button
                  onClick={handleImport}
                  disabled={!parsed.arrivalDate || !parsed.departureDate}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-semibold"
                >
                  <Check className="w-5 h-5" />
                  {useExistingGuest && matchedGuest ? 'Buchung zuordnen' : 'Gast & Buchung anlegen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
