'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Booking, ScreenshotAnalysisResponse } from '../types';
import {
  calculateBookingFinances,
  type PlatformFees,
  type KomfortpaketData,
  KOMFORTPAKET_DEFAULT_PRICE,
} from '@/lib/utils/financeCalculations';
import { getPlatformType } from './platformConfig';

interface UseBookingFormOptions {
  booking: Booking;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export function useBookingForm({ booking, onSuccess, onError }: UseBookingFormOptions) {
  // === Wizard State ===
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

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

  // === Navigation ===
  const canProceedStep1 = !!(platform && arrivalDate && departureDate);
  const canProceedStep2 = rentalPrice > 0 || payoutAmount > 0;

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep((currentStep + 1) as 1 | 2 | 3);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((currentStep - 1) as 1 | 2 | 3);
  };

  // === Build submit data ===
  const buildSubmitData = () => {
    const additionalCosts = {
      payout_amount: payoutAmount || financeResult.gesamteinzahlung,
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

    return { bookingData, uploadedFile: uploadedFile || undefined, guestUpdates };
  };

  return {
    // Step navigation
    currentStep,
    setCurrentStep,
    canProceedStep1,
    canProceedStep2,
    nextStep,
    prevStep,
    // Step 1 state
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
    platformType,
    // Step 2 state
    rentalPrice,
    setRentalPrice,
    payoutAmount,
    setPayoutAmount,
    guestTotalPayment,
    guestTotalStr,
    setGuestTotalStr,
    serviceFeeStr,
    setServiceFeeStr,
    processingFeeStr,
    setProcessingFeeStr,
    platformServiceFee,
    nebenkostenIncome,
    setNebenkostenIncome,
    cleaningFeeIncome,
    setCleaningFeeIncome,
    paymentProcessingFee,
    setPaymentProcessingFee,
    cleaningCash,
    setCleaningCash,
    utilitiesCash,
    setUtilitiesCash,
    showBookingFees,
    setShowBookingFees,
    // Komfortpaket
    komfortpaketEnabled,
    setKomfortpaketEnabled,
    komfortpaketPersons,
    setKomfortpaketPersons,
    komfortpaketGuestPaid,
    setKomfortpaketGuestPaid,
    komfortpaketPricePerPerson,
    setKomfortpaketPricePerPerson,
    komfortpaketPriceStr,
    setKomfortpaketPriceStr,
    // Step 3 state
    depositAmount,
    setDepositAmount,
    depositPaid,
    setDepositPaid,
    finalPaymentPaid,
    setFinalPaymentPaid,
    securityDeposit,
    setSecurityDeposit,
    status,
    setStatus,
    notes,
    setNotes,
    // Upload
    isAnalyzing,
    fileInputRef,
    extractedPayoutDate,
    setExtractedPayoutDate,
    analyzeFile,
    // Finance results
    financeResult,
    hasDog,
    isPrivate,
    syncFeeValues,
    // Submit
    buildSubmitData,
  };
}
