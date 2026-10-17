// Saisonpreise für ein ganzes Jahr mit einem Klick (Preisübersicht).
// Liegt identisch in beiden Repos (natbergerhuette: lib/pricing,
// sechszirbenhuette: src/lib/pricing).
//
// Natberger Hütte 2027: Zeiträume (Samstag bis Samstag) aus der mit der
// Sechszirbenhütte abgestimmten Saisonliste, Preise im Verhältnis der
// Feratel-Vorlagen der Natberger Hütte (Nebensaison 130, Winter 142,
// Standard 170, Fasching 220, Ostern 230, Sommer 155 €) — ausgehend vom
// Preis für Januar/Februar bei Booking.com (Vorgabe 400 €; das ist die
// Beds24-Standard-Rate, die Booking.com bekommt). Alles sind Tagespreise je
// Nacht; Beds24 rechnet einen Aufenthalt Nacht für Nacht zusammen. Über
// Weihnachten sind deshalb nur die Feiertage selbst teurer (24.–26.12. und
// Silvester), nicht die ganze Woche — das Feratel-Verhältnis für
// Weihnachten (320 zu 170) ergäbe über 5.000 € für eine Woche. Jeder Wert
// lässt sich vor dem Übernehmen noch ändern.

import type { HutKey } from '@/lib/pricing/dynamicPricing';

export interface SeasonTemplate {
  key: string;
  label: string;
  /** Preis im Verhältnis zum Ausgangspreis (1 = Januar/Februar) */
  factor: number;
  /** Mindestaufenthalt, den die Saison setzt (sonst bleibt er unverändert) */
  minStay?: number;
}

export interface SeasonPlanRow {
  /** erste und letzte Nacht */
  from: string;
  to: string;
  template: string;
}

export interface SeasonPlan {
  hut: HutKey;
  year: number;
  /** Ausgangspreis, aus dem sich alle Saisons ergeben */
  anchorLabel: string;
  defaultAnchor: number;
  templates: SeasonTemplate[];
  rows: SeasonPlanRow[];
}

export const SEASON_PLANS: SeasonPlan[] = [
  {
    hut: 'natberger',
    year: 2027,
    anchorLabel: 'Preis Januar/Februar bei Booking.com',
    defaultAnchor: 400,
    templates: [
      { key: 'nebensaison', label: 'Nebensaison', factor: 130 / 170 },
      { key: 'winter', label: 'Winter', factor: 142 / 170 },
      { key: 'standard', label: 'Standard', factor: 1 },
      { key: 'fasching', label: 'Fasching', factor: 220 / 170 },
      { key: 'ostern', label: 'Ostern', factor: 230 / 170 },
      { key: 'sommer', label: 'Sommer', factor: 155 / 170 },
      // Nur die Feiertage auf dem Niveau von Fasching/Ostern
      { key: 'weihnachtstage', label: 'Weihnachtsfeiertage', factor: 1.375 },
      { key: 'zwischenjahre', label: 'Zwischen den Jahren', factor: 1.125 },
      { key: 'silvester', label: 'Silvester', factor: 1.375 },
    ],
    rows: [
      { from: '2027-01-02', to: '2027-02-05', template: 'standard' },
      { from: '2027-02-06', to: '2027-02-19', template: 'fasching' },
      { from: '2027-02-20', to: '2027-03-19', template: 'standard' },
      { from: '2027-03-20', to: '2027-04-02', template: 'ostern' },
      { from: '2027-04-03', to: '2027-04-30', template: 'nebensaison' },
      { from: '2027-05-01', to: '2027-10-29', template: 'sommer' },
      { from: '2027-10-30', to: '2027-12-10', template: 'nebensaison' },
      // Ferien in Österreich erst ab 24.12. — die Tage davor bleiben Winter
      { from: '2027-12-11', to: '2027-12-23', template: 'winter' },
      { from: '2027-12-24', to: '2027-12-26', template: 'weihnachtstage' },
      { from: '2027-12-27', to: '2027-12-30', template: 'zwischenjahre' },
      { from: '2027-12-31', to: '2027-12-31', template: 'silvester' },
    ],
  },
];

export function seasonPlanFor(hut: string | undefined): SeasonPlan | undefined {
  return SEASON_PLANS.find((p) => p.hut === hut);
}

/** Preis je Vorlage aus dem Ausgangspreis, auf volle 10 € gerundet */
export function templatePrices(plan: SeasonPlan, anchor: number): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const t of plan.templates) {
    prices[t.key] = t.factor === 1 ? anchor : Math.round((t.factor * anchor) / 10) * 10;
  }
  return prices;
}
