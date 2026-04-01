'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Save,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Minus,
  Calendar,
  Users,
  Euro,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  Home,
  CreditCard,
  Banknote,
  Info,
  ListChecks,
  AlertTriangle,
  Dog,
  Package,
  Lock,
} from 'lucide-react';
import { type Booking, type PrivateBookingConfig, DEFAULT_PRIVATE_CONFIG } from './types';
import { PLATFORM_CONFIGS, STATUS_STYLES, STATUS_OPTIONS, type PlatformConfig } from './constants';
import { formatCurrency } from '@/lib/utils/formatting';
import {
  calculateBookingFinances,
  parsePrivateConfig,
  type PlatformFees,
  type KomfortpaketData,
  type PrivateBookingConfig as FinancePrivateConfig,
  KOMFORTPAKET_COST_PER_PERSON,
  KOMFORTPAKET_DEFAULT_PRICE,
} from '@/lib/utils/financeCalculations';
import PositionsEditor from '@/components/admin/positions/PositionsEditor';
import type { BookingPosition } from '@/lib/types/positions';
import type { PositionCalcContext } from '@/lib/utils/positionCalculator';
import { GermanDateInput } from './GermanDateInput';

// ============================================================================
// TYPES
// ============================================================================

interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  guestId: number;
  guestName: string;
  onBookingCreated?: () => void;
  onBookingUpdated?: () => void;
  booking?: Booking;
  mode: 'create' | 'edit';
  /** Legacy save handler — used to keep GuestDatabase.tsx integration intact */
  onSave?: (booking: Partial<Booking> & { id: number }) => void;
  isSubmitting?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5;

type PlatformType = 'booking' | 'fewo' | 'airbnb' | 'feratel' | 'direct' | 'private';

// ============================================================================
// PLATFORM HELPERS
// ============================================================================

/** The platform values stored in the DB / used in API calls */
const WIZARD_PLATFORMS: Array<{
  key: PlatformType;
  dbValue: string;
  label: string;
  icon: React.ReactNode;
  config: PlatformConfig;
}> = [
  {
    key: 'booking',
    dbValue: 'Booking.com',
    label: 'Booking.com',
    icon: <Building2 className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[0]!,
  },
  {
    key: 'fewo',
    dbValue: 'FeWo',
    label: 'FeWo / VRBO',
    icon: <Globe className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[1]!,
  },
  {
    key: 'airbnb',
    dbValue: 'Airbnb',
    label: 'Airbnb',
    icon: <Home className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[2]!,
  },
  {
    key: 'feratel',
    dbValue: 'Feratel',
    label: 'Feratel',
    icon: <Globe className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[3]!,
  },
  {
    key: 'direct',
    dbValue: 'E-Mail',
    label: 'E-Mail/Direkt',
    icon: <Mail className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[4]!,
  },
  {
    key: 'direct',
    dbValue: 'WhatsApp',
    label: 'WhatsApp',
    icon: <MessageSquare className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[5]!,
  },
  {
    key: 'direct',
    dbValue: 'Telefon',
    label: 'Telefon',
    icon: <Phone className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[6]!,
  },
  {
    key: 'private',
    dbValue: 'Privat',
    label: 'Privat',
    icon: <Users className="w-5 h-5" />,
    config: PLATFORM_CONFIGS[7]!,
  },
];

function getPlatformType(platform: string | null): PlatformType {
  if (!platform) return 'direct';
  const p = platform.toLowerCase();
  if (p.includes('booking')) return 'booking';
  if (p.includes('fewo') || p.includes('vrbo')) return 'fewo';
  if (p.includes('airbnb')) return 'airbnb';
  if (p.includes('feratel')) return 'feratel';
  if (p === 'privat') return 'private';
  return 'direct';
}

function getPlatformConfigForDb(dbValue: string): PlatformConfig {
  const entry = WIZARD_PLATFORMS.find((p) => p.dbValue === dbValue);
  return entry?.config || PLATFORM_CONFIGS[4]!; // default to mail/direct
}

function getSeason(arrivalDate: string): 'Sommer' | 'Winter' {
  const month = new Date(arrivalDate).getMonth() + 1;
  return month >= 5 && month <= 9 ? 'Sommer' : 'Winter';
}

// ============================================================================
// INPUT COMPONENT (green focus ring)
// ============================================================================

const focusClasses =
  'focus:outline-none focus:ring-2 focus:ring-[rgba(22,163,74,0.15)] focus:border-[var(--admin-accent,#16a34a)]';

function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 20,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-600 mr-1">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// Slide animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BookingWizard({
  isOpen,
  onClose,
  guestId,
  guestName,
  onBookingCreated,
  onBookingUpdated,
  booking,
  mode,
  onSave,
  isSubmitting: externalSubmitting,
  onSuccess,
  onError,
}: BookingWizardProps) {
  const isEdit = mode === 'edit' && !!booking;

  // ── Wizard navigation ──
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [direction, setDirection] = useState(0);
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = externalSubmitting || internalSubmitting;

  // ── Step 1: Platform ──
  const [platform, setPlatform] = useState(booking?.platform || '');
  const [bookingNumber, setBookingNumber] = useState(booking?.booking_number || '');

  // ── Private booking config ──
  const existingPrivateConfig = booking?.private_config
    ? parsePrivateConfig(booking.private_config)
    : null;
  const [privateMieteZero, setPrivateMieteZero] = useState(
    existingPrivateConfig?.miete_zero ?? true,
  );
  const [privateNkPaid, setPrivateNkPaid] = useState(existingPrivateConfig?.nk_paid ?? false);
  const [privateKurtaxePaid, setPrivateKurtaxePaid] = useState(
    existingPrivateConfig?.kurtaxe_paid ?? false,
  );
  const [privateProvisionCharged, setPrivateProvisionCharged] = useState(
    existingPrivateConfig?.provision_charged ?? false,
  );

  // ── Step 2: Stay & Guests ──
  const [arrivalDate, setArrivalDate] = useState(booking?.arrival_date || '');
  const [departureDate, setDepartureDate] = useState(booking?.departure_date || '');
  const [adults, setAdults] = useState(booking?.adults || 2);
  const [children, setChildren] = useState(booking?.children || 0);
  const [childrenAges, setChildrenAges] = useState(booking?.children_ages || '');
  const [petsEnabled, setPetsEnabled] = useState(!!booking?.pets);
  const [pets, setPets] = useState(booking?.pets || '');

  // ── Step 3: Finances ──
  const [rentalPrice, setRentalPrice] = useState(booking?.rental_price || 0);
  const [payoutAmount, setPayoutAmount] = useState(0);
  const [guestTotalPayment, setGuestTotalPayment] = useState(0);
  const [platformServiceFee, setPlatformServiceFee] = useState(0);
  const [paymentProcessingFee, setPaymentProcessingFee] = useState(0);
  const [nebenkostenIncome, setNebenkostenIncome] = useState(0);
  const [cleaningFeeIncome, setCleaningFeeIncome] = useState(0);
  const [kurtaxeIncome, setKurtaxeIncome] = useState(0);
  const [kurtaxeInputStr, setKurtaxeInputStr] = useState(''); // String-State für Input (erlaubt "0")
  const [payoutDate, setPayoutDate] = useState('');
  const [cleaningCash, setCleaningCash] = useState(booking?.cleaning_cash === 1);
  const [utilitiesCash, setUtilitiesCash] = useState(booking?.utilities_cash === 1);
  const [kurtaxeCash, setKurtaxeCash] = useState(booking?.kurtaxe_cash === 1);

  // Direct booking breakdown
  const [directWater, setDirectWater] = useState('');
  const [directElectricity, setDirectElectricity] = useState('');
  const [directMuell, setDirectMuell] = useState('');
  const [directHolz, setDirectHolz] = useState('');
  const [directKurtaxe, setDirectKurtaxe] = useState('');
  const [directAnzahlung, setDirectAnzahlung] = useState('');
  const [directRestzahlung, setDirectRestzahlung] = useState('');

  // Positions
  const [bookingPositions, setBookingPositions] = useState<BookingPosition[]>([]);

  // ── Step 4: Extras & Status ──
  const [komfortpaketEnabled, setKomfortpaketEnabled] = useState(false);
  const [komfortpaketPersons, setKomfortpaketPersons] = useState(0);
  const [komfortpaketGuestPaid, setKomfortpaketGuestPaid] = useState(false);
  const [depositAmount, setDepositAmount] = useState(booking?.deposit_amount || 0);
  const [depositPaid, setDepositPaid] = useState(booking?.deposit_paid === 1);
  const [securityDeposit, setSecurityDeposit] = useState(booking?.security_deposit || 0);
  const [finalPaymentPaid, setFinalPaymentPaid] = useState(booking?.final_payment_paid === 1);
  const [status, setStatus] = useState(booking?.status || 'active');
  const [notes, setNotes] = useState(booking?.notes || '');

  // ── Pricing settings from DB ──
  const [pricingSettings, setPricingSettings] = useState<Record<string, unknown> | undefined>(
    undefined,
  );

  useEffect(() => {
    // Load pricing settings (kurtaxeRates etc.) from DB
    fetch('/api/admin/settings')
      .then((res) => res.json() as Promise<{ settings?: Record<string, string> }>)
      .then((data) => {
        if (data.settings) {
          let kurtaxeRates: Array<{ from: string; to: string; rate: number }> | undefined;
          if (data.settings.kurtaxe_rates) {
            try {
              kurtaxeRates = (
                JSON.parse(data.settings.kurtaxe_rates) as Array<{
                  from: string;
                  to: string;
                  rate: number;
                }>
              ).map((r) => ({ from: r.from, to: r.to, rate: r.rate }));
            } catch {
              /* ignore */
            }
          }
          setPricingSettings({
            kurtaxe: parseFloat(data.settings.kurtaxe_rate ?? '') || 2.7,
            kurtaxeRates,
            holz: parseFloat(data.settings.holz_rate ?? '') || 9,
            water: parseFloat(data.settings.water_rate ?? '') || 7,
            trash: parseFloat(data.settings.trash_rate ?? '') || 11,
            electricity: parseFloat(data.settings.electricity_rate ?? '') || 0.55,
            reinigung: parseFloat(data.settings.reinigung_rate ?? '') || 100,
          });
        }
      })
      .catch(() => {
        /* use defaults */
      });
  }, []);

  // ── Derived ──
  const platformType = getPlatformType(platform);
  const isPrivate = platformType === 'private';
  const hasDog = pets.toLowerCase().includes('hund');

  // Build granular private config
  const privateConfig: PrivateBookingConfig | undefined = isPrivate
    ? {
        miete_zero: privateMieteZero,
        nk_paid: privateNkPaid,
        kurtaxe_paid: privateKurtaxePaid,
        provision_charged: privateProvisionCharged,
      }
    : undefined;

  // ── Auto-set departure = arrival + 7 days (only when creating new booking) ──
  useEffect(() => {
    if (!arrivalDate || mode === 'edit') return;
    // Only auto-set if departure is empty or was previously auto-set
    if (departureDate && departureDate !== '') return;
    const arrival = new Date(arrivalDate);
    if (isNaN(arrival.getTime())) return;
    const departure = new Date(arrival);
    departure.setDate(departure.getDate() + 7);
    const iso = `${departure.getFullYear()}-${(departure.getMonth() + 1).toString().padStart(2, '0')}-${departure.getDate().toString().padStart(2, '0')}`;
    setDepartureDate(iso);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivalDate, mode]);

  const nights = useMemo(() => {
    if (!arrivalDate || !departureDate) return 0;
    return Math.ceil(
      (new Date(departureDate).getTime() - new Date(arrivalDate).getTime()) / 86400000,
    );
  }, [arrivalDate, departureDate]);

  const season = arrivalDate ? getSeason(arrivalDate) : null;

  // ── Parse existing additional_costs on edit ──
  useEffect(() => {
    if (!booking?.additional_costs) return;
    try {
      const parsed = JSON.parse(booking.additional_costs);
      const r2 = (v: number) => Math.round(v * 100) / 100;
      if (parsed.payout_amount) setPayoutAmount(r2(parsed.payout_amount));
      if (parsed.guest_total_payment) setGuestTotalPayment(r2(parsed.guest_total_payment));
      if (parsed.platform_service_fee) setPlatformServiceFee(r2(parsed.platform_service_fee));
      if (parsed.payment_processing_fee) setPaymentProcessingFee(r2(parsed.payment_processing_fee));
      if (parsed.nebenkosten_income) setNebenkostenIncome(r2(parsed.nebenkosten_income));
      if (parsed.cleaning_fee_income) setCleaningFeeIncome(r2(parsed.cleaning_fee_income));
      if (parsed.kurtaxe_income !== undefined && parsed.kurtaxe_income !== null) {
        setKurtaxeIncome(r2(parsed.kurtaxe_income));
        setKurtaxeInputStr(r2(parsed.kurtaxe_income).toString());
      }
      if (parsed.payout_date) setPayoutDate(parsed.payout_date);
      if (parsed.komfortpaket) {
        setKomfortpaketEnabled(parsed.komfortpaket.enabled || false);
        setKomfortpaketPersons(parsed.komfortpaket.persons || 0);
        setKomfortpaketGuestPaid(parsed.komfortpaket.guestPaid || false);
      }
      if (parsed.direct_breakdown) {
        const db = parsed.direct_breakdown;
        if (db.water) setDirectWater(db.water.toString());
        if (db.electricity) setDirectElectricity(db.electricity.toString());
        if (db.muell) setDirectMuell(db.muell.toString());
        if (db.holz) setDirectHolz(db.holz.toString());
        if (db.kurtaxe) setDirectKurtaxe(db.kurtaxe.toString());
        if (db.anzahlung_bank) setDirectAnzahlung(db.anzahlung_bank.toString());
        if (db.restzahlung_vor_ort) setDirectRestzahlung(db.restzahlung_vor_ort.toString());
      }
    } catch {
      /* ignore */
    }
  }, [booking?.additional_costs]);

  // ── Breakdown-Felder → effektive NK/Kurtaxe/Reinigung-Einnahmen (für Feratel, FeWo & Direkt) ──
  const breakdownNkTotal = useMemo(
    () =>
      (parseFloat(directElectricity) || 0) +
      (parseFloat(directWater) || 0) +
      (parseFloat(directMuell) || 0) +
      (parseFloat(directHolz) || 0),
    [directElectricity, directWater, directMuell, directHolz],
  );
  const breakdownKurtaxe = useMemo(() => parseFloat(directKurtaxe) || 0, [directKurtaxe]);

  // Für Feratel/FeWo/Direkt: Breakdown-Werte als Einnahmen verwenden (wenn vorhanden)
  const hasBreakdown =
    platformType === 'feratel' || platformType === 'fewo' || platformType === 'direct';
  const effectiveNkIncome =
    hasBreakdown && breakdownNkTotal > 0 ? breakdownNkTotal : nebenkostenIncome;
  const effectiveKurtaxeIncome =
    hasBreakdown && breakdownKurtaxe > 0 ? breakdownKurtaxe : kurtaxeIncome;

  // ── Finance calculations ──
  const platformFeesObj: PlatformFees = useMemo(
    () => ({
      payout_amount:
        payoutAmount ||
        rentalPrice + effectiveNkIncome + cleaningFeeIncome + effectiveKurtaxeIncome,
      guest_total_payment: guestTotalPayment,
      platform_service_fee: platformServiceFee,
      nebenkosten_income: effectiveNkIncome,
      cleaning_fee_income: cleaningFeeIncome,
      payment_processing_fee: paymentProcessingFee,
      kurtaxe_income: effectiveKurtaxeIncome,
    }),
    [
      payoutAmount,
      guestTotalPayment,
      platformServiceFee,
      rentalPrice,
      effectiveNkIncome,
      cleaningFeeIncome,
      paymentProcessingFee,
      effectiveKurtaxeIncome,
    ],
  );

  const komfortpaketObj: KomfortpaketData | undefined = useMemo(
    () =>
      komfortpaketEnabled
        ? {
            enabled: true,
            persons: komfortpaketPersons,
            guestPaid: komfortpaketGuestPaid,
            pricePerPerson: KOMFORTPAKET_DEFAULT_PRICE,
          }
        : undefined,
    [komfortpaketEnabled, komfortpaketPersons, komfortpaketGuestPaid],
  );

  const financeResult = useMemo(
    () =>
      calculateBookingFinances({
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
        isKurtaxeCash: kurtaxeCash,
        privateConfig,
        platformFees: platformFeesObj,
        komfortpaket: komfortpaketObj,
        pricingSettings,
      }),
    [
      arrivalDate,
      departureDate,
      adults,
      rentalPrice,
      platform,
      hasDog,
      isPrivate,
      cleaningCash,
      utilitiesCash,
      kurtaxeCash,
      privateConfig,
      platformFeesObj,
      komfortpaketObj,
      pricingSettings,
    ],
  );

  const {
    cleaningCost,
    kurtaxe,
    mieterlos,
    provision,
    gesamteinzahlung,
    gesamtbelastung,
    gesamtertrag,
    totalNkCosts,
    komfortpaketCosts,
    komfortpaketIncome,
  } = financeResult;

  // ── Position calculation context ──
  const posCalcContext: PositionCalcContext = useMemo(
    () => ({
      arrivalDate: arrivalDate || null,
      departureDate: departureDate || null,
      adults,
      children,
      childrenAges: childrenAges
        ? childrenAges
            .split(',')
            .map((a) => parseInt(a.trim()))
            .filter((a) => !isNaN(a))
        : [],
      hasDog,
      isPrivate,
      platform: platform || null,
    }),
    [arrivalDate, departureDate, adults, children, childrenAges, hasDog, isPrivate, platform],
  );

  // ── Validation ──
  const canProceedStep1 = !!platform;
  const canProceedStep2 = !!arrivalDate && !!departureDate && nights > 0;
  const canProceedStep3 = rentalPrice > 0 || payoutAmount > 0 || (isPrivate && privateMieteZero);
  const canProceedStep4 = true;

  const missingFields: string[] = [];
  if (!platform) missingFields.push('Plattform');
  if (!arrivalDate) missingFields.push('Anreise');
  if (!departureDate) missingFields.push('Abreise');
  if (rentalPrice <= 0 && payoutAmount <= 0 && !(isPrivate && privateMieteZero))
    missingFields.push('Mietpreis oder Auszahlung');

  // ── Navigation ──
  const goTo = (step: WizardStep) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (currentStep < 5) goTo((currentStep + 1) as WizardStep);
  };

  const prevStep = () => {
    if (currentStep > 1) goTo((currentStep - 1) as WizardStep);
  };

  // ── Build additional_costs JSON ──
  const buildAdditionalCosts = () => {
    const usesBreakdown =
      platformType === 'direct' || platformType === 'feratel' || platformType === 'fewo';
    const directBreakdown = usesBreakdown
      ? {
          water: parseFloat(directWater) || undefined,
          electricity: parseFloat(directElectricity) || undefined,
          muell: parseFloat(directMuell) || undefined,
          holz: parseFloat(directHolz) || undefined,
          kurtaxe: parseFloat(directKurtaxe) || undefined,
          ...(platformType === 'direct'
            ? {
                anzahlung_bank: parseFloat(directAnzahlung) || undefined,
                restzahlung_vor_ort: parseFloat(directRestzahlung) || undefined,
              }
            : {}),
        }
      : undefined;

    const hasDirectBreakdown =
      directBreakdown && Object.values(directBreakdown).some((v) => v !== undefined);

    return {
      payout_amount: payoutAmount || gesamteinzahlung || undefined,
      guest_total_payment: guestTotalPayment || undefined,
      platform_service_fee: platformServiceFee || undefined,
      nebenkosten_income: effectiveNkIncome || undefined,
      cleaning_fee_income: cleaningFeeIncome || undefined,
      // Booking.com/Airbnb: Kurtaxe immer speichern (auch 0), da manuell eingegeben
      kurtaxe_income:
        platformType === 'booking' || platformType === 'airbnb'
          ? effectiveKurtaxeIncome
          : effectiveKurtaxeIncome || undefined,
      payment_processing_fee: paymentProcessingFee || undefined,
      payout_date: payoutDate || undefined,
      komfortpaket: komfortpaketEnabled
        ? {
            enabled: true,
            persons: komfortpaketPersons,
            guestPaid: komfortpaketGuestPaid,
            pricePerPerson: KOMFORTPAKET_DEFAULT_PRICE,
          }
        : undefined,
      direct_breakdown: hasDirectBreakdown ? directBreakdown : undefined,
    };
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const additionalCosts = buildAdditionalCosts();

    const bookingData: Partial<Booking> & { id: number } = {
      id: booking?.id || 0,
      platform: platform || null,
      booking_number: bookingNumber || null,
      arrival_date: arrivalDate || null,
      departure_date: departureDate || null,
      adults,
      children,
      children_ages: children > 0 && childrenAges ? childrenAges : null,
      pets: pets || null,
      rental_price: isPrivate && privateMieteZero ? 0 : rentalPrice,
      deposit_amount: depositAmount,
      deposit_paid: depositPaid ? 1 : 0,
      final_payment_paid: finalPaymentPaid ? 1 : 0,
      security_deposit: securityDeposit,
      additional_costs: JSON.stringify(additionalCosts),
      status,
      notes: notes || null,
      cleaning_cash: cleaningCash ? 1 : 0,
      utilities_cash: utilitiesCash ? 1 : 0,
      kurtaxe_cash: kurtaxeCash ? 1 : 0,
      is_private: isPrivate ? 1 : 0,
      private_config: isPrivate ? JSON.stringify(privateConfig) : null,
    };

    // If legacy onSave handler is provided, delegate to it
    if (onSave) {
      onSave(bookingData);
      return;
    }

    // Otherwise, handle API calls directly
    setInternalSubmitting(true);
    try {
      const isNew = !bookingData.id || bookingData.id === 0;
      const response = await fetch('/api/admin/bookings', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isNew ? { ...bookingData, guest_id: guestId } : bookingData),
      });
      const data = (await response.json()) as { booking?: Booking; error?: string };

      if (data.error) {
        onError?.(data.error);
        return;
      }

      // Save positions for new bookings (with error handling)
      if (isNew && data.booking?.id && bookingPositions.length > 0) {
        const positionErrors: string[] = [];
        for (const pos of bookingPositions) {
          try {
            const posRes = await fetch('/api/admin/booking-positions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...pos, booking_id: data.booking.id }),
            });
            if (!posRes.ok) {
              const posData = await posRes.json().catch(() => ({ error: 'Unbekannt' }));
              positionErrors.push(
                `"${pos.name}": ${(posData as { error?: string }).error || posRes.statusText}`,
              );
            }
          } catch (e) {
            positionErrors.push(
              `"${pos.name}": ${e instanceof Error ? e.message : 'Netzwerkfehler'}`,
            );
          }
        }
        if (positionErrors.length > 0) {
          onError?.(
            `Buchung erstellt, aber ${positionErrors.length} Position(en) fehlgeschlagen:\n${positionErrors.join('\n')}`,
          );
          if (isNew) onBookingCreated?.();
          onClose();
          return;
        }
      }

      onSuccess?.(isNew ? 'Buchung erfolgreich erstellt' : 'Buchung aktualisiert');
      if (isNew) onBookingCreated?.();
      else onBookingUpdated?.();
      onClose();
    } catch (err) {
      onError?.(`Fehler: ${err instanceof Error ? err.message : 'Unbekannt'}`);
    } finally {
      setInternalSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // ============================================================================
  // STEP 1: PLATFORM
  // ============================================================================
  const StepPlatform = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Plattform wählen
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {WIZARD_PLATFORMS.map((wp) => {
            const isSelected = platform === wp.dbValue;
            return (
              <button
                key={wp.dbValue}
                type="button"
                onClick={() => setPlatform(wp.dbValue)}
                className={`
                  p-3 rounded-xl border-2 transition-all text-left
                  ${
                    isSelected
                      ? 'border-[var(--admin-accent,#16a34a)] bg-green-50 ring-1 ring-green-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={`p-2 rounded-lg ${isSelected ? wp.config.solidBg : 'bg-gray-100'} text-white`}
                  >
                    {wp.icon}
                  </div>
                  <span
                    className={`text-xs font-medium ${isSelected ? 'text-green-800' : 'text-gray-600'}`}
                  >
                    {wp.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Private booking config */}
      {isPrivate && (
        <div className="animate-fade-in p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Privatbuchung – Details</span>
          </div>
          <p className="text-xs text-purple-600 mb-3">
            Was bedeutet &quot;privat&quot; für diese Buchung?
          </p>

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={privateMieteZero}
              onChange={(e) => setPrivateMieteZero(e.target.checked)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm text-gray-800 font-medium">Miete = 0 EUR</span>
              <p className="text-[10px] text-gray-500">Keine Mieteinnahme für diese Buchung</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={privateNkPaid}
              onChange={(e) => setPrivateNkPaid(e.target.checked)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm text-gray-800 font-medium">Nebenkosten bezahlt</span>
              <p className="text-[10px] text-gray-500">
                NK in kalkulatorischer Höhe werden berechnet
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={privateKurtaxePaid}
              onChange={(e) => setPrivateKurtaxePaid(e.target.checked)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm text-gray-800 font-medium">Kurtaxe bezahlt</span>
              <p className="text-[10px] text-gray-500">Kurtaxe wird für diese Buchung berechnet</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={privateProvisionCharged}
              onChange={(e) => setPrivateProvisionCharged(e.target.checked)}
              className="w-4 h-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <div>
              <span className="text-sm text-gray-800 font-medium">Provision berechnen</span>
              <p className="text-[10px] text-gray-500">10% Provision wird berechnet</p>
            </div>
          </label>
        </div>
      )}

      {platform && (
        <div className="animate-fade-in">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Buchungsnummer (optional)
          </label>
          <input
            type="text"
            value={bookingNumber}
            onChange={(e) => setBookingNumber(e.target.value)}
            placeholder="z.B. HA-1234567"
            className={`w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl ${focusClasses} transition-colors`}
          />
        </div>
      )}
    </div>
  );

  // ============================================================================
  // STEP 2: STAY & GUESTS
  // ============================================================================
  const StepStayGuests = () => (
    <div className="space-y-5">
      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Anreise *
          </label>
          <GermanDateInput
            value={arrivalDate}
            onChange={setArrivalDate}
            required
            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses} transition-colors`}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            <Calendar className="w-3.5 h-3.5 inline mr-1" />
            Abreise *
          </label>
          <GermanDateInput
            value={departureDate}
            onChange={setDepartureDate}
            required
            min={arrivalDate}
            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses} transition-colors`}
          />
        </div>
      </div>

      {/* Nights & Season badge */}
      {nights > 0 && (
        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 bg-gray-50 border border-gray-100 py-2.5 px-4 rounded-xl">
          <span className="font-semibold text-gray-700">{nights} Nächte</span>
          <span className="text-gray-300">|</span>
          <span>
            {new Date(arrivalDate).toLocaleDateString('de-DE', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            })}{' '}
            —{' '}
            {new Date(departureDate).toLocaleDateString('de-DE', {
              weekday: 'short',
              day: '2-digit',
              month: 'short',
            })}
          </span>
          {season && (
            <>
              <span className="text-gray-300">|</span>
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${season === 'Sommer' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}
              >
                {season}
              </span>
            </>
          )}
        </div>
      )}

      {/* Private booking info */}
      {isPrivate && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-700">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="font-medium">Privatbuchung</span>
          </div>
          <div className="text-xs text-purple-600 space-y-0.5 ml-6">
            <p>Miete: {privateMieteZero ? '0 EUR' : 'individuell'}</p>
            <p>NK: {privateNkPaid ? 'ja (kalk. Höhe)' : 'nein'}</p>
            <p>Kurtaxe: {privateKurtaxePaid ? 'ja' : 'nein'}</p>
            <p>Provision: {privateProvisionCharged ? 'ja (10%)' : 'nein'}</p>
          </div>
        </div>
      )}

      {/* Adults & Children */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            <Users className="w-3.5 h-3.5 inline mr-1" />
            Erwachsene
          </label>
          <NumberStepper value={adults} onChange={setAdults} min={1} max={10} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Kinder
          </label>
          <NumberStepper value={children} onChange={setChildren} min={0} max={10} />
        </div>
      </div>

      {/* Children ages */}
      {children > 0 && (
        <div className="animate-fade-in">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Kinderalter (kommasepariert)
          </label>
          <input
            type="text"
            value={childrenAges}
            onChange={(e) => setChildrenAges(e.target.value)}
            placeholder="z.B. 4, 12"
            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
          />
          <p className="text-[10px] text-gray-400 mt-1">Relevant für Kurtaxe ab 16 Jahren</p>
        </div>
      )}

      {/* Pet toggle */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-10 h-5 rounded-full transition-colors ${petsEnabled ? 'bg-[var(--admin-accent,#16a34a)]' : 'bg-gray-200'}`}
            onClick={() => {
              setPetsEnabled(!petsEnabled);
              if (petsEnabled) setPets('');
            }}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${petsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-sm text-gray-700 flex items-center gap-1.5">
            <Dog className="w-4 h-4 text-gray-400" />
            Haustier
          </span>
        </label>
        {petsEnabled && (
          <input
            type="text"
            value={pets}
            onChange={(e) => setPets(e.target.value)}
            placeholder="z.B. 1 Hund"
            className={`mt-2 w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
          />
        )}
      </div>
    </div>
  );

  // ============================================================================
  // STEP 3: FINANCES
  // ============================================================================
  const StepFinances = () => {
    const pt = platformType;

    return (
      <div className="space-y-5">
        {/* ─── Booking.com: 3-Felder-Modell (Gesamtpreis, Kommission, Kurtaxe bar, Datum) ─── */}
        {pt === 'booking' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                Booking.com Zahlungsdetails
              </p>

              {/* ① Gesamtpreis */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  ① Gesamtpreis (lt. Booking.com)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={guestTotalPayment || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGuestTotalPayment(val);
                      // Auto-berechne Payout: Gesamtpreis - Kommission - Kurtaxe(bar)
                      if (val > 0 && platformServiceFee > 0) {
                        const payout = val - platformServiceFee - kurtaxeIncome;
                        setPayoutAmount(payout);
                        setRentalPrice(payout);
                      }
                    }}
                    step="0.01"
                    placeholder="z.B. 1241.92"
                    className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    €
                  </span>
                </div>
              </div>

              {/* ② Kommission & Gebühren */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  ② Kommission und Gebühren
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={platformServiceFee || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPlatformServiceFee(val);
                      // Auto-berechne Payout: Gesamtpreis - Kommission - Kurtaxe(bar)
                      if (guestTotalPayment > 0 && val > 0) {
                        const payout = guestTotalPayment - val - kurtaxeIncome;
                        setPayoutAmount(payout);
                        setRentalPrice(payout);
                      }
                    }}
                    step="0.01"
                    placeholder="z.B. 253.64"
                    className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    €
                  </span>
                </div>
              </div>

              {/* ③ Kurtaxe (bar) — String-basiertes Input, damit "0" als Wert funktioniert */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  ③ Kurtaxe / Übernachtungssteuer (bar)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={kurtaxeInputStr}
                    onChange={(e) => {
                      setKurtaxeInputStr(e.target.value);
                      const val = parseFloat(e.target.value) || 0;
                      setKurtaxeIncome(val);
                      // Auto-berechne Payout: Gesamtpreis - Kommission - Kurtaxe(bar)
                      if (guestTotalPayment > 0 && platformServiceFee > 0) {
                        const payout = guestTotalPayment - platformServiceFee - val;
                        setPayoutAmount(payout);
                        setRentalPrice(payout);
                      }
                    }}
                    placeholder="z.B. 56.70 (0 wenn nicht bar)"
                    className={`w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    €
                  </span>
                </div>
              </div>

              {/* Berechneter Payout (read-only) */}
              {guestTotalPayment > 0 && platformServiceFee > 0 && (
                <div className="p-3 bg-white rounded-lg border border-blue-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">= Auszahlung (berechnet):</span>
                    <span className="text-lg font-bold text-blue-700 font-mono">
                      {(guestTotalPayment - platformServiceFee - kurtaxeIncome).toLocaleString(
                        'de-DE',
                        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                      )}{' '}
                      €
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    ① {guestTotalPayment.toLocaleString('de-DE', { minimumFractionDigits: 2 })} − ②{' '}
                    {platformServiceFee.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                    {kurtaxeIncome > 0
                      ? ` − ③ ${kurtaxeIncome.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`
                      : ''}
                  </p>
                </div>
              )}

              {/* ④ Auszahlungsdatum */}
              <div className="max-w-[200px]">
                <label className="block text-xs text-gray-600 mb-1">
                  ④ Auszahlungsdatum (optional)
                </label>
                <GermanDateInput
                  value={payoutDate}
                  onChange={setPayoutDate}
                  className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Airbnb: Payout + Gastzahlung → auto-berechne Service-Fee ─── */}
        {pt === 'airbnb' && (
          <div className="space-y-4">
            <div className="p-4 bg-pink-50 rounded-xl border border-pink-200 space-y-4">
              <p className="text-xs font-medium text-pink-600 uppercase tracking-wide">
                Airbnb Zahlungsdetails
              </p>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Auszahlungsbetrag (Payout)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={payoutAmount || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setPayoutAmount(val);
                      setRentalPrice(val);
                      // Auto-berechne Service-Fee wenn Gastzahlung bekannt
                      if (guestTotalPayment > 0 && val > 0) {
                        setPlatformServiceFee(guestTotalPayment - val);
                      }
                    }}
                    step="0.01"
                    placeholder="z.B. 1246.56"
                    className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    €
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Gastzahlung gesamt</label>
                  <input
                    type="number"
                    value={guestTotalPayment || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setGuestTotalPayment(val);
                      // Auto-berechne Service-Fee
                      if (payoutAmount > 0 && val > 0) {
                        setPlatformServiceFee(val - payoutAmount);
                      }
                    }}
                    step="0.01"
                    placeholder="optional"
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Auszahlungsdatum</label>
                  <GermanDateInput
                    value={payoutDate}
                    onChange={setPayoutDate}
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                </div>
              </div>

              {/* Berechnete Service-Fee */}
              {guestTotalPayment > 0 && payoutAmount > 0 && (
                <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-pink-100 text-sm">
                  <span className="text-gray-500">Airbnb Service-Fee (berechnet):</span>
                  <span className="font-medium text-pink-700 font-mono">
                    {(guestTotalPayment - payoutAmount).toLocaleString('de-DE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── FeWo / VRBO ─── */}
        {pt === 'fewo' && (
          <div className="space-y-4">
            {/* Zahlungsübersicht wie in der FeWo-Rechnung */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                FeWo Zahlungsdetails (lt. Rechnung)
              </p>

              {/* Raten / Mietpreis */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Raten pro Nacht (Miete)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={rentalPrice || ''}
                    onChange={(e) => setRentalPrice(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    placeholder="z.B. 910.00"
                    className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    €
                  </span>
                </div>
              </div>

              {/* NK-Aufschlüsselung */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-3">
                <span className="text-sm font-medium text-blue-800">
                  Gebühren (lt. FeWo-Rechnung)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Strom',
                      value: directElectricity,
                      set: setDirectElectricity,
                      ph: '112.00',
                    },
                    { label: 'Wasser', value: directWater, set: setDirectWater, ph: '28.00' },
                    {
                      label: 'Kurtaxe (Verwaltung)',
                      value: directKurtaxe,
                      set: setDirectKurtaxe,
                      ph: '86.80',
                    },
                    {
                      label: 'Heizkosten (Holz)',
                      value: directHolz,
                      set: setDirectHolz,
                      ph: '63.00',
                    },
                  ].map((f) => (
                    <div key={f.label}>
                      <label className="block text-xs text-gray-600 mb-1">{f.label}</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder={f.ph}
                        className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${focusClasses}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Reinigungsgebühr</label>
                    <input
                      type="number"
                      value={cleaningFeeIncome || ''}
                      onChange={(e) => setCleaningFeeIncome(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      placeholder="100.00"
                      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${focusClasses}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Servicegebühr Gäste</label>
                    <input
                      type="number"
                      value={platformServiceFee || ''}
                      onChange={(e) => setPlatformServiceFee(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      placeholder="149.94"
                      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${focusClasses}`}
                    />
                  </div>
                </div>
              </div>

              {/* Auszahlung & Gebühren */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Gesamtauszahlung (Payout)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={payoutAmount || ''}
                      onChange={(e) => setPayoutAmount(parseFloat(e.target.value) || 0)}
                      step="0.01"
                      placeholder="1292.71"
                      className={`w-full px-3 py-2 text-sm font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      €
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Zahlungsbearbeitungsgebühr
                  </label>
                  <input
                    type="number"
                    value={paymentProcessingFee || ''}
                    onChange={(e) => setPaymentProcessingFee(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    placeholder="7.09"
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Direct (E-Mail, WhatsApp, Telefon) ─── */}
        {pt === 'direct' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Mietpreis *
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rentalPrice || ''}
                  onChange={(e) => setRentalPrice(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  placeholder="z.B. 994.00"
                  className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                  €
                </span>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-200 space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">NK-Aufschlüsselung</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Strom',
                    value: directElectricity,
                    set: setDirectElectricity,
                    ph: '112.00',
                  },
                  { label: 'Wasser', value: directWater, set: setDirectWater, ph: '28.00' },
                  { label: 'Müll', value: directMuell, set: setDirectMuell, ph: '11.20' },
                  { label: 'Holz', value: directHolz, set: setDirectHolz, ph: '63.00' },
                  { label: 'Kurtaxe', value: directKurtaxe, set: setDirectKurtaxe, ph: '44.80' },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-xs text-gray-600 mb-1">{f.label}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.ph}
                      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${focusClasses}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Zahlungsaufteilung
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Anzahlung (Überweisung)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={directAnzahlung}
                    onChange={(e) => setDirectAnzahlung(e.target.value)}
                    placeholder="bspw. 327,05"
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Restzahlung vor Ort</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={directRestzahlung}
                    onChange={(e) => setDirectRestzahlung(e.target.value)}
                    placeholder="bspw. 1.025,95"
                    className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Feratel: rental price + NK breakdown (from Feratel statement) ─── */}
        {pt === 'feratel' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Gesamtpreis Erwachsene (Miete)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={rentalPrice || ''}
                  onChange={(e) => setRentalPrice(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  placeholder="z.B. 1085.00"
                  className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                  €
                </span>
              </div>
            </div>

            <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200 space-y-3">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-800">
                  Feratel-Aufschlüsselung (lt. Buchungsdetails)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Strom',
                    value: directElectricity,
                    set: setDirectElectricity,
                    ph: '112.00',
                  },
                  { label: 'Wasser', value: directWater, set: setDirectWater, ph: '42.00' },
                  { label: 'Müll', value: directMuell, set: setDirectMuell, ph: '11.20' },
                  { label: 'Holz', value: directHolz, set: setDirectHolz, ph: '63.00' },
                  { label: 'Kurtaxe', value: directKurtaxe, set: setDirectKurtaxe, ph: '75.60' },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-xs text-gray-600 mb-1">{f.label}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={f.value}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder={f.ph}
                      className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${focusClasses}`}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Reinigung</label>
                  <input
                    type="number"
                    value={cleaningFeeIncome || ''}
                    onChange={(e) => setCleaningFeeIncome(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    placeholder="100.00"
                    className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg ${focusClasses}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Privat: rental price only if miete_zero is false ─── */}
        {pt === 'private' && (
          <div className="space-y-3">
            {privateMieteZero ? (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm text-purple-700">
                <Lock className="w-4 h-4 inline mr-1.5" />
                Miete = 0 EUR (Privatbuchung)
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                  Mietpreis
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={rentalPrice || ''}
                    onChange={(e) => setRentalPrice(parseFloat(e.target.value) || 0)}
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-3 py-2.5 text-lg font-semibold font-mono border border-gray-200 rounded-xl ${focusClasses}`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                    €
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Cash payment toggles (when NK/costs are relevant) ─── */}
        {(!isPrivate || privateNkPaid || privateKurtaxePaid) && (
          <div className="p-3 border-2 border-dashed border-gray-200 rounded-xl space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
              Barzahlungen
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={cleaningCash}
                onChange={(e) => setCleaningCash(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Reinigung bar</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={utilitiesCash}
                onChange={(e) => setUtilitiesCash(e.target.checked)}
                className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">NK bar</span>
            </label>
            {!utilitiesCash && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={kurtaxeCash}
                  onChange={(e) => setKurtaxeCash(e.target.checked)}
                  className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Kurtaxe bar</span>
              </label>
            )}
          </div>
        )}

        {/* ─── Positions Editor ─── */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <div className="flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-500">
              Dynamische Positionen (Nebenkosten, Gebühren, etc.)
            </p>
          </div>
          <PositionsEditor
            positions={bookingPositions}
            onChange={setBookingPositions}
            calcContext={posCalcContext}
            payoutAmount={payoutAmount}
            rentalPrice={rentalPrice}
            financeSummary={{
              gesamteinzahlung,
              gesamtbelastung,
              mieterlos,
              provision,
              gesamtertrag,
            }}
          />
        </div>
      </div>
    );
  };

  // ============================================================================
  // STEP 4: EXTRAS & STATUS
  // ============================================================================
  const StepExtras = () => (
    <div className="space-y-5">
      {/* Komfortpaket */}
      {!isPrivate && (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Komfortpaket
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={`relative w-10 h-5 rounded-full transition-colors ${komfortpaketEnabled ? 'bg-[var(--admin-accent,#16a34a)]' : 'bg-gray-200'}`}
                onClick={() => {
                  const next = !komfortpaketEnabled;
                  setKomfortpaketEnabled(next);
                  if (next && komfortpaketPersons === 0) setKomfortpaketPersons(adults);
                }}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${komfortpaketEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </div>
            </label>
          </div>

          {komfortpaketEnabled && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center gap-4">
                <NumberStepper
                  value={komfortpaketPersons}
                  onChange={setKomfortpaketPersons}
                  min={1}
                  max={10}
                  label="Personen"
                />
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
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                {komfortpaketPersons} × {KOMFORTPAKET_DEFAULT_PRICE} € ={' '}
                <strong>{formatCurrency(komfortpaketPersons * KOMFORTPAKET_DEFAULT_PRICE)}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Deposit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Anzahlung (€)
          </label>
          <input
            type="number"
            value={depositAmount || ''}
            onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
            step="0.01"
            className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={depositPaid}
              onChange={(e) => setDepositPaid(e.target.checked)}
              className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Anzahlung bezahlt</span>
          </label>
        </div>
      </div>

      {/* Kaution */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Kaution (€)
        </label>
        <input
          type="number"
          value={securityDeposit || ''}
          onChange={(e) => setSecurityDeposit(parseFloat(e.target.value) || 0)}
          step="0.01"
          className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
        />
      </div>

      {/* Final payment */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={finalPaymentPaid}
          onChange={(e) => setFinalPaymentPaid(e.target.checked)}
          className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700">Restzahlung bezahlt</span>
      </label>

      {/* Status as segmented control */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Status
        </label>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden">
          {STATUS_OPTIONS.map((opt) => {
            const style = STATUS_STYLES[opt.value];
            const isActive = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  isActive
                    ? `${style?.bg ?? ''} ${style?.text ?? ''}`
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {style?.label ?? opt.value}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
          Notizen
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Optionale Anmerkungen..."
          className={`w-full px-3 py-2 text-sm border border-gray-200 rounded-xl ${focusClasses}`}
        />
      </div>
    </div>
  );

  // ============================================================================
  // STEP 5: SUMMARY
  // ============================================================================
  const StepSummary = () => {
    const pCfg = getPlatformConfigForDb(platform);

    return (
      <div className="space-y-5">
        {/* Validation warning */}
        {missingFields.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Pflichtfelder fehlen:</p>
              <p className="text-xs mt-0.5">{missingFields.join(', ')}</p>
            </div>
          </div>
        )}

        {/* Summary card */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Header with platform */}
          <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full ${pCfg.solidBg}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{platform || '-'}</p>
                  {bookingNumber && <p className="text-xs text-gray-400">#{bookingNumber}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 font-mono tabular-nums">
                  {formatCurrency(gesamtertrag)}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium">
                  Ertrag
                </p>
              </div>
            </div>
          </div>

          {/* Two-column details */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Left: Aufenthalt */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Aufenthalt</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Anreise</span>
                    <span className="font-medium text-green-700">
                      {arrivalDate ? new Date(arrivalDate).toLocaleDateString('de-DE') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Abreise</span>
                    <span className="font-medium text-red-600">
                      {departureDate ? new Date(departureDate).toLocaleDateString('de-DE') : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nächte</span>
                    <span className="font-medium">{nights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gäste</span>
                    <span className="font-medium">
                      {adults} Erw.{children > 0 ? `, ${children} Ki.` : ''}
                    </span>
                  </div>
                  {hasDog && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Haustier</span>
                      <span className="font-medium text-amber-600">{pets}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status]?.bg} ${STATUS_STYLES[status]?.text}`}
                    >
                      {STATUS_STYLES[status]?.label || status}
                    </span>
                  </div>
                  {isPrivate && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-[10px] font-semibold text-purple-500 uppercase mb-1">
                        Privat-Details
                      </p>
                      <div className="space-y-0.5 text-xs text-gray-600">
                        <p>Miete: {privateMieteZero ? '0 EUR' : formatCurrency(rentalPrice)}</p>
                        <p>NK: {privateNkPaid ? 'ja' : 'nein'}</p>
                        <p>Kurtaxe: {privateKurtaxePaid ? 'ja' : 'nein'}</p>
                        <p>Provision: {privateProvisionCharged ? 'ja' : 'nein'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Finanzen */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Finanzen</p>
                <div className="space-y-1.5 text-sm">
                  {rentalPrice > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Miete</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(rentalPrice)}
                      </span>
                    </div>
                  )}
                  {payoutAmount > 0 && payoutAmount !== rentalPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Auszahlung</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(payoutAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5">
                    <span className="text-gray-500">Einnahmen</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(gesamteinzahlung)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kosten</span>
                    <span className="font-semibold text-red-500">
                      −{formatCurrency(gesamtbelastung)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Provision</span>
                    <span className="text-red-500">−{formatCurrency(provision)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1.5 font-semibold">
                    <span>Ertrag</span>
                    <span className={gesamtertrag >= 0 ? 'text-blue-600' : 'text-red-600'}>
                      {formatCurrency(gesamtertrag)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Positions summary */}
            {bookingPositions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Positionen ({bookingPositions.length})
                </p>
                <div className="space-y-1">
                  {bookingPositions.map((pos, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600">{pos.name || 'Position'}</span>
                      <span
                        className={`font-mono tabular-nums ${pos.type === 'expense' ? 'text-red-500' : 'text-green-600'}`}
                      >
                        {pos.type === 'expense' ? '−' : '+'}
                        {formatCurrency(pos.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Notizen</p>
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // STEPPER
  // ============================================================================
  const STEP_LABELS = ['Plattform', 'Aufenthalt', 'Finanzen', 'Extras', 'Übersicht'];

  const Stepper = () => (
    <div className="flex items-center justify-between mb-6 px-2">
      {[1, 2, 3, 4, 5].map((step, idx) => {
        const isActive = currentStep === step;
        const isCompleted = currentStep > step;
        const canClick =
          isCompleted ||
          step === 1 ||
          (step === 2 && canProceedStep1) ||
          (step === 3 && canProceedStep1 && canProceedStep2) ||
          (step === 4 && canProceedStep1 && canProceedStep2) ||
          (step === 5 && canProceedStep1 && canProceedStep2);

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => canClick && goTo(step as WizardStep)}
              disabled={!canClick}
              className={`flex items-center gap-1.5 transition-all ${!canClick ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div
                className={`
                w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0
                ${
                  isActive
                    ? 'border-2 border-[var(--admin-accent,#16a34a)] text-[var(--admin-accent,#16a34a)] bg-white'
                    : isCompleted
                      ? 'bg-[var(--admin-accent,#16a34a)] text-white'
                      : 'bg-gray-100 text-gray-400'
                }
              `}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-gray-900' : isCompleted ? 'text-[var(--admin-accent,#16a34a)]' : 'text-gray-400'}`}
              >
                {STEP_LABELS[step - 1]}
              </span>
            </button>
            {step < 5 && (
              <div
                className={`flex-1 h-px mx-2 ${isCompleted ? 'bg-[var(--admin-accent,#16a34a)]' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================
  const canProceedCurrent =
    currentStep === 1
      ? canProceedStep1
      : currentStep === 2
        ? canProceedStep2
        : currentStep === 3
          ? canProceedStep3
          : currentStep === 4
            ? canProceedStep4
            : true;

  return (
    <div
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ fontFamily: "'Aptos', 'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <div className="bg-white rounded-xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEdit ? 'Buchung bearbeiten' : 'Neue Buchung'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {guestName} — Schritt {currentStep} von 5
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {Stepper()}

          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {currentStep === 1 && StepPlatform()}
              {currentStep === 2 && StepStayGuests()}
              {currentStep === 3 && StepFinances()}
              {currentStep === 4 && StepExtras()}
              {currentStep === 5 && StepSummary()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Abbrechen
            </button>
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceedCurrent}
              className="px-5 py-2 text-sm bg-[var(--admin-accent,#16a34a)] text-white rounded-lg hover:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 font-medium transition-all"
            >
              Weiter
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || missingFields.length > 0}
              className="px-5 py-2 text-sm bg-[var(--admin-accent,#16a34a)] text-white rounded-lg hover:brightness-95 disabled:opacity-40 flex items-center gap-1.5 font-medium transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? 'Speichern...' : 'Erstellen...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? 'Änderungen speichern' : 'Buchung anlegen'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
