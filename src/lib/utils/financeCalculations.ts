/**
 * ============================================================================
 * ZENTRALE FINANZBERECHNUNGEN - EINZIGE BERECHNUNGSEINHEIT
 * ============================================================================
 *
 * WICHTIG: Alle Finanzberechnungen MÜSSEN hier stattfinden!
 *
 * Die Komponenten (GuestBookingsTab, BookingDetailPopup, EditBookingModal,
 * FinancePrintView, etc.) dürfen KEINE eigenen Berechnungen durchführen.
 * Sie rufen nur die Funktionen aus dieser Datei auf und zeigen die Ergebnisse an.
 *
 * Bei Änderungen an der Berechnungslogik: NUR HIER ändern!
 * ============================================================================
 */

import { calculateUtilityCostsForBooking, type BookingCostResult } from '@/components/admin/utility-costs/calculations';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PlatformFees {
  payout_amount?: number;
  guest_total_payment?: number;
  platform_service_fee?: number;
  payment_processing_fee?: number;
  nebenkosten_income?: number;
  cleaning_fee_income?: number;
  kurtaxe_income?: number;
}

// Komfortpaket: Handtücher, Bettwäsche, etc.
export interface KomfortpaketData {
  enabled: boolean;           // Komfortpaket gewünscht?
  persons: number;            // Für wie viele Personen
  guestPaid: boolean;         // Hat der Gast bezahlt?
  pricePerPerson: number;     // Preis pro Person (Standard: 25€)
  paidAmount?: number;        // Optional: tatsächlich gezahlter Betrag
}

// Konstanten für Komfortpaket
export const KOMFORTPAKET_COST_PER_PERSON = 16;  // Kosten pro Person
export const KOMFORTPAKET_DEFAULT_PRICE = 25;    // Standard-Preis für Gast

export interface MieteCalculationParams {
  // Plattform-Daten
  platformFees: PlatformFees;
  rentalPrice: number;

  // Plattform-Typ
  isBookingCom: boolean;
  isAirbnb: boolean;

  // Bar-Bezahlung Flags
  isCleaningCash: boolean;
  isUtilitiesCash: boolean;

  // Kalkulatorische Kosten (für Booking.com/Airbnb)
  calculatedCosts?: number;
}

export interface MieteCalculationResult {
  miete: number;
  nkEinnahmen: number;
  reinigungEinnahmen: number;
  gesamtauszahlung: number;
  // Felder für Mieterlös-basierte Provisionsberechnung
  // basisMiete = tatsächliche Miete (rentalPrice aus FeWo/Buchung)
  // mieterlos = Mieterlös für Provisionsberechnung:
  //   - Standard: basisMiete - anteilige Zahlungsgebühren
  //   - Booking.com: basisMiete - anteilige Zahlungsgebühren - kalkulatorische NK - Reinigung
  //     (Reinigung nur wenn nicht bar bezahlt)
  // provision = 10% vom mieterlos
  basisMiete: number;
  mieterlos: number;
  provision: number;
  paymentProcessingFee: number;
  mietAnteil: number;
  anteiligeMietgebuehr: number;
}

/**
 * Berechnet die kombinierten Plattform-Gebühren (Service + Payment Processing)
 * Zur Anzeige der Gesamtgebühren
 */
export function getTotalFees(platformFees: PlatformFees): number {
  return (platformFees.platform_service_fee || 0) + (platformFees.payment_processing_fee || 0);
}

/**
 * Gibt nur die Zahlungsbearbeitungsgebühren zurück
 * Diese werden für die Provisionsberechnung verwendet (Provision = 10% von Miete - Gebühren)
 * Die Servicegebühr für Gäste fließt NICHT in die Provision ein!
 */
export function getPaymentProcessingFees(platformFees: PlatformFees): number {
  return platformFees.payment_processing_fee || 0;
}

/**
 * Berechnet den effektiven Auszahlungsbetrag aus verschiedenen Quellen
 */
export function getEffectivePayoutAmount(platformFees: PlatformFees, fallbackRentalPrice: number): number {
  // Erste Priorität: direkter payout_amount
  if (platformFees.payout_amount && platformFees.payout_amount > 0) {
    return platformFees.payout_amount;
  }
  // Zweite Priorität: berechnet aus guest_total_payment - Gebühren (kombiniert)
  if (platformFees.guest_total_payment && platformFees.guest_total_payment > 0) {
    const fees = getTotalFees(platformFees);
    return platformFees.guest_total_payment - fees;
  }
  // Fallback: Mietpreis
  return fallbackRentalPrice;
}

/**
 * Zentrale Miete-Berechnung für alle Ansichten
 *
 * Logik:
 * - Booking.com/Airbnb: Miete = Auszahlung - kalkulatorische Kosten (NK sind inkludiert)
 * - Andere mit NK-Werten UND NK nicht bar: Miete = Auszahlung - NK - Reinigung
 * - Wenn NK/Reinigung bar bezahlt: nicht von Auszahlung abziehen
 * - Andere ohne Werte: Miete = Mietpreis
 */
export function calculateMiete(params: MieteCalculationParams): MieteCalculationResult {
  const {
    platformFees,
    rentalPrice,
    isBookingCom,
    isAirbnb,
    isCleaningCash,
    isUtilitiesCash,
    calculatedCosts = 0,
  } = params;

  const isPlatformWithIncludedCosts = isBookingCom || isAirbnb;
  const gesamtauszahlung = getEffectivePayoutAmount(platformFees, rentalPrice);

  const nkEinnahmen = platformFees.nebenkosten_income || 0;
  const reinigungEinnahmen = platformFees.cleaning_fee_income || 0;
  const hasActualIncomeValues = nkEinnahmen > 0 || reinigungEinnahmen > 0;

  let miete: number;

  if (isPlatformWithIncludedCosts) {
    // Booking.com/Airbnb: Miete = Auszahlung - kalkulatorische Kosten
    miete = gesamtauszahlung - calculatedCosts;
  } else if (hasActualIncomeValues && !isUtilitiesCash && !isCleaningCash) {
    // FeWo/E-Mail/etc.: NK und Reinigung in Plattform-Auszahlung enthalten
    miete = gesamtauszahlung - nkEinnahmen - reinigungEinnahmen;
  } else if (hasActualIncomeValues) {
    // NK und/oder Reinigung bar bezahlt - nur abziehen was tatsächlich in der Auszahlung ist
    const nkInPayout = isUtilitiesCash ? 0 : nkEinnahmen;
    const reinigungInPayout = isCleaningCash ? 0 : reinigungEinnahmen;

    // Wenn beides bar: Payout enthält nur Miete minus Zahlungsgebühren
    // Verwende rentalPrice als Miete (da payout_amount in DB evtl. falsch ist)
    if (nkInPayout === 0 && reinigungInPayout === 0) {
      miete = rentalPrice;
    } else {
      miete = gesamtauszahlung - nkInPayout - reinigungInPayout;
    }
  } else {
    // Fallback: Miete = Mietpreis
    miete = rentalPrice;
  }

  // === Mieterlös-basierte Provisionsberechnung ===
  // Zahlungsbearbeitungsgebühr
  const paymentProcessingFee = platformFees.payment_processing_fee || 0;

  // Basismiete = tatsächlicher Mietpreis aus FeWo/Buchung (nicht berechneter Wert)
  const basisMiete = rentalPrice;

  // Anteilige Zahlungsgebühren für Mietanteil (nur für Nicht-Booking.com)
  // mietAnteil = basisMiete / Gesamtauszahlung (z.B. 2400 / 2630,62 = 91,2%)
  const mietAnteil = gesamtauszahlung > 0 ? basisMiete / gesamtauszahlung : 1;
  const anteiligeMietgebuehr = paymentProcessingFee * mietAnteil;

  // Mieterlös-Berechnung (Basis für 10% Provision):
  let mieterlos: number;
  if (isBookingCom) {
    // Booking.com: Mieterlös = Netto-Auszahlung - kalkulatorische Kosten
    // (Was übrig bleibt nach Abzug von NK, Kurtaxe, Reinigung)
    mieterlos = gesamtauszahlung - calculatedCosts;
  } else {
    // Andere Plattformen: Mieterlös = Miete - anteilige Zahlungsgebühren
    mieterlos = basisMiete - anteiligeMietgebuehr;
  }

  // Provision: 10% von Mieterlös
  const provision = mieterlos * 0.1;

  return {
    miete,
    nkEinnahmen,
    reinigungEinnahmen,
    gesamtauszahlung,
    basisMiete,
    mieterlos,
    provision,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
  };
}

/**
 * @deprecated Verwende stattdessen `calculateMiete().provision` für die korrekte Mieterlös-basierte Berechnung.
 *
 * Diese Funktion berechnet Provision = 10% von (Miete - Gebühren).
 * Die neue korrekte Berechnung ist:
 * - Mieterlös = Miete - (Zahlungsgebühren × Mietanteil)
 * - Provision = 10% von Mieterlös
 */
export function calculateProvision(miete: number, fees: number = 0): number {
  const provisionBasis = miete - fees;
  return provisionBasis > 0 ? provisionBasis * 0.1 : 0;
}

/**
 * Berechnet Gesamteinzahlung = Miete + NK + Reinigung
 */
export function calculateGesamteinzahlung(miete: number, nkEinnahmen: number, reinigungEinnahmen: number): number {
  return miete + nkEinnahmen + reinigungEinnahmen;
}

/**
 * Berechnet kalkulierten Gesamtertrag = Gesamteinzahlung - Gesamtkosten
 */
export function calculateGesamtertrag(
  miete: number,
  nkEinnahmen: number,
  reinigungEinnahmen: number,
  calculatedCosts: number,
  provision: number
): number {
  const gesamteinzahlung = calculateGesamteinzahlung(miete, nkEinnahmen, reinigungEinnahmen);
  const gesamtkosten = calculatedCosts + provision;
  return gesamteinzahlung - gesamtkosten;
}

// ============================================================================
// ZENTRALE BUCHUNGSFINANZ-BERECHNUNG
// ============================================================================

/**
 * Eingabeparameter für die zentrale Buchungsberechnung
 */
export interface BookingFinanceParams {
  // Buchungsdaten
  arrivalDate: string | null;
  departureDate: string | null;
  adults: number;
  rentalPrice: number;

  // Plattform
  platform: string | null;

  // Flags
  hasDog: boolean;
  isPrivate: boolean;
  skipNk: boolean;  // no_nebenkosten Flag
  isCleaningCash: boolean;
  isUtilitiesCash: boolean;

  // Plattform-Gebühren (aus additional_costs JSON)
  platformFees: PlatformFees;

  // Komfortpaket (optional)
  komfortpaket?: KomfortpaketData;

  // Optional: Pricing Settings für Utility Costs
  pricingSettings?: unknown;
}

/**
 * Vollständiges Ergebnis der Buchungsfinanz-Berechnung
 * Alle Werte, die in den Komponenten angezeigt werden
 */
export interface BookingFinanceResult {
  // Utility Costs Berechnung
  utilityCosts: BookingCostResult | null;

  // Basis-Kosten (NK ohne Reinigung)
  baseCosts: number;
  kurtaxe: number;
  cleaningCost: number;

  // Kalkulatorische Kosten für Mieterlös (inkl. Reinigung wenn nicht bar)
  calculatedCostsForMieterlos: number;

  // Miete-Berechnung (aus calculateMiete)
  mieteResult: MieteCalculationResult;

  // Convenience-Referenzen auf mieteResult
  basisMiete: number;
  mieterlos: number;
  provision: number;
  nkEinnahmen: number;
  reinigungEinnahmen: number;
  paymentProcessingFee: number;
  mietAnteil: number;
  anteiligeMietgebuehr: number;
  gesamtauszahlung: number;

  // Einzahlungen
  barNk: number;  // NK wenn bar bezahlt
  barReinigung: number;  // Reinigung wenn bar bezahlt
  gesamteinzahlung: number;  // Miete + NK + Reinigung + Bar-Zahlungen

  // Kosten
  totalNkCosts: number;  // baseCosts + kurtaxe (ohne Reinigung)
  gesamtkosten: number;  // NK + Kurtaxe + Reinigung + Provision

  // Ertrag
  gesamtertrag: number;

  // Plattform-Flags
  isBookingCom: boolean;
  isAirbnb: boolean;
  isPlatformWithIncludedCosts: boolean;

  // Komfortpaket
  komfortpaketCosts: number;    // Kosten: persons × 16€
  komfortpaketIncome: number;   // Einnahmen: persons × pricePerPerson (wenn bezahlt)
  komfortpaketEnabled: boolean; // Aktiviert?
}

/**
 * ZENTRALE BERECHNUNGSFUNKTION für alle Buchungsfinanzen
 *
 * Diese Funktion führt ALLE Berechnungen durch, die für die Anzeige
 * in den verschiedenen Komponenten benötigt werden.
 *
 * Die Komponenten rufen nur diese Funktion auf und zeigen die Ergebnisse an.
 * KEINE Berechnungen in den Komponenten!
 */
export function calculateBookingFinances(params: BookingFinanceParams): BookingFinanceResult {
  const {
    arrivalDate,
    departureDate,
    adults,
    rentalPrice,
    platform,
    hasDog,
    isPrivate,
    skipNk,
    isCleaningCash,
    isUtilitiesCash,
    platformFees,
    komfortpaket,
    pricingSettings,
  } = params;

  // === Plattform-Erkennung ===
  const isBookingCom = platform?.toLowerCase() === 'booking.com';
  const isAirbnb = platform?.toLowerCase() === 'airbnb';
  const isPlatformWithIncludedCosts = isBookingCom || isAirbnb;

  // === Komfortpaket berechnen ===
  const komfortpaketEnabled = komfortpaket?.enabled || false;
  const komfortpaketPersons = komfortpaketEnabled ? (komfortpaket?.persons || 0) : 0;
  const komfortpaketCosts = komfortpaketPersons * KOMFORTPAKET_COST_PER_PERSON;
  const komfortpaketIncome = komfortpaketEnabled && komfortpaket?.guestPaid
    ? (komfortpaket?.paidAmount || (komfortpaketPersons * (komfortpaket?.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE)))
    : 0;

  // === Utility Costs berechnen ===
  const utilityCosts = arrivalDate && departureDate && !isPrivate && !skipNk
    ? calculateUtilityCostsForBooking(
        arrivalDate,
        departureDate,
        adults || 2,
        pricingSettings as Parameters<typeof calculateUtilityCostsForBooking>[3],
        hasDog
      )
    : null;

  // === Reinigungskosten: 100€ oder 125€ mit Hund ===
  const cleaningCost = hasDog ? 125 : 100;

  // === Nebenkosten OHNE Reinigung (inkl. Komfortpaket-Kosten als Teil von NK) ===
  const baseCosts = (isPrivate || skipNk) ? 0 : ((utilityCosts?.costs || 0) - (utilityCosts?.reinigung || 0) + komfortpaketCosts);
  const kurtaxe = (isPrivate || skipNk) ? 0 : (utilityCosts?.kurtaxe || 0);

  // === Kalkulatorische Kosten für Mieterlös-Berechnung ===
  // Reinigung nur abziehen wenn nicht bar bezahlt
  const cleaningDeduction = isCleaningCash ? 0 : cleaningCost;
  const calculatedCostsForMieterlos = (isUtilitiesCash ? 0 : baseCosts) +
                                       (isUtilitiesCash ? 0 : kurtaxe) +
                                       cleaningDeduction;

  // === Zentrale Miete-Berechnung ===
  const mieteResult = calculateMiete({
    platformFees,
    rentalPrice,
    isBookingCom,
    isAirbnb,
    isCleaningCash,
    isUtilitiesCash,
    calculatedCosts: calculatedCostsForMieterlos,
  });

  const {
    basisMiete,
    mieterlos,
    provision,
    nkEinnahmen,
    reinigungEinnahmen,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
    gesamtauszahlung,
  } = mieteResult;

  // === Einzahlungen berechnen ===
  const barNk = isUtilitiesCash ? (baseCosts + kurtaxe) : 0;
  const barReinigung = isCleaningCash ? cleaningCost : 0;
  // Komfortpaket-Einnahmen zählen zu den Gesamteinzahlungen
  const gesamteinzahlung = basisMiete + nkEinnahmen + reinigungEinnahmen + barNk + barReinigung + komfortpaketIncome;

  // === Kosten berechnen ===
  const totalNkCosts = baseCosts + kurtaxe;  // NK ohne Reinigung für Anzeige (inkl. Komfortpaket-Kosten)
  // Gesamtkosten = NK + Kurtaxe + Reinigung + Provision (immer die echten Kosten)
  // baseCosts enthält bereits komfortpaketCosts
  const gesamtkosten = baseCosts + kurtaxe + cleaningCost + provision;

  // === Ertrag berechnen ===
  const gesamtertrag = gesamteinzahlung - gesamtkosten;

  return {
    // Utility Costs
    utilityCosts,

    // Basis-Kosten
    baseCosts,
    kurtaxe,
    cleaningCost,

    // Kalkulatorische Kosten
    calculatedCostsForMieterlos,

    // Miete-Berechnung
    mieteResult,

    // Convenience-Referenzen
    basisMiete,
    mieterlos,
    provision,
    nkEinnahmen,
    reinigungEinnahmen,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
    gesamtauszahlung,

    // Einzahlungen
    barNk,
    barReinigung,
    gesamteinzahlung,

    // Kosten
    totalNkCosts,
    gesamtkosten,

    // Ertrag
    gesamtertrag,

    // Flags
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,

    // Komfortpaket
    komfortpaketCosts,
    komfortpaketIncome,
    komfortpaketEnabled,
  };
}

/**
 * Hilfsfunktion: Parst additional_costs JSON und extrahiert PlatformFees
 */
export function parsePlatformFeesFromJson(additionalCostsJson: string | null | undefined): PlatformFees {
  const defaultFees: PlatformFees = {
    payout_amount: 0,
    nebenkosten_income: 0,
    cleaning_fee_income: 0,
    guest_total_payment: 0,
    platform_service_fee: 0,
    payment_processing_fee: 0,
    kurtaxe_income: 0,
  };

  if (!additionalCostsJson) return defaultFees;

  try {
    const parsed = JSON.parse(additionalCostsJson);
    return { ...defaultFees, ...parsed };
  } catch {
    return defaultFees;
  }
}

/**
 * Hilfsfunktion: Parst Komfortpaket-Daten aus additional_costs JSON
 */
export function parseKomfortpaketFromJson(additionalCostsJson: string | null | undefined): KomfortpaketData | undefined {
  if (!additionalCostsJson) return undefined;

  try {
    const parsed = JSON.parse(additionalCostsJson);
    if (parsed.komfortpaket) {
      return {
        enabled: parsed.komfortpaket.enabled || false,
        persons: parsed.komfortpaket.persons || 0,
        guestPaid: parsed.komfortpaket.guestPaid || false,
        pricePerPerson: parsed.komfortpaket.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE,
        paidAmount: parsed.komfortpaket.paidAmount,
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Hilfsfunktion: Parst Transaktionen aus additional_costs JSON
 */
export function parseTransactionsFromJson(additionalCostsJson: string | null | undefined): Array<{
  date: string;
  amount: number;
  type: 'payment' | 'refund';
  status: string;
  description?: string;
  fee?: number;
}> {
  if (!additionalCostsJson) return [];

  try {
    const parsed = JSON.parse(additionalCostsJson);
    if (parsed.transactions && Array.isArray(parsed.transactions)) {
      return parsed.transactions;
    }
  } catch {
    // Not JSON
  }
  return [];
}

/**
 * Hilfsfunktion: Parst Communications aus additional_costs JSON
 */
export function parseCommunicationsFromJson(additionalCostsJson: string | null | undefined): Array<{
  date: string;
  time?: string;
  type: 'system' | 'guest' | 'host';
  event?: string;
  message?: string;
}> {
  if (!additionalCostsJson) return [];

  try {
    const parsed = JSON.parse(additionalCostsJson);
    if (parsed.communications && Array.isArray(parsed.communications)) {
      return parsed.communications;
    }
  } catch {
    // Not JSON
  }
  return [];
}

/**
 * Hilfsfunktion: Extrahiert Payout-Datum aus additional_costs JSON
 */
export function parsePayoutDateFromJson(additionalCostsJson: string | null | undefined): string {
  if (!additionalCostsJson) return '';

  try {
    const parsed = JSON.parse(additionalCostsJson);
    return parsed.payout_date || '';
  } catch {
    return '';
  }
}
