/**
 * ============================================================================
 * ZENTRALE FINANZBERECHNUNGEN - EINZIGE BERECHNUNGSEINHEIT
 * ============================================================================
 *
 * WICHTIG: Alle Finanzberechnungen MÜSSEN hier stattfinden!
 *
 * Die Komponenten (GuestBookingsTab, BookingDetailPopup, BookingWizard,
 * FinancePrintView, etc.) dürfen KEINE eigenen Berechnungen durchführen.
 * Sie rufen nur die Funktionen aus dieser Datei auf und zeigen die Ergebnisse an.
 *
 * Bei Änderungen an der Berechnungslogik: NUR HIER ändern!
 * ============================================================================
 */

import { calculateUtilityCostsForBooking, type BookingCostResult } from '@/components/admin/utility-costs/calculations';
import type { BookingPosition, ResolvedPosition, KurtaxeRate, CategoryGroup, PositionCategoryRecord } from '@/lib/types/positions';
import { resolvePositions, summarizePositions, type PositionCalcContext, type PositionSummary } from '@/lib/utils/positionCalculator';
import type { PricingSettings } from '@/components/admin/utility-costs/types';

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

  // Bar-Zahlungsbeträge (werden zu Gesamteinzahlung addiert)
  barReinigung?: number;
  barNk?: number;
}

export interface MieteCalculationResult {
  miete: number;
  nkEinnahmen: number;
  reinigungEinnahmen: number;
  kurtaxeEinnahmen: number;
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
    barReinigung = 0,
    barNk = 0,
  } = params;

  const isPlatformWithIncludedCosts = isBookingCom || isAirbnb;
  const gesamtauszahlung = getEffectivePayoutAmount(platformFees, rentalPrice);

  const nkEinnahmen = platformFees.nebenkosten_income || 0;
  const reinigungEinnahmen = platformFees.cleaning_fee_income || 0;
  const kurtaxeEinnahmen = platformFees.kurtaxe_income || 0;
  const hasActualIncomeValues = nkEinnahmen > 0 || reinigungEinnahmen > 0 || kurtaxeEinnahmen > 0;

  let miete: number;

  if (isPlatformWithIncludedCosts) {
    // Booking.com/Airbnb: Miete = Gesamteinzahlung - kalkulatorische Kosten
    // Gesamteinzahlung = Plattform-Auszahlung + Bar-Zahlungen
    const gesamteinzahlung = gesamtauszahlung + barReinigung + barNk;
    miete = gesamteinzahlung - calculatedCosts;
  } else if (hasActualIncomeValues && !isUtilitiesCash && !isCleaningCash) {
    // FeWo/Feratel/E-Mail/etc.: NK, Reinigung und Kurtaxe in Plattform-Auszahlung enthalten
    miete = gesamtauszahlung - nkEinnahmen - reinigungEinnahmen - kurtaxeEinnahmen;
  } else if (hasActualIncomeValues) {
    // NK und/oder Reinigung bar bezahlt - nur abziehen was tatsächlich in der Auszahlung ist
    const nkInPayout = isUtilitiesCash ? 0 : nkEinnahmen;
    const reinigungInPayout = isCleaningCash ? 0 : reinigungEinnahmen;

    // Wenn beides bar: Payout enthält nur Miete minus Zahlungsgebühren
    // Verwende rentalPrice als Miete (da payout_amount in DB evtl. falsch ist)
    if (nkInPayout === 0 && reinigungInPayout === 0) {
      miete = rentalPrice;
    } else {
      miete = gesamtauszahlung - nkInPayout - reinigungInPayout - kurtaxeEinnahmen;
    }
  } else {
    // Fallback: Miete = Mietpreis
    miete = rentalPrice;
  }

  // === Mieterlös-basierte Provisionsberechnung ===
  // Zahlungsbearbeitungsgebühr (für Anzeige)
  const paymentProcessingFee = platformFees.payment_processing_fee || 0;

  // Basismiete = tatsächlicher Mietpreis aus FeWo/Buchung (nicht berechneter Wert)
  const basisMiete = rentalPrice;

  // Anteilige Zahlungsgebühren (für Anzeige, nicht mehr für Berechnung)
  const mietAnteil = gesamtauszahlung > 0 ? basisMiete / gesamtauszahlung : 1;
  const anteiligeMietgebuehr = paymentProcessingFee * mietAnteil;

  // === EINHEITLICHE MIETERLÖS-BERECHNUNG FÜR ALLE PLATTFORMEN ===
  // Mieterlös = Gesamteinzahlung - kalkulatorische Kosten
  // Das ist das, was nach Abzug aller Kosten (NK, Reinigung) übrig bleibt.
  //
  // WICHTIG: payment_processing_fee wird NICHT mehr subtrahiert, weil payout_amount
  // bereits netto ist (Fee wurde von der Plattform bereits abgezogen).
  // getEffectivePayoutAmount() bestätigt dies: Priorität 2 berechnet
  // payout = guest_total_payment - (service_fee + processing_fee).
  // Ein erneuter Abzug wäre ein Doppelabzug.
  //
  // Bei Booking.com/Airbnb: Gesamteinzahlung = gesamtauszahlung + Bar-Zahlungen
  // Bei anderen Plattformen: Gesamteinzahlung = Miete + NK-Einnahmen + Reinigung-Einnahmen + Kurtaxe-Einnahmen
  const gesamteinzahlung = isPlatformWithIncludedCosts
    ? gesamtauszahlung + barReinigung + barNk
    : miete + nkEinnahmen + reinigungEinnahmen + kurtaxeEinnahmen;
  const mieterlos = gesamteinzahlung - calculatedCosts;

  // Provision: 10% von Mieterlös (gerundet auf 2 Dezimalstellen)
  const provision = Math.round(mieterlos * 0.1 * 100) / 100;

  return {
    miete,
    nkEinnahmen,
    reinigungEinnahmen,
    kurtaxeEinnahmen,
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
 * Berechnet kalkulierten Gesamtertrag = Gesamteinzahlung - Gesamtbelastung
 */
export function calculateGesamtertrag(
  miete: number,
  nkEinnahmen: number,
  reinigungEinnahmen: number,
  calculatedCosts: number,
  provision: number
): number {
  const gesamteinzahlung = calculateGesamteinzahlung(miete, nkEinnahmen, reinigungEinnahmen);
  const gesamtbelastung = calculatedCosts + provision;
  return gesamteinzahlung - gesamtbelastung;
}

// ============================================================================
// ZENTRALE BUCHUNGSFINANZ-BERECHNUNG
// ============================================================================

/**
 * Eingabeparameter für die zentrale Buchungsberechnung
 */
/**
 * Granulare Konfiguration für Privatbuchungen.
 * Bestimmt, welche Kosten/Einnahmen bei einer privaten Buchung anfallen.
 */
export interface PrivateBookingConfig {
  miete_zero: boolean;          // Miete = 0 EUR?
  nk_paid: boolean;             // Nebenkosten werden bezahlt (kalkulatorische Höhe)?
  kurtaxe_paid: boolean;        // Kurtaxe wird bezahlt?
  provision_charged: boolean;   // Provision wird berechnet?
}

export const DEFAULT_PRIVATE_CONFIG: PrivateBookingConfig = {
  miete_zero: true,
  nk_paid: false,
  kurtaxe_paid: false,
  provision_charged: false,
};

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
  isKurtaxeCash?: boolean;

  // Granulare Privat-Konfiguration (optional, nur relevant wenn isPrivate=true)
  privateConfig?: PrivateBookingConfig;

  // Plattform-Gebühren (aus additional_costs JSON)
  platformFees: PlatformFees;

  // Komfortpaket (optional)
  komfortpaket?: KomfortpaketData;

  // Optional: Pricing Settings für Utility Costs
  pricingSettings?: unknown;

  // Optional: Kinderalter für Kurtaxe-Berechnung (nur >= 16 Jahre zahlen)
  childrenAges?: number[];

  // === NEW: Position system ===
  // When positions are provided, they are used for calculation instead of the old system
  positions?: BookingPosition[];
  children?: number;
  kurtaxeRates?: KurtaxeRate[];

  // Dynamic categories from position_categories table
  positionCategories?: PositionCategoryRecord[];
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
  kurtaxeEinnahmen: number;
  paymentProcessingFee: number;
  mietAnteil: number;
  anteiligeMietgebuehr: number;
  gesamtauszahlung: number;

  // Einzahlungen
  barNk: number;  // NK wenn bar bezahlt
  barReinigung: number;  // Reinigung wenn bar bezahlt
  barKurtaxe: number;  // Kurtaxe wenn bar bezahlt (separat von barNk)
  gesamteinzahlung: number;  // Miete + NK + Reinigung + Bar-Zahlungen

  // Kosten
  totalNkCosts: number;  // baseCosts + kurtaxe (ohne Reinigung)
  gesamtbelastung: number;  // NK + Kurtaxe + Reinigung + Provision

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

  // === NEW: Position system results ===
  resolvedPositions?: ResolvedPosition[];
  positionSummary?: PositionSummary;
  // Dynamic category grouping - keys are category slugs, NOT hardcoded
  byCategory?: Record<string, CategoryGroup>;

  // Booking metadata
  nights?: number;
  season?: 'summer' | 'winter' | 'mixed';
  kurtaxePersons?: number;
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
    isKurtaxeCash = false,
    privateConfig,
    platformFees,
    komfortpaket,
    pricingSettings,
    childrenAges,
    positions,
    children = 0,
    kurtaxeRates,
  } = params;

  // === Granulare Privat-Konfiguration ===
  // Wenn isPrivate=true und privateConfig vorhanden: granulare Steuerung
  // Wenn isPrivate=true ohne privateConfig: altes Verhalten (alles deaktiviert)
  const pCfg = isPrivate ? (privateConfig || DEFAULT_PRIVATE_CONFIG) : null;
  // Private Buchung: NK nur berechnen wenn nk_paid=true
  const privateSkipNk = isPrivate && !pCfg?.nk_paid;
  // Private Buchung: Kurtaxe nur berechnen wenn kurtaxe_paid=true
  const privateSkipKurtaxe = isPrivate && !pCfg?.kurtaxe_paid;
  // Private Buchung: Provision nur berechnen wenn provision_charged=true
  const privateSkipProvision = isPrivate && !pCfg?.provision_charged;

  // === Plattform-Erkennung ===
  const isBookingCom = platform?.toLowerCase() === 'booking.com';
  const isAirbnb = platform?.toLowerCase() === 'airbnb';
  const isPlatformWithIncludedCosts = isBookingCom || isAirbnb;

  // === Guard: Wenn Positionen bestimmte Kategorien enthalten, Legacy-Werte deaktivieren ===
  const positionCategories = new Set(positions?.map(p => p.category) || []);
  const hasPositionReinigung = positionCategories.has('reinigung');
  const hasPositionKomfortpaket = positionCategories.has('komfortpaket');
  const hasPositionKurtaxe = positionCategories.has('kurtaxe');

  // Granulare NK-Guard: Prüfe individuelle calc_rule Typen statt gesamte Kategorie.
  // So wird z.B. bei einer Position für "NK Strom" nur die Legacy-Strom-Berechnung
  // deaktiviert, nicht Wasser/Müll/Holz.
  const positionCalcRuleTypes = new Set(
    positions?.map(p => p.calc_rule?.type).filter(Boolean) || []
  );
  const hasPositionStrom = positionCalcRuleTypes.has('nk_strom');
  const hasPositionWasser = positionCalcRuleTypes.has('nk_wasser');
  const hasPositionMuell = positionCalcRuleTypes.has('nk_muell');
  const hasPositionHolz = positionCalcRuleTypes.has('nk_holz');
  // If ALL four NK components are covered by positions, disable legacy NK entirely
  const hasAllNkPositions = hasPositionStrom && hasPositionWasser && hasPositionMuell && hasPositionHolz;
  // If ANY NK component is covered by a position, we need granular handling
  const hasAnyNkPosition = hasPositionStrom || hasPositionWasser || hasPositionMuell || hasPositionHolz;

  // === Komfortpaket berechnen (Legacy-Pfad nur wenn keine Positionen dafür existieren) ===
  const komfortpaketEnabled = hasPositionKomfortpaket ? false : (komfortpaket?.enabled || false);
  const komfortpaketPersons = komfortpaketEnabled ? (komfortpaket?.persons || 0) : 0;
  const komfortpaketCosts = komfortpaketPersons * KOMFORTPAKET_COST_PER_PERSON;
  const komfortpaketIncome = komfortpaketEnabled && komfortpaket?.guestPaid
    ? (komfortpaket?.paidAmount || (komfortpaketPersons * (komfortpaket?.pricePerPerson || KOMFORTPAKET_DEFAULT_PRICE)))
    : 0;

  // === Utility Costs berechnen ===
  // Bei Privat-Buchungen: Berechne NK wenn nk_paid=true (Gast zahlt kalkulatorische NK)
  // childrenAges wird für Kurtaxe-Berechnung übergeben (nur >= 16 Jahre zahlen)
  const utilityCosts = arrivalDate && departureDate && !privateSkipNk && !skipNk
    ? calculateUtilityCostsForBooking(
        arrivalDate,
        departureDate,
        adults || 2,
        pricingSettings as Parameters<typeof calculateUtilityCostsForBooking>[3],
        hasDog,
        childrenAges
      )
    : null;

  // === Reinigungskosten (Legacy-Pfad nur wenn keine Positionen dafür existieren) ===
  const cleaningCost = hasPositionReinigung ? 0 : (hasDog ? 125 : 100);

  // === Nebenkosten OHNE Reinigung und OHNE Komfortpaket (Komfortpaket wird separat ausgewiesen) ===
  // Granulare NK-Guard: Nur die spezifischen NK-Komponenten deaktivieren, für die
  // Positionen existieren. Nicht abgedeckte Komponenten behalten ihren Legacy-Wert.
  let baseCosts: number;
  if (privateSkipNk || skipNk || hasAllNkPositions) {
    // Alle NK deaktiviert (privat, skipNk, oder alle 4 Komponenten durch Positionen abgedeckt)
    baseCosts = 0;
  } else if (hasAnyNkPosition && utilityCosts) {
    // Granulare Deaktivierung: Nur die Komponenten abziehen, die NICHT durch Positionen abgedeckt sind
    const legacyStrom = hasPositionStrom ? 0 : (utilityCosts.breakdown.electricity || 0);
    const legacyWasser = hasPositionWasser ? 0 : (utilityCosts.breakdown.water || 0);
    const legacyMuell = hasPositionMuell ? 0 : (utilityCosts.breakdown.trash || 0);
    const legacyHolz = hasPositionHolz ? 0 : (utilityCosts.breakdown.holz || 0);
    baseCosts = legacyStrom + legacyWasser + legacyMuell + legacyHolz;
  } else {
    // Kein NK-Position vorhanden: volle Legacy-Berechnung (costs enthält Reinigung, daher abziehen)
    baseCosts = (utilityCosts?.costs || 0) - (utilityCosts?.reinigung || 0);
  }
  // Kurtaxe KOSTEN - immer auto-kalkuliert (was an die Gemeinde gezahlt werden muss)
  const kurtaxe = (privateSkipKurtaxe || skipNk || hasPositionKurtaxe) ? 0 : (utilityCosts?.kurtaxe || 0);

  // === Bar-Zahlungen berechnen (VOR calculateMiete, da sie dort gebraucht werden) ===
  // Booking.com/Airbnb: Kurtaxe ist IMMER bar (nie im Payout enthalten)
  const effectiveKurtaxeCash = isKurtaxeCash || isPlatformWithIncludedCosts;
  // Booking.com/Airbnb: Kurtaxe BAR-EINNAHME aus manueller Eingabe im Wizard,
  // NICHT aus Auto-Berechnung. Der Nutzer gibt den tatsächlich bar kassierten Betrag ein.
  // Wenn kurtaxe_income undefined → Legacy-Buchung ohne Eingabe → Fallback auf kurtaxe (kalkuliert).
  const kurtaxeBarAmount = (isPlatformWithIncludedCosts && platformFees.kurtaxe_income !== undefined)
    ? platformFees.kurtaxe_income
    : kurtaxe;
  // barNk: NK-Barzahlung - wenn utilities_cash: alles inkl. Kurtaxe, wenn nur kurtaxe_cash: nur Kurtaxe
  const barNk = isUtilitiesCash ? (baseCosts + kurtaxe) : (effectiveKurtaxeCash ? kurtaxeBarAmount : 0);
  const barKurtaxe = (!isUtilitiesCash && effectiveKurtaxeCash) ? kurtaxeBarAmount : 0;  // Separat für Anzeige
  const barReinigung = isCleaningCash ? cleaningCost : 0;

  // === Kalkulatorische Kosten für Mieterlös-Berechnung ===
  // Alle echten Kosten werden abgezogen (NK, Kurtaxe, Reinigung, Komfortpaket)
  // Booking.com/Airbnb: Kurtaxe IMMER als Kosten abziehen — das barNk auf der
  // Einnahmen-Seite gleicht es aus wenn der Gast bar bezahlt hat.
  // Wenn Gast 0 EUR bar bezahlt hat, muss Kurtaxe trotzdem als Kosten abgezogen werden.
  // Andere Plattformen: Kurtaxe nur abziehen wenn nicht bar (da barNk bei
  // Nicht-Plattformen nicht in der Mieterlös-Gesamteinzahlung enthalten ist).
  //
  // Reinigung: Bei Booking.com/Airbnb wird barReinigung zur Gesamteinzahlung addiert
  // (calculateMiete Zeile 159/205), daher gleicht sich cleaningCost in den Kosten aus.
  // Bei Nicht-Plattformen (FeWo, Feratel, etc.) wird barReinigung NICHT zur
  // Gesamteinzahlung addiert. Daher darf cleaningCost bei Bar-Reinigung nicht abgezogen
  // werden, sonst wird der Mieterlös fälschlicherweise reduziert (analog zu NK-Bar).
  const effectiveCleaningCost = (isCleaningCash && !isPlatformWithIncludedCosts) ? 0 : cleaningCost;
  const calculatedCostsForMieterlos = (isUtilitiesCash ? 0 : baseCosts) +
                                       ((isUtilitiesCash || (!isPlatformWithIncludedCosts && effectiveKurtaxeCash)) ? 0 : kurtaxe) +
                                       effectiveCleaningCost +
                                       komfortpaketCosts;

  // === Zentrale Miete-Berechnung ===
  const mieteResult = calculateMiete({
    platformFees,
    rentalPrice,
    isBookingCom,
    isAirbnb,
    isCleaningCash,
    isUtilitiesCash,
    calculatedCosts: calculatedCostsForMieterlos,
    barReinigung,
    barNk,
  });

  const {
    basisMiete,
    mieterlos: baseMieterlos,
    provision: baseProvision,
    nkEinnahmen,
    reinigungEinnahmen,
    kurtaxeEinnahmen,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
    gesamtauszahlung,
  } = mieteResult;
  let mieterlos = baseMieterlos;
  let provision = baseProvision;

  // Gesamteinzahlung = alles was reinkommt (Payout + Bar-Zahlungen + Komfortpaket + Position-Einnahmen)
  // Für Booking.com/Airbnb: Gesamteinzahlung = Plattform-Auszahlung + Bar-Zahlungen
  // Für andere: Gesamteinzahlung = Miete + NK-Einnahmen + Reinigung-Einnahmen + Kurtaxe-Einnahmen + Bar-Zahlungen
  let gesamteinzahlung = isPlatformWithIncludedCosts
    ? gesamtauszahlung + barNk + barReinigung + komfortpaketIncome
    : mieteResult.miete + nkEinnahmen + reinigungEinnahmen + kurtaxeEinnahmen + barNk + barReinigung + komfortpaketIncome;

  // === Kosten berechnen ===
  const totalNkCosts = baseCosts + kurtaxe;  // NK ohne Reinigung und ohne Komfortpaket für Anzeige
  // Gesamtbelastung = NK + Kurtaxe + Reinigung + Komfortpaket + Provision (immer die echten Kosten)
  let gesamtbelastung = baseCosts + kurtaxe + cleaningCost + komfortpaketCosts + provision;

  // === Ertrag berechnen ===
  let gesamtertrag = gesamteinzahlung - gesamtbelastung;

  // === Position system resolution (when positions provided) ===
  let resolvedPositions: ResolvedPosition[] | undefined;
  let positionSummary: PositionSummary | undefined;
  let byCategory: BookingFinanceResult['byCategory'] | undefined;

  if (positions && positions.length > 0) {
    const calcCtx: PositionCalcContext = {
      arrivalDate,
      departureDate,
      adults,
      children,
      childrenAges: childrenAges || [],
      hasDog,
      isPrivate,
      platform,
      pricingSettings: pricingSettings as PricingSettings | undefined,
      kurtaxeRates,
      komfortpaketPersons: komfortpaketEnabled ? (komfortpaket?.persons || 0) : 0,
      komfortpaketGuestPaid: komfortpaketEnabled && komfortpaket?.guestPaid || false,
    };

    resolvedPositions = resolvePositions(positions, calcCtx);
    positionSummary = summarizePositions(resolvedPositions);

    // Build dynamic byCategory grouping
    // Group positions by their category string, then map to CategoryGroup
    const categoryMap = new Map<string, ResolvedPosition[]>();
    for (const pos of resolvedPositions) {
      const key = pos.category || 'uncategorized';
      if (!categoryMap.has(key)) {
        categoryMap.set(key, []);
      }
      categoryMap.get(key)!.push(pos);
    }

    const categories = params.positionCategories || [];
    byCategory = {};
    for (const [key, catPositions] of categoryMap) {
      const catRecord = categories.find(c => c.slug === key);
      byCategory[key] = {
        category: catRecord
          ? { id: catRecord.id, name: catRecord.name, icon: catRecord.icon }
          : null,
        positions: catPositions,
        total: catPositions.reduce((sum, p) => sum + p.resolvedAmount, 0),
      };
    }

    // === Position-Einnahmen und -Kosten in die Gesamtberechnung einbeziehen ===
    // Positions-Income: Einnahmen aus Positionen (z.B. Kurtaxe, NK, Reinigung als Einnahme)
    // Positions-Expenses: Kosten aus Positionen (z.B. NK-Kosten als Expense-Position)
    if (positionSummary) {
      if (isPlatformWithIncludedCosts) {
        // Booking.com/Airbnb: Payout enthält bereits guest_platform/included_payout Einnahmen.
        // Nur Bar- und Direkt-Einnahmen aus Positionen hinzufügen (nicht im Payout enthalten).
        const extraPositionIncome = (resolvedPositions || [])
          .filter(p => p.type === 'income' && p.paid_by !== 'guest_platform' && p.paid_by !== 'included_payout')
          .reduce((sum, p) => sum + p.resolvedAmount, 0);
        gesamteinzahlung += extraPositionIncome;
      } else {
        // Feratel/FeWo/Direkt: Position-Einnahmen komplett hinzufügen.
        // Legacy-Einnahmen (nkEinnahmen, reinigungEinnahmen) abziehen soweit durch Positionen ersetzt.
        let replacedLegacyIncome = 0;
        if (hasAnyNkPosition || hasPositionKurtaxe) replacedLegacyIncome += nkEinnahmen;
        if (hasPositionReinigung) replacedLegacyIncome += reinigungEinnahmen;
        gesamteinzahlung += positionSummary.totalIncome - replacedLegacyIncome;
      }

      // Position-Kosten zur Gesamtbelastung addieren (Guard hat Legacy-Kosten bereits genullt)
      const posExpenses = positionSummary.totalExpenses;
      if (posExpenses > 0) {
        gesamtbelastung += posExpenses;
      }

      // Mieterlös und Provision neu berechnen mit angepasster Gesamteinzahlung
      const adjustedCalcCosts = calculatedCostsForMieterlos + positionSummary.totalExpenses;
      mieterlos = gesamteinzahlung - adjustedCalcCosts;
      provision = privateSkipProvision ? 0 : Math.round(mieterlos * 0.1 * 100) / 100;

      // Gesamtbelastung mit aktualisierter Provision neu berechnen
      gesamtbelastung = baseCosts + kurtaxe + cleaningCost + komfortpaketCosts + posExpenses + provision;
      gesamtertrag = gesamteinzahlung - gesamtbelastung;
    }
  }

  // Compute booking metadata
  let nights = 0;
  let season: 'summer' | 'winter' | 'mixed' = 'summer';
  if (arrivalDate && departureDate) {
    const arrival = new Date(arrivalDate);
    const departure = new Date(departureDate);
    nights = Math.ceil((departure.getTime() - arrival.getTime()) / (1000 * 60 * 60 * 24));
    const arrMonth = arrival.getMonth() + 1;
    const depMonth = departure.getMonth() + 1;
    const arrSummer = arrMonth >= 5 && arrMonth <= 10;
    const depSummer = depMonth >= 5 && depMonth <= 10;
    season = arrSummer === depSummer ? (arrSummer ? 'summer' : 'winter') : 'mixed';
  }

  // Kurtaxe-paying persons count
  const qualifyingChildren = (childrenAges || []).filter(a => a >= 16).length;
  const kurtaxePersons = Math.min(8, Math.max(1, adults + qualifyingChildren));

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
    provision: privateSkipProvision ? 0 : provision,
    nkEinnahmen,
    reinigungEinnahmen,
    kurtaxeEinnahmen,
    paymentProcessingFee,
    mietAnteil,
    anteiligeMietgebuehr,
    gesamtauszahlung,

    // Einzahlungen
    barNk,
    barReinigung,
    barKurtaxe,
    gesamteinzahlung,

    // Kosten
    totalNkCosts,
    gesamtbelastung: privateSkipProvision ? (gesamtbelastung - provision) : gesamtbelastung,

    // Ertrag
    gesamtertrag: privateSkipProvision ? (gesamteinzahlung - (gesamtbelastung - provision)) : gesamtertrag,

    // Flags
    isBookingCom,
    isAirbnb,
    isPlatformWithIncludedCosts,

    // Komfortpaket
    komfortpaketCosts,
    komfortpaketIncome,
    komfortpaketEnabled,

    // Position system
    resolvedPositions,
    positionSummary,
    byCategory,

    // Booking metadata
    nights,
    season,
    kurtaxePersons,
  };
}

/**
 * Hilfsfunktion: Parst private_config JSON String zu PrivateBookingConfig
 */
export function parsePrivateConfig(configJson: string | null | undefined): PrivateBookingConfig | undefined {
  if (!configJson) return undefined;
  try {
    const parsed = JSON.parse(configJson);
    return {
      miete_zero: parsed.miete_zero ?? true,
      nk_paid: parsed.nk_paid ?? false,
      kurtaxe_paid: parsed.kurtaxe_paid ?? false,
      provision_charged: parsed.provision_charged ?? false,
    };
  } catch {
    return undefined;
  }
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
    kurtaxe_income: undefined,
  };

  if (!additionalCostsJson) return defaultFees;

  try {
    const parsed = JSON.parse(additionalCostsJson);
    return {
      ...defaultFees,
      ...parsed,
      // Preserve undefined for kurtaxe_income when not explicitly set in JSON
      // This distinguishes "user entered 0" from "value was never set"
      kurtaxe_income: 'kurtaxe_income' in parsed ? parsed.kurtaxe_income : undefined,
    };
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

/**
 * Hilfsfunktion: Parst children_ages String zu Array von Zahlen
 * Format: "5,12,16" -> [5, 12, 16]
 * Für Kurtaxe: Nur Kinder >= 16 Jahre sind kurtaxepflichtig
 */
export function parseChildrenAges(childrenAgesStr: string | null | undefined): number[] {
  if (!childrenAgesStr) return [];

  try {
    return childrenAgesStr
      .split(',')
      .map(a => parseInt(a.trim()))
      .filter(a => !isNaN(a) && a >= 0);
  } catch {
    return [];
  }
}
