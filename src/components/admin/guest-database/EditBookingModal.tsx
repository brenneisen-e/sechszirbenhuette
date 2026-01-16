'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Loader2, Save, X, ChevronRight, ChevronLeft, Check,
  Upload, Camera, FileText, Calendar, Users, Euro,
  Building2, Mail, CreditCard, Banknote, Info
} from 'lucide-react';
import type { Booking, ScreenshotAnalysisResponse } from './types';
import { PLATFORMS } from './constants';
import { formatCurrency } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  type PlatformFees,
  type KomfortpaketData,
  KOMFORTPAKET_COST_PER_PERSON,
  KOMFORTPAKET_DEFAULT_PRICE,
} from '@/lib/utils/financeCalculations';

// ============================================================================
// WICHTIG: Keine Finanzberechnungen in dieser Komponente!
// Alle Berechnungen erfolgen zentral in lib/utils/financeCalculations.ts
// Diese Komponente zeigt nur die Ergebnisse an.
// ============================================================================

interface EditBookingModalProps {
  booking: Booking;
  isSubmitting: boolean;
  adminPassword?: string;
  onClose: () => void;
  onSave: (booking: Partial<Booking> & { id: number }, uploadedFile?: File, guestUpdates?: { address?: string }) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

type WizardStep = 1 | 2 | 3;
type PlatformType = 'booking' | 'fewo' | 'airbnb' | 'direct' | 'private';

// Plattform-Kategorie ermitteln
function getPlatformType(platform: string | null): PlatformType {
  const p = platform?.toLowerCase() || '';
  if (p === 'booking.com') return 'booking';
  if (p === 'fewo' || p === 'fewo-direkt' || p === 'vrbo') return 'fewo';
  if (p === 'airbnb') return 'airbnb';
  if (p === 'privat') return 'private';
  return 'direct'; // E-Mail, Telefon, etc.
}

// Plattform-spezifische Konfiguration
const PLATFORM_CONFIG: Record<PlatformType, {
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  showNkInput: boolean;
  showCleaningInput: boolean;
  showPayoutInput: boolean;
  showFees: boolean;
  pdfSupport: boolean;
}> = {
  booking: {
    label: 'Booking.com',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-blue-500',
    description: 'Auszahlung oder Gastzahlung mit Gebühren eingeben',
    showNkInput: false,
    showCleaningInput: false,
    showPayoutInput: true,
    showFees: true,
    pdfSupport: true,
  },
  fewo: {
    label: 'FeWo-direkt / Vrbo',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-orange-500',
    description: 'PDF hochladen oder manuell eingeben',
    showNkInput: true,
    showCleaningInput: true,
    showPayoutInput: false,
    showFees: true,
    pdfSupport: true,
  },
  airbnb: {
    label: 'Airbnb',
    icon: <Building2 className="w-5 h-5" />,
    color: 'bg-rose-500',
    description: 'Auszahlung enthält alles inkl. NK & Reinigung',
    showNkInput: false,
    showCleaningInput: false,
    showPayoutInput: true,
    showFees: false,
    pdfSupport: true,
  },
  direct: {
    label: 'Direkt',
    icon: <Mail className="w-5 h-5" />,
    color: 'bg-green-500',
    description: 'E-Mail, Telefon oder persönlich',
    showNkInput: true,
    showCleaningInput: true,
    showPayoutInput: false,
    showFees: false,
    pdfSupport: false,
  },
  private: {
    label: 'Privat',
    icon: <Users className="w-5 h-5" />,
    color: 'bg-gray-500',
    description: 'Familie & Freunde - keine NK',
    showNkInput: false,
    showCleaningInput: false,
    showPayoutInput: false,
    showFees: false,
    pdfSupport: false,
  },
};

export function EditBookingModal({
  booking,
  isSubmitting,
  adminPassword,
  onClose,
  onSave,
  onSuccess,
  onError,
}: EditBookingModalProps) {
  // === Wizard State ===
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // === Form State - Schritt 1: Grunddaten ===
  const [platform, setPlatform] = useState(booking.platform || '');
  const [bookingNumber, setBookingNumber] = useState(booking.booking_number || '');
  const [arrivalDate, setArrivalDate] = useState(booking.arrival_date || '');
  const [departureDate, setDepartureDate] = useState(booking.departure_date || '');
  const [adults, setAdults] = useState(booking.adults || 2);
  const [children, setChildren] = useState(booking.children || 0);
  const [pets, setPets] = useState(booking.pets || '');

  // === Form State - Schritt 2: Finanzen ===
  const [rentalPrice, setRentalPrice] = useState(booking.rental_price || 0);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [guestTotalPayment, setGuestTotalPayment] = useState(0);
  const [platformServiceFee, setPlatformServiceFee] = useState(0);
  const [nebenkostenIncome, setNebenkostenIncome] = useState(0);
  const [cleaningFeeIncome, setCleaningFeeIncome] = useState(0);
  const [paymentProcessingFee, setPaymentProcessingFee] = useState(0);
  const [cleaningCash, setCleaningCash] = useState(booking.cleaning_cash === 1);
  const [utilitiesCash, setUtilitiesCash] = useState(booking.utilities_cash === 1);
  const [showBookingFees, setShowBookingFees] = useState(false);

  // String state für Booking.com Gebühren-Inputs (verhindert Focus-Verlust)
  const [guestTotalStr, setGuestTotalStr] = useState('');
  const [serviceFeeStr, setServiceFeeStr] = useState('');
  const [processingFeeStr, setProcessingFeeStr] = useState('');

  // Komfortpaket State
  const [komfortpaketEnabled, setKomfortpaketEnabled] = useState(false);
  const [komfortpaketPersons, setKomfortpaketPersons] = useState(0);
  const [komfortpaketGuestPaid, setKomfortpaketGuestPaid] = useState(false);
  const [komfortpaketPricePerPerson, setKomfortpaketPricePerPerson] = useState(KOMFORTPAKET_DEFAULT_PRICE);
  const [komfortpaketPriceStr, setKomfortpaketPriceStr] = useState(KOMFORTPAKET_DEFAULT_PRICE.toString());

  // === Form State - Schritt 3: Zahlungsstatus ===
  const [depositAmount, setDepositAmount] = useState(booking.deposit_amount || 0);
  const [depositPaid, setDepositPaid] = useState(booking.deposit_paid === 1);
  const [finalPaymentPaid, setFinalPaymentPaid] = useState(booking.final_payment_paid === 1);
  const [securityDeposit, setSecurityDeposit] = useState(booking.security_deposit || 0);
  const [status, setStatus] = useState(booking.status || 'active');
  const [notes, setNotes] = useState(booking.notes || '');

  // === Upload State ===
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedGuestData, setExtractedGuestData] = useState<{ address?: string }>({});
  const [extractedTransactions, setExtractedTransactions] = useState<Array<{
    date: string;
    amount: number;
    type: 'payment' | 'refund';
    status: string;
    description?: string;
  }>>([]);
  const [extractedPayoutDate, setExtractedPayoutDate] = useState('');
  const [documentInfo, setDocumentInfo] = useState<{ filename: string; type: string; r2_key?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // === Derived Values ===
  const platformType = getPlatformType(platform);
  const config = PLATFORM_CONFIG[platformType];
  const hasDog = pets?.toLowerCase().includes('hund') ?? false;
  const isPrivate = platformType === 'private';

  // Parse existing additional_costs
  useEffect(() => {
    if (booking.additional_costs) {
      try {
        const parsed = JSON.parse(booking.additional_costs);
        setPayoutAmount(parsed.payout_amount || 0);
        setGuestTotalPayment(parsed.guest_total_payment || 0);
        setPlatformServiceFee(parsed.platform_service_fee || 0);
        setNebenkostenIncome(parsed.nebenkosten_income || 0);
        setCleaningFeeIncome(parsed.cleaning_fee_income || 0);
        setPaymentProcessingFee(parsed.payment_processing_fee || 0);
        // Initialize string state for fee inputs
        if (parsed.guest_total_payment > 0) setGuestTotalStr(parsed.guest_total_payment.toString());
        if (parsed.platform_service_fee > 0) setServiceFeeStr(parsed.platform_service_fee.toString());
        if (parsed.payment_processing_fee > 0) setProcessingFeeStr(parsed.payment_processing_fee.toString());
        if (parsed.transactions) setExtractedTransactions(parsed.transactions);
        if (parsed.payout_date) setExtractedPayoutDate(parsed.payout_date);
        if (parsed.document) setDocumentInfo(parsed.document);
        // Show fee section if fees exist
        if (parsed.guest_total_payment > 0 || parsed.platform_service_fee > 0) {
          setShowBookingFees(true);
        }
        // Komfortpaket
        if (parsed.komfortpaket) {
          setKomfortpaketEnabled(parsed.komfortpaket.enabled || false);
          setKomfortpaketPersons(parsed.komfortpaket.persons || 0);
          setKomfortpaketGuestPaid(parsed.komfortpaket.guestPaid || false);
          setKomfortpaketPricePerPerson(parsed.komfortpaket.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE);
          setKomfortpaketPriceStr((parsed.komfortpaket.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE).toString());
        }
      } catch { /* Not JSON */ }
    }
  }, [booking.additional_costs]);

  // Sync fee string values to number state and calculate payout
  const syncFeeValues = () => {
    const guest = parseFloat(guestTotalStr) || 0;
    const service = parseFloat(serviceFeeStr) || 0;
    const processing = parseFloat(processingFeeStr) || 0;

    setGuestTotalPayment(guest);
    setPlatformServiceFee(service);
    setPaymentProcessingFee(processing);

    // Auto-calculate payout if we have values
    if (guest > 0) {
      const calculatedPayout = guest - service - processing;
      if (calculatedPayout > 0) {
        setPayoutAmount(calculatedPayout);
        setRentalPrice(calculatedPayout);
      }
    }
  };

  // === ZENTRALE FINANZBERECHNUNG ===
  const platformFeesObj: PlatformFees = useMemo(() => ({
    payout_amount: payoutAmount || (rentalPrice + nebenkostenIncome + cleaningFeeIncome),
    guest_total_payment: guestTotalPayment,
    platform_service_fee: platformServiceFee,
    nebenkosten_income: nebenkostenIncome,
    cleaning_fee_income: cleaningFeeIncome,
    payment_processing_fee: paymentProcessingFee,
  }), [payoutAmount, guestTotalPayment, platformServiceFee, rentalPrice, nebenkostenIncome, cleaningFeeIncome, paymentProcessingFee]);

  const komfortpaketObj: KomfortpaketData | undefined = useMemo(() =>
    komfortpaketEnabled ? {
      enabled: true,
      persons: komfortpaketPersons,
      guestPaid: komfortpaketGuestPaid,
      pricePerPerson: komfortpaketPricePerPerson,
    } : undefined
  , [komfortpaketEnabled, komfortpaketPersons, komfortpaketGuestPaid, komfortpaketPricePerPerson]);

  const financeResult = useMemo(() => calculateBookingFinances({
    arrivalDate,
    departureDate,
    adults,
    rentalPrice,
    platform,
    hasDog,
    isPrivate,
    skipNk: false,
    isCleaningCash: cleaningCash,
    isUtilitiesCash: utilitiesCash,
    platformFees: platformFeesObj,
    komfortpaket: komfortpaketObj,
  }), [arrivalDate, departureDate, adults, rentalPrice, platform, hasDog, isPrivate, cleaningCash, utilitiesCash, platformFeesObj, komfortpaketObj]);

  const {
    utilityCosts,
    cleaningCost,
    baseCosts,
    kurtaxe,
    mieterlos,
    provision,
    gesamteinzahlung,
    gesamtkosten,
    gesamtertrag,
    totalNkCosts,
    komfortpaketCosts,
    komfortpaketIncome,
  } = financeResult;

  // === Nächte berechnen ===
  const nights = useMemo(() => {
    if (!arrivalDate || !departureDate) return 0;
    const arrival = new Date(arrivalDate);
    const departure = new Date(departureDate);
    return Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
  }, [arrivalDate, departureDate]);

  // === File Analysis ===
  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/analyze-booking', {
        method: 'POST',
        body: formData
      });

      const result = await response.json() as ScreenshotAnalysisResponse;
      const data = result.data;

      if (data) {
        setUploadedFile(file);

        // Grunddaten übernehmen
        if (data.arrival_date) setArrivalDate(data.arrival_date);
        if (data.departure_date) setDepartureDate(data.departure_date);
        if (data.adults) setAdults(data.adults);
        if (data.booking_number) setBookingNumber(data.booking_number);
        if (data.platform) setPlatform(data.platform);

        // Finanzdaten übernehmen
        if (data.rental_price) setRentalPrice(data.rental_price);
        if (data.payout_amount) setPayoutAmount(data.payout_amount);
        if (data.nebenkosten_income) setNebenkostenIncome(data.nebenkosten_income);
        if (data.cleaning_fee_income) setCleaningFeeIncome(data.cleaning_fee_income);
        if (data.platform_fees) setPaymentProcessingFee(data.platform_fees);
        if (data.payout_date) setExtractedPayoutDate(data.payout_date);
        if (data.address) setExtractedGuestData({ address: data.address });

        // Transaktionen
        if (data.transactions && data.transactions.length > 0) {
          setExtractedTransactions(data.transactions);
          const paidTx = data.transactions.filter(t => t.type === 'payment' && t.status === 'paid');
          if (paidTx.length > 0) {
            setDepositPaid(true);
            if (paidTx.length >= 2 || data.payout_amount) {
              setFinalPaymentPaid(true);
            }
          }
        }

        onSuccess?.('Daten erfolgreich extrahiert! Bitte prüfen.');

        // Automatisch zu Schritt 2 wechseln wenn Daten vorhanden
        if (data.rental_price || data.payout_amount) {
          setCurrentStep(2);
        }
      } else {
        onError?.('Keine Daten extrahiert. Bitte manuell eingeben.');
      }
    } catch (err) {
      onError?.(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // === Form Submit ===
  const handleSubmit = () => {
    const additionalCosts = {
      payout_amount: payoutAmount || gesamteinzahlung,
      guest_total_payment: guestTotalPayment || undefined,
      platform_service_fee: platformServiceFee || undefined,
      nebenkosten_income: nebenkostenIncome,
      cleaning_fee_income: cleaningFeeIncome,
      payment_processing_fee: paymentProcessingFee,
      payout_date: extractedPayoutDate || undefined,
      transactions: extractedTransactions.length > 0 ? extractedTransactions : undefined,
      document: documentInfo?.r2_key ? documentInfo : undefined,
      komfortpaket: komfortpaketEnabled ? {
        enabled: true,
        persons: komfortpaketPersons,
        guestPaid: komfortpaketGuestPaid,
        pricePerPerson: komfortpaketPricePerPerson,
      } : undefined,
    };

    const bookingData = {
      id: booking.id,
      platform: platform || null,
      booking_number: bookingNumber || null,
      arrival_date: arrivalDate || null,
      departure_date: departureDate || null,
      adults,
      children,
      pets: pets || null,
      rental_price: rentalPrice,
      deposit_amount: depositAmount,
      deposit_paid: depositPaid ? 1 : 0,
      final_payment_paid: finalPaymentPaid ? 1 : 0,
      security_deposit: securityDeposit,
      additional_costs: JSON.stringify(additionalCosts),
      status,
      notes: notes || null,
      cleaning_cash: cleaningCash ? 1 : 0,
      utilities_cash: utilitiesCash ? 1 : 0,
    };

    const guestUpdates = Object.keys(extractedGuestData).length > 0 ? extractedGuestData : undefined;
    onSave(bookingData, uploadedFile || undefined, guestUpdates);
  };

  // === Navigation ===
  const canProceedStep1 = platform && arrivalDate && departureDate;
  const canProceedStep2 = rentalPrice > 0 || payoutAmount > 0;

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep((currentStep + 1) as WizardStep);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as WizardStep);
  };

  // === Stepper Component ===
  const Stepper = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center">
          <button
            type="button"
            onClick={() => setCurrentStep(step as WizardStep)}
            disabled={step === 2 && !canProceedStep1}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center font-medium transition-all
              ${currentStep === step
                ? 'bg-primary text-white shadow-lg scale-110'
                : currentStep > step
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500'}
              ${step === 2 && !canProceedStep1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
            `}
          >
            {currentStep > step ? <Check className="w-5 h-5" /> : step}
          </button>
          {step < 3 && (
            <div className={`w-16 h-1 mx-1 rounded ${currentStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  // === Step 1: Grunddaten ===
  const Step1 = () => (
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

  // === Step 2: Finanzen ===
  const Step2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Finanzdaten</h3>
        <p className="text-sm text-gray-500">
          {platformType === 'booking' || platformType === 'airbnb'
            ? 'Nur Auszahlungsbetrag eingeben - Rest wird berechnet'
            : 'Miete und Nebenkosten eingeben'}
        </p>
      </div>

      {/* Booking.com / Airbnb: Payout mit optionalen Gebühren */}
      {(platformType === 'booking' || platformType === 'airbnb') && (
        <div className="space-y-4">
          {/* Haupt-Eingabe: Netto-Auszahlung */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Netto-Auszahlung (was auf dem Konto ankommt)
            </label>
            <div className="relative">
              <input
                type="number"
                value={payoutAmount || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPayoutAmount(val);
                  // Bei Booking/Airbnb: Miete = Auszahlung (NK sind inkludiert)
                  setRentalPrice(val);
                }}
                step="0.01"
                placeholder="z.B. 1246.56"
                className="w-full px-4 py-3 text-xl font-semibold border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Der Betrag enthält Miete, NK und Reinigung. Provision wird berechnet.
            </p>
          </div>

          {/* Barzahlung Optionen */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cleaningCash}
                onChange={(e) => setCleaningCash(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Reinigung bar bezahlt</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={utilitiesCash}
                onChange={(e) => setUtilitiesCash(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">NK bar bezahlt</span>
            </label>
          </div>

          {/* Optionale Gebühren-Eingabe */}
          {platformType === 'booking' && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowBookingFees(!showBookingFees)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">
                  Gebühren erfassen (optional)
                </span>
                <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${showBookingFees ? 'rotate-90' : ''}`} />
              </button>

              {showBookingFees && (
                <div className="p-4 space-y-4 bg-white">
                  <p className="text-xs text-gray-500 mb-3">
                    Optional: Gastzahlung und Gebühren für detailliertes Tracking
                  </p>

                  {/* Gastzahlung */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zahlung des Gastes (Brutto)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={guestTotalStr}
                        onChange={(e) => setGuestTotalStr(e.target.value)}
                        onBlur={syncFeeValues}
                        placeholder="z.B. 1500.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Service-Gebühr */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Booking.com Service-Gebühr
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={serviceFeeStr}
                        onChange={(e) => setServiceFeeStr(e.target.value)}
                        onBlur={syncFeeValues}
                        placeholder="z.B. 180.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Zahlungsgebühr */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zahlungsabwicklung
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={processingFeeStr}
                        onChange={(e) => setProcessingFeeStr(e.target.value)}
                        onBlur={syncFeeValues}
                        placeholder="z.B. 45.00"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                    </div>
                  </div>

                  {/* Auszahlungsdatum */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Auszahlungsdatum
                    </label>
                    <input
                      type="date"
                      value={extractedPayoutDate}
                      onChange={(e) => setExtractedPayoutDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Berechnungs-Hinweis */}
                  {guestTotalPayment > 0 && platformServiceFee > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg text-xs text-gray-600">
                      <div className="flex justify-between mb-1">
                        <span>Gastzahlung:</span>
                        <span>{formatCurrency(guestTotalPayment)}</span>
                      </div>
                      <div className="flex justify-between mb-1 text-red-600">
                        <span>./. Service-Gebühr:</span>
                        <span>-{formatCurrency(platformServiceFee)}</span>
                      </div>
                      {paymentProcessingFee > 0 && (
                        <div className="flex justify-between mb-1 text-red-600">
                          <span>./. Zahlungsabwicklung:</span>
                          <span>-{formatCurrency(paymentProcessingFee)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-blue-200 font-medium">
                        <span>= Netto-Auszahlung:</span>
                        <span className="text-green-600">{formatCurrency(guestTotalPayment - platformServiceFee - paymentProcessingFee)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* FeWo / Direkt: Vollständige Eingabe */}
      {(platformType === 'fewo' || platformType === 'direct') && (
        <>
          {/* Miete */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Euro className="w-4 h-4 inline mr-1" />
              Mietpreis *
            </label>
            <div className="relative">
              <input
                type="number"
                value={rentalPrice || ''}
                onChange={(e) => setRentalPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder="z.B. 2400.00"
                className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
          </div>

          {/* NK */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Nebenkosten-Einnahmen
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={utilitiesCash}
                  onChange={(e) => setUtilitiesCash(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                  <Banknote className="w-4 h-4" />
                  bar
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                value={nebenkostenIncome || ''}
                onChange={(e) => setNebenkostenIncome(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder={utilityCosts ? `Kalk.: ${totalNkCosts.toFixed(2)}` : '0.00'}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Kalkulatorisch: {formatCurrency(totalNkCosts)} (inkl. Kurtaxe {formatCurrency(kurtaxe)})
            </p>
          </div>

          {/* Reinigung */}
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Reinigung-Einnahmen
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleaningCash}
                  onChange={(e) => setCleaningCash(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-green-700 font-medium flex items-center gap-1">
                  <Banknote className="w-4 h-4" />
                  bar
                </span>
              </label>
            </div>
            <div className="relative">
              <input
                type="number"
                value={cleaningFeeIncome || ''}
                onChange={(e) => setCleaningFeeIncome(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder={`Standard: ${cleaningCost}`}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Standard: {formatCurrency(cleaningCost)} {hasDog && '(inkl. 25€ Hundeaufschlag)'}
            </p>
          </div>

          {/* Gebühren (nur FeWo) */}
          {platformType === 'fewo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <CreditCard className="w-4 h-4 inline mr-1" />
                Zahlungsbearbeitungsgebühr
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={paymentProcessingFee || ''}
                  onChange={(e) => setPaymentProcessingFee(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  placeholder="z.B. 66.20"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Wird anteilig vom Mieterlös abgezogen</p>
            </div>
          )}
        </>
      )}

      {/* Privat: Nur Miete (optional) */}
      {platformType === 'private' && (
        <div className="p-4 bg-gray-100 rounded-xl text-center">
          <p className="text-gray-600 mb-4">Private Buchung - keine Nebenkosten</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miete (optional)</label>
            <div className="relative max-w-xs mx-auto">
              <input
                type="number"
                value={rentalPrice || ''}
                onChange={(e) => setRentalPrice(parseFloat(e.target.value) || 0)}
                step="0.01"
                placeholder="0.00"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">€</span>
            </div>
          </div>
        </div>
      )}

      {/* Komfortpaket - für alle außer Privatbuchungen */}
      {!isPrivate && (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-amber-800">
              🛏️ Komfortpaket (Handtücher, Bettwäsche)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={komfortpaketEnabled}
                onChange={(e) => {
                  setKomfortpaketEnabled(e.target.checked);
                  if (e.target.checked && komfortpaketPersons === 0) {
                    setKomfortpaketPersons(adults);
                  }
                }}
                className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
              />
              <span className="text-sm text-amber-700 font-medium">aktiviert</span>
            </label>
          </div>

          {komfortpaketEnabled && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Anzahl Personen</label>
                  <input
                    type="number"
                    value={komfortpaketPersons || ''}
                    onChange={(e) => setKomfortpaketPersons(parseInt(e.target.value) || 0)}
                    min={1}
                    max={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Preis/Person (Standard: 25€)</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={komfortpaketPriceStr}
                      onChange={(e) => setKomfortpaketPriceStr(e.target.value)}
                      onBlur={() => setKomfortpaketPricePerPerson(parseFloat(komfortpaketPriceStr) || KOMFORTPAKET_DEFAULT_PRICE)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={komfortpaketGuestPaid}
                  onChange={(e) => setKomfortpaketGuestPaid(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Gast hat bezahlt</span>
              </label>

              <div className="mt-2 p-2 bg-amber-100 rounded text-xs text-amber-800">
                <div className="flex justify-between">
                  <span>Kosten ({komfortpaketPersons} × {KOMFORTPAKET_COST_PER_PERSON}€):</span>
                  <span className="font-medium text-red-600">-{formatCurrency(komfortpaketCosts)}</span>
                </div>
                {komfortpaketGuestPaid && (
                  <div className="flex justify-between mt-1">
                    <span>Einnahmen ({komfortpaketPersons} × {komfortpaketPricePerPerson}€):</span>
                    <span className="font-medium text-green-600">+{formatCurrency(komfortpaketIncome)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live-Vorschau Finanzübersicht */}
      {(rentalPrice > 0 || payoutAmount > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Vorschau</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">Einnahmen</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(gesamteinzahlung)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Kosten</p>
              <p className="text-lg font-bold text-red-500">{formatCurrency(gesamtkosten)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Ertrag</p>
              <p className={`text-lg font-bold ${gesamtertrag >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(gesamtertrag)}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Mieterlös (Basis für Provision):</span>
              <span className="font-medium">{formatCurrency(mieterlos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Provision (10%):</span>
              <span className="font-medium text-red-500">−{formatCurrency(provision)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // === Step 3: Übersicht & Bestätigung ===
  const Step3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Übersicht & Bestätigung</h3>
        <p className="text-sm text-gray-500">Prüfen Sie alle Angaben</p>
      </div>

      {/* Zusammenfassung */}
      <div className="bg-white border rounded-xl overflow-hidden">
        {/* Header */}
        <div className={`${config.color} text-white p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {config.icon}
              <div>
                <p className="font-semibold">{platform}</p>
                {bookingNumber && <p className="text-sm opacity-90">#{bookingNumber}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{formatCurrency(gesamtertrag)}</p>
              <p className="text-sm opacity-90">Ertrag</p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 space-y-4">
          {/* Zeitraum & Gäste */}
          <div className="flex justify-between text-sm">
            <div>
              <p className="text-gray-500">Zeitraum</p>
              <p className="font-medium">
                {new Date(arrivalDate).toLocaleDateString('de-DE')} – {new Date(departureDate).toLocaleDateString('de-DE')}
              </p>
              <p className="text-gray-500">{nights} Nächte</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500">Gäste</p>
              <p className="font-medium">{adults} Erw.{children > 0 && `, ${children} Kind.`}</p>
              {hasDog && <p className="text-amber-600">Mit Hund</p>}
            </div>
          </div>

          {/* Finanzen */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Einnahmen */}
              <div>
                <p className="text-xs font-semibold text-green-600 mb-2">EINNAHMEN</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Miete</span>
                    <span className="text-green-600">{formatCurrency(rentalPrice)}</span>
                  </div>
                  {nebenkostenIncome > 0 && (
                    <div className="flex justify-between">
                      <span>NK {utilitiesCash && '(bar)'}</span>
                      <span className="text-green-600">{formatCurrency(nebenkostenIncome)}</span>
                    </div>
                  )}
                  {cleaningFeeIncome > 0 && (
                    <div className="flex justify-between">
                      <span>Reinigung {cleaningCash && '(bar)'}</span>
                      <span className="text-green-600">{formatCurrency(cleaningFeeIncome)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Gesamt</span>
                    <span className="text-green-600">{formatCurrency(gesamteinzahlung)}</span>
                  </div>
                </div>
              </div>

              {/* Kosten */}
              <div>
                <p className="text-xs font-semibold text-red-500 mb-2">KOSTEN</p>
                <div className="space-y-1 text-sm">
                  {totalNkCosts > 0 && !utilitiesCash && (
                    <div className="flex justify-between">
                      <span>NK (kalk.)</span>
                      <span className="text-red-500">−{formatCurrency(totalNkCosts)}</span>
                    </div>
                  )}
                  {!cleaningCash && (
                    <div className="flex justify-between">
                      <span>Reinigung</span>
                      <span className="text-red-500">−{formatCurrency(cleaningCost)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Provision</span>
                    <span className="text-red-500">−{formatCurrency(provision)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1">
                    <span>Gesamt</span>
                    <span className="text-red-500">−{formatCurrency(gesamtkosten)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zahlungsstatus */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <p className="text-sm font-semibold text-gray-700 mb-3">Zahlungsstatus</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-green-300">
            <input
              type="checkbox"
              checked={depositPaid}
              onChange={(e) => setDepositPaid(e.target.checked)}
              className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <div>
              <span className="font-medium text-gray-700">Anzahlung</span>
              {depositAmount > 0 && <span className="text-gray-500 text-sm ml-1">({formatCurrency(depositAmount)})</span>}
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 bg-white rounded-lg border cursor-pointer hover:border-green-300">
            <input
              type="checkbox"
              checked={finalPaymentPaid}
              onChange={(e) => setFinalPaymentPaid(e.target.checked)}
              className="w-5 h-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="font-medium text-gray-700">Restzahlung</span>
          </label>
        </div>
      </div>

      {/* Status & Notizen */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="pending">Ausstehend</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="cancelled">Storniert</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Anzahlung (€)</label>
          <input
            type="number"
            value={depositAmount || ''}
            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            placeholder="0.00"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optionale Anmerkungen..."
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-slate-50 to-slate-100">
          <h2 className="text-xl font-bold text-gray-900">
            {booking.id ? 'Buchung bearbeiten' : 'Neue Buchung'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Stepper />

          {currentStep === 1 && Step1()}
          {currentStep === 2 && Step2()}
          {currentStep === 3 && Step3()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Abbrechen
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={currentStep === 1 && !canProceedStep1}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichern...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Buchung speichern
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
