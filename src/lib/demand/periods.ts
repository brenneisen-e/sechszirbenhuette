// Ferien, Feiertage, Saisonzeiten und Ereignisse für die Nachfrage je Nacht
// (Preisübersicht). Kopie aus dem Repo natbergerhuette (lib/demand) — beide
// Hütten liegen am Falkert; Änderungen dort pflegen und hierher übernehmen.
// Recherchiert am 13.10.2026 aus amtlichen Quellen (Quelle je Eintrag);
// „confirmed: false“ = noch nicht amtlich veröffentlicht,
// erwartet nach der üblichen Regel. Abgedeckt: Oktober 2026 bis März 2028 —
// danach die Liste fortschreiben.
//
// Regionen: Österreich W, NOE, B, OOE, STMK, K, S, T, V; Deutschland BY, BW,
// NW, NI, HE, SN, RP, BE, SH, BB, ST, TH, HH, MV, SL, HB. Für die übrigen
// Länder steht der Anteil des Landes direkt im Eintrag (share).

export type DemandCountry = 'AT' | 'DE' | 'IT' | 'SI' | 'CZ' | 'SK' | 'HU' | 'CH';

export interface SchoolHoliday {
  /** erster Ferientag (inklusive) */
  from: string;
  /** letzter Ferientag (inklusive) */
  to: string;
  country: DemandCountry;
  regions: string[] | 'alle';
  /** Anteil des Landes, wenn nicht aus den Regionen ableitbar (0–1) */
  share?: number;
  label: string;
  confirmed: boolean;
  source: string;
}

export interface PublicHoliday {
  date: string;
  country: DemandCountry;
  regions: string[] | 'alle';
  share?: number;
  label: string;
  source: string;
}

export interface DemandEvent {
  /** erste und letzte Nacht mit Mehrnachfrage */
  from: string;
  to: string;
  label: string;
  /** Zuschlag auf die Punktzahl (0,2 klein … 0,6 groß) */
  weight: number;
  confirmed: boolean;
  source: string;
}

export interface Season {
  from: string;
  to: string;
  label: string;
  /** Faktor auf die Ferien-Nachfrage (1 = Sommersaison, Skisaison 1,6, außerhalb 0,4) */
  factor: number;
}

// ---------------------------------------------------------------- Österreich
const AT_FERIEN_2627 =
  'https://www.bmb.gv.at/Themen/schule/schulpraxis/termine/ferientermine_26_27.html';
const AT_SEMESTER_VERORDNUNG = 'https://www.ris.bka.gv.at/eli/bgbl/II/2025/343';
const AT_SCHULZEITGESETZ =
  'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10009575';
const AT_LANDESPATRONE = 'https://www.bmb.gv.at/Themen/schule/schulpraxis/termine/feiertage.html';
const AT_FEIERTAGE =
  'https://www.oesterreich.gv.at/de/themen/bildung_und_ausbildung/schulen/Seite.1100114';
const AT_FEIERTAGSGESETZ =
  'https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10008541&Paragraf=7';

// Semesterferien laufen Mo–Sa; Familien reisen vom Samstag davor bis zum
// Sonntag danach — so stehen sie hier.
const AT_HOLIDAYS: SchoolHoliday[] = [
  {
    from: '2026-10-24',
    to: '2026-11-02',
    country: 'AT',
    regions: 'alle',
    label: 'Herbstferien Österreich',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2026-12-24',
    to: '2027-01-06',
    country: 'AT',
    regions: 'alle',
    label: 'Weihnachtsferien Österreich',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-01-30',
    to: '2027-02-07',
    country: 'AT',
    regions: ['W', 'NOE'],
    label: 'Semesterferien Wien, NÖ',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-02-06',
    to: '2027-02-14',
    country: 'AT',
    regions: ['K', 'B'],
    label: 'Semesterferien Kärnten, Bgld',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-02-13',
    to: '2027-02-21',
    country: 'AT',
    regions: ['STMK', 'OOE', 'S', 'T', 'V'],
    label: 'Semesterferien Stmk, OÖ, Sbg, T, Vbg',
    confirmed: true,
    source: AT_SEMESTER_VERORDNUNG,
  },
  {
    from: '2027-03-19',
    to: '2027-03-20',
    country: 'AT',
    regions: ['K', 'STMK', 'T', 'V'],
    label: 'Josefitag (schulfrei Kärnten, Stmk)',
    confirmed: true,
    source: AT_LANDESPATRONE,
  },
  {
    from: '2027-03-20',
    to: '2027-03-29',
    country: 'AT',
    regions: 'alle',
    label: 'Osterferien Österreich',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-05-15',
    to: '2027-05-17',
    country: 'AT',
    regions: 'alle',
    label: 'Pfingstferien Österreich',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-07-03',
    to: '2027-09-05',
    country: 'AT',
    regions: ['W', 'NOE', 'B'],
    label: 'Sommerferien Wien, NÖ, Bgld',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-07-10',
    to: '2027-09-12',
    country: 'AT',
    regions: ['K', 'STMK', 'OOE', 'S', 'T', 'V'],
    label: 'Sommerferien Kärnten, Stmk, OÖ, Sbg, T, Vbg',
    confirmed: true,
    source: AT_FERIEN_2627,
  },
  {
    from: '2027-10-23',
    to: '2027-11-02',
    country: 'AT',
    regions: 'alle',
    label: 'Herbstferien Österreich',
    confirmed: true,
    source: AT_SCHULZEITGESETZ,
  },
  {
    from: '2027-12-24',
    to: '2028-01-06',
    country: 'AT',
    regions: 'alle',
    label: 'Weihnachtsferien Österreich',
    confirmed: true,
    source: AT_SCHULZEITGESETZ,
  },
  {
    from: '2028-02-05',
    to: '2028-02-13',
    country: 'AT',
    regions: ['W', 'NOE'],
    label: 'Semesterferien Wien, NÖ',
    confirmed: false,
    source: AT_SCHULZEITGESETZ,
  },
  {
    from: '2028-02-12',
    to: '2028-02-20',
    country: 'AT',
    regions: ['K', 'B', 'S', 'T', 'V'],
    label: 'Semesterferien Kärnten, Bgld, Sbg, T, Vbg',
    confirmed: false,
    source: AT_SCHULZEITGESETZ,
  },
  {
    from: '2028-02-19',
    to: '2028-02-27',
    country: 'AT',
    regions: ['STMK', 'OOE'],
    label: 'Semesterferien Stmk, OÖ',
    confirmed: false,
    source: AT_SCHULZEITGESETZ,
  },
];

const AT_PUBLIC: PublicHoliday[] = [
  {
    date: '2026-12-08',
    country: 'AT',
    regions: 'alle',
    label: 'Mariä Empfängnis (AT)',
    source: AT_FEIERTAGE,
  },
  {
    date: '2027-05-06',
    country: 'AT',
    regions: 'alle',
    label: 'Christi Himmelfahrt (AT)',
    source: AT_FEIERTAGE,
  },
  {
    date: '2027-05-17',
    country: 'AT',
    regions: 'alle',
    label: 'Pfingstmontag (AT)',
    source: AT_FEIERTAGE,
  },
  {
    date: '2027-05-27',
    country: 'AT',
    regions: 'alle',
    label: 'Fronleichnam (AT)',
    source: AT_FEIERTAGE,
  },
  {
    date: '2027-11-15',
    country: 'AT',
    regions: ['W', 'NOE'],
    label: 'Leopolditag (schulfrei Wien, NÖ)',
    source: AT_LANDESPATRONE,
  },
  {
    date: '2027-12-08',
    country: 'AT',
    regions: 'alle',
    label: 'Mariä Empfängnis (AT)',
    source: AT_FEIERTAGSGESETZ,
  },
  {
    date: '2028-01-06',
    country: 'AT',
    regions: 'alle',
    label: 'Heilige Drei Könige (AT)',
    source: AT_FEIERTAGSGESETZ,
  },
];

// Skisaison: heidialm.at (Falkert, 19.12.2026–04.04.2027), badkleinkirchheim.com,
// turracherhoehe.at — 2027/28 noch nicht veröffentlicht, erwartet nach dem Muster.
// Die Skisaison am Falkert wiegt am stärksten: Winterferien sind dort die
// Hauptreisezeit. Spätherbst bis zur Wintersperre der Nockalmstraße Anfang
// November, danach Zwischensaison.

const SEASONS_DATA: Season[] = [
  { from: '2026-10-13', to: '2026-10-15', label: 'Wanderherbst', factor: 0.75 },
  { from: '2026-10-16', to: '2026-11-02', label: 'Spätherbst', factor: 0.5 },
  {
    from: '2026-11-28',
    to: '2026-12-18',
    label: 'Skisaison Bad Kleinkirchheim, Turracher Höhe',
    factor: 0.8,
  },
  { from: '2026-12-19', to: '2027-03-14', label: 'Skisaison Falkert', factor: 1.6 },
  { from: '2027-03-15', to: '2027-04-04', label: 'Frühjahrsskilauf Falkert', factor: 1.1 },
  { from: '2027-04-05', to: '2027-04-18', label: 'Skisaison Turracher Höhe', factor: 0.7 },
  { from: '2027-05-01', to: '2027-06-14', label: 'Vorsaison Sommer', factor: 0.75 },
  { from: '2027-06-15', to: '2027-09-15', label: 'Sommersaison', factor: 1 },
  { from: '2027-09-16', to: '2027-10-15', label: 'Wanderherbst', factor: 0.75 },
  { from: '2027-10-16', to: '2027-11-02', label: 'Spätherbst', factor: 0.5 },
  {
    from: '2027-11-27',
    to: '2027-12-17',
    label: 'Skisaison Bad Kleinkirchheim, Turracher Höhe (erwartet)',
    factor: 0.8,
  },
  { from: '2027-12-18', to: '2028-03-12', label: 'Skisaison Falkert (erwartet)', factor: 1.6 },
  {
    from: '2028-03-13',
    to: '2028-03-31',
    label: 'Frühjahrsskilauf Falkert (erwartet)',
    factor: 1.1,
  },
];

const EVENTS_DATA: DemandEvent[] = [
  {
    from: '2027-01-22',
    to: '2027-01-23',
    label: '„Wenn die Musi spielt“ Bad Kleinkirchheim',
    weight: 0.3,
    confirmed: true,
    source: 'https://www.eventim.de/en/cityd/bad-kleinkirchheim-3196/konzerte-1/',
  },
  {
    from: '2027-06-04',
    to: '2027-06-05',
    label: 'Kärnten Radmarathon Bad Kleinkirchheim',
    weight: 0.3,
    confirmed: true,
    source: 'https://www.kaernten-radmarathon.at/de',
  },
  {
    from: '2027-06-10',
    to: '2027-06-12',
    label: 'IRONMAN Kärnten-Klagenfurt',
    weight: 0.2,
    confirmed: false,
    source: 'https://www.hdsports.org/triathlon/triathlonkalender-kaernten-triathlon-termine',
  },
  {
    from: '2027-08-01',
    to: '2027-08-07',
    label: 'Villacher Kirchtag',
    weight: 0.2,
    confirmed: false,
    source: 'https://www.visitvillach.at/de/villacher-kirchtag.html',
  },
  {
    from: '2027-08-27',
    to: '2027-08-28',
    label: 'Kärnten Läuft (Wörthersee)',
    weight: 0.15,
    confirmed: true,
    source: 'https://www.kaerntenlaeuft.at/',
  },
  {
    from: '2027-09-07',
    to: '2027-09-11',
    label: 'European Bike Week Faaker See',
    weight: 0.4,
    confirmed: true,
    source: 'https://www.bikeweek.at/',
  },
];

// ---------------------------------------------------------------- Deutschland
// Amtliche erste und letzte Ferientage (KMK-Ferienkalender, Kultusministerien);
// die Wochenenden davor und danach ergänzt die Bewertung selbst.
const KMK_2627 = 'https://www.kmk.org/fileadmin/Dateien/pdf/Ferienkalender/FER2026_27.pdf';
const KMK_2728 = 'https://www.kmk.org/fileadmin/Dateien/pdf/Ferienkalender/FER2027_28.pdf';
const BY_FERIEN = 'https://www.km.bayern.de/ministerium/termine/ferientermine.html';
const BW_FERIEN = 'https://km.baden-wuerttemberg.de/de/service/ferien';
const HE_BEWEGLICH = 'https://schulaemter.hessen.de/schulbesuch/bewegliche-ferientage';
const DE_FEIERTAGE =
  'https://www.bmi.bund.de/DE/themen/verfassung/staatliche-symbole/nationale-feiertage/nationale-feiertage-node.html';
const DE_FEIERTAGE_LAENDER =
  'https://mdi.rlp.de/themen/buerger-und-staat/verfassung-und-verwaltung/sonn-und-feiertagsrecht';

const de = (
  from: string,
  to: string,
  regions: string[],
  label: string,
  source = KMK_2627,
): SchoolHoliday => ({
  from,
  to,
  country: 'DE',
  regions,
  label,
  confirmed: true,
  source,
});

const DE_HOLIDAYS: SchoolHoliday[] = [
  // Herbst 2026
  de('2026-10-05', '2026-10-16', ['RP', 'SL'], 'Herbstferien RLP, Saarland'),
  de('2026-10-05', '2026-10-17', ['HE'], 'Herbstferien Hessen'),
  de(
    '2026-10-12',
    '2026-10-24',
    ['HB', 'NI', 'SN', 'SH', 'TH'],
    'Herbstferien Niedersachsen, Sachsen, SH, Thüringen',
  ),
  de('2026-10-15', '2026-10-24', ['MV'], 'Herbstferien MV'),
  de('2026-10-17', '2026-10-31', ['NW'], 'Herbstferien NRW'),
  de(
    '2026-10-19',
    '2026-10-31',
    ['BE', 'BB', 'HH', 'ST'],
    'Herbstferien Berlin, Brandenburg, Hamburg, Sachsen-Anhalt',
  ),
  de('2026-10-26', '2026-10-31', ['BW'], 'Herbstferien Baden-Württemberg', BW_FERIEN),
  de('2026-11-02', '2026-11-06', ['BY'], 'Herbstferien Bayern', BY_FERIEN),
  // Weihnachten 2026/27
  de(
    '2026-12-21',
    '2027-01-02',
    ['SL', 'HH', 'MV', 'ST'],
    'Weihnachtsferien Saarland, Hamburg, MV, Sachsen-Anhalt',
  ),
  de('2026-12-21', '2027-01-06', ['SH'], 'Weihnachtsferien SH'),
  de(
    '2026-12-23',
    '2027-01-02',
    ['BE', 'BB', 'SN', 'TH'],
    'Weihnachtsferien Berlin, Brandenburg, Sachsen, Thüringen',
  ),
  de(
    '2026-12-23',
    '2027-01-09',
    ['NW', 'RP', 'BW', 'HB', 'NI', 'HE'],
    'Weihnachtsferien BW, NRW, Hessen, Niedersachsen, RLP',
  ),
  de('2026-12-24', '2027-01-08', ['BY'], 'Weihnachtsferien Bayern', BY_FERIEN),
  // Winter 2027
  de('2027-02-01', '2027-02-02', ['HB', 'NI'], 'Halbjahresferien Niedersachsen, Bremen'),
  de(
    '2027-02-01',
    '2027-02-06',
    ['BE', 'BB', 'ST', 'TH'],
    'Winterferien Berlin, Brandenburg, Sachsen-Anhalt, Thüringen',
  ),
  de('2027-02-08', '2027-02-12', ['BY', 'SL'], 'Faschingsferien Bayern, Saarland', BY_FERIEN),
  de('2027-02-08', '2027-02-19', ['MV', 'SN'], 'Winterferien Sachsen, MV'),
  { ...de('2027-02-08', '2027-02-09', ['HE'], 'Fastnachtstage Hessen', HE_BEWEGLICH), share: 0.05 },
  de('2027-03-01', '2027-03-12', ['HH'], 'Frühjahrsferien Hamburg'),
  // Ostern 2027
  de(
    '2027-03-22',
    '2027-04-03',
    ['BY', 'BE', 'HE', 'RP', 'BB', 'HB', 'NI', 'NW', 'TH'],
    'Osterferien Bayern, NRW, Hessen u. a.',
  ),
  de('2027-03-22', '2027-03-27', ['ST'], 'Osterferien Sachsen-Anhalt'),
  de('2027-03-24', '2027-04-02', ['MV', 'SN'], 'Osterferien Sachsen, MV'),
  de('2027-03-25', '2027-04-03', ['BW'], 'Osterferien Baden-Württemberg', BW_FERIEN),
  de('2027-03-30', '2027-04-10', ['SL', 'SH'], 'Osterferien Saarland, SH'),
  // Pfingsten 2027
  de('2027-05-07', '2027-05-14', ['HH'], 'Pfingstferien Hamburg'),
  de(
    '2027-05-14',
    '2027-05-18',
    ['MV', 'SN', 'BB', 'HB', 'NI', 'NW', 'BE'],
    'Pfingstferientage Norddeutschland, Sachsen',
  ),
  de('2027-05-15', '2027-05-22', ['ST'], 'Pfingstferien Sachsen-Anhalt'),
  de('2027-05-18', '2027-05-28', ['BY'], 'Pfingstferien Bayern', BY_FERIEN),
  de('2027-05-18', '2027-05-29', ['BW'], 'Pfingstferien Baden-Württemberg', BW_FERIEN),
  // Sommer 2027
  de('2027-06-28', '2027-08-06', ['HE', 'RP', 'SL'], 'Sommerferien Hessen, RLP, Saarland'),
  de(
    '2027-07-01',
    '2027-08-14',
    ['HH', 'BE', 'BB', 'SH', 'MV'],
    'Sommerferien Berlin, Hamburg, Brandenburg, SH, MV',
  ),
  de('2027-07-08', '2027-08-18', ['HB', 'NI'], 'Sommerferien Niedersachsen, Bremen'),
  de(
    '2027-07-10',
    '2027-08-20',
    ['SN', 'ST', 'TH'],
    'Sommerferien Sachsen, Sachsen-Anhalt, Thüringen',
  ),
  de('2027-07-19', '2027-08-31', ['NW'], 'Sommerferien NRW'),
  de('2027-07-29', '2027-09-11', ['BW'], 'Sommerferien Baden-Württemberg', BW_FERIEN),
  de('2027-08-02', '2027-09-13', ['BY'], 'Sommerferien Bayern', BY_FERIEN),
  // Herbst 2027
  de(
    '2027-10-04',
    '2027-10-16',
    ['RP', 'SL', 'HE'],
    'Herbstferien Hessen, RLP, Saarland',
    KMK_2728,
  ),
  de(
    '2027-10-09',
    '2027-10-23',
    ['TH', 'HH', 'BE', 'BB', 'SN', 'SH', 'MV'],
    'Herbstferien Berlin, Sachsen, Thüringen u. a.',
    KMK_2728,
  ),
  de('2027-10-16', '2027-10-30', ['NI', 'HB'], 'Herbstferien Niedersachsen, Bremen', KMK_2728),
  de('2027-10-18', '2027-10-23', ['ST'], 'Herbstferien Sachsen-Anhalt', KMK_2728),
  de('2027-10-23', '2027-11-06', ['NW'], 'Herbstferien NRW', KMK_2728),
  de('2027-10-30', '2027-11-06', ['BY', 'BW'], 'Herbstferien Bayern, Baden-Württemberg', BY_FERIEN),
  // Weihnachten 2027/28
  de(
    '2027-12-20',
    '2027-12-31',
    ['HH', 'SL', 'ST', 'BE', 'BB', 'TH'],
    'Weihnachtsferien Berlin, Hamburg, Thüringen u. a.',
    KMK_2728,
  ),
  de('2027-12-22', '2028-01-04', ['MV', 'SN'], 'Weihnachtsferien Sachsen, MV', KMK_2728),
  de(
    '2027-12-23',
    '2028-01-08',
    ['RP', 'BW', 'HB', 'NI', 'SH', 'HE', 'NW'],
    'Weihnachtsferien BW, NRW, Hessen, Niedersachsen u. a.',
    KMK_2728,
  ),
  de('2027-12-24', '2028-01-07', ['BY'], 'Weihnachtsferien Bayern', BY_FERIEN),
  // Winter 2028
  de('2028-01-31', '2028-02-01', ['HB', 'NI'], 'Halbjahresferien Niedersachsen, Bremen', KMK_2728),
  de('2028-01-31', '2028-02-05', ['BE', 'BB'], 'Winterferien Berlin, Brandenburg', KMK_2728),
  de('2028-02-05', '2028-02-18', ['MV'], 'Winterferien MV', KMK_2728),
  de('2028-02-07', '2028-02-12', ['ST', 'TH'], 'Winterferien Sachsen-Anhalt, Thüringen', KMK_2728),
  de('2028-02-14', '2028-02-26', ['SN'], 'Winterferien Sachsen', KMK_2728),
  de('2028-02-21', '2028-02-29', ['SL'], 'Fastnachtsferien Saarland', KMK_2728),
  de('2028-02-28', '2028-03-03', ['BY'], 'Faschingsferien Bayern', BY_FERIEN),
  de('2028-03-06', '2028-03-17', ['HH'], 'Frühjahrsferien Hamburg', KMK_2728),
];

const DE_PUBLIC: PublicHoliday[] = [
  {
    date: '2027-03-08',
    country: 'DE',
    regions: ['BE', 'MV'],
    label: 'Frauentag (Berlin, MV)',
    source: DE_FEIERTAGE_LAENDER,
  },
  {
    date: '2027-03-29',
    country: 'DE',
    regions: 'alle',
    label: 'Ostern (DE)',
    source: DE_FEIERTAGE,
  },
  {
    date: '2027-05-06',
    country: 'DE',
    regions: 'alle',
    label: 'Christi Himmelfahrt (DE)',
    source: DE_FEIERTAGE,
  },
  {
    date: '2027-05-17',
    country: 'DE',
    regions: 'alle',
    label: 'Pfingsten (DE)',
    source: DE_FEIERTAGE,
  },
  {
    date: '2027-05-27',
    country: 'DE',
    regions: ['BY', 'BW', 'HE', 'NW', 'RP', 'SL'],
    label: 'Fronleichnam (Bayern, BW u. a.)',
    source: DE_FEIERTAGE_LAENDER,
  },
  {
    date: '2027-09-20',
    country: 'DE',
    regions: ['TH'],
    label: 'Weltkindertag (Thüringen)',
    source: DE_FEIERTAGE_LAENDER,
  },
  {
    date: '2027-11-01',
    country: 'DE',
    regions: ['BY', 'BW', 'NW', 'RP', 'SL'],
    label: 'Allerheiligen (Bayern, BW u. a.)',
    source: DE_FEIERTAGE_LAENDER,
  },
  {
    date: '2028-01-06',
    country: 'DE',
    regions: ['BY', 'BW', 'ST'],
    label: 'Heilige Drei Könige (Bayern, BW)',
    source: DE_FEIERTAGE_LAENDER,
  },
];

// ---------------------------------------------------------------- Italien, Slowenien
const FVG_2627 =
  'https://www.regione.fvg.it/rafvg/export/sites/default/RAFVG/istruzione-ricerca/regione-per-scuole/FOGLIA22/allegati/Testo_integrale_della_Delibera_n_424-2026.pdf';
const VENETO_2627 =
  'https://www.regione.veneto.it/documents/3059728/14342659/Dgr_712_26/584b2c81-c12d-4cdb-8c8a-30ffe2dd9196';
const FVG_KALENDER =
  'https://www.regione.fvg.it/rafvg/cms/RAFVG/istruzione-ricerca/link/Calendario_scolastico_regionale';
const VENETO_KALENDER =
  'https://www.regione.veneto.it/web/formazione-e-istruzione/calendario_scolastico';
const IT_FEIERTAGE = 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1949-05-27;260';
const IT_SAN_FRANCESCO = 'https://www.normattiva.it/eli/id/2025/10/10/25G00153/ORIGINAL';
const SI_SCHULE_2627 =
  'https://www.gov.si/assets/ministrstva/MVI/Dokumenti/Osnovna-sola/Solski-koledar/2026_2027/Podrobnejsa-navodila-o-solskem-koledarju-za-OS-za-sol-leto-2026-2027.pdf';
const SI_VERORDNUNG = 'https://www.uradni-list.si/glasilo-uradni-list-rs/vsebina/109154';
const SI_FEIERTAGE = 'https://www.gov.si/teme/drzavni-prazniki-in-dela-prosti-dnevi/';

const IT_SI_HOLIDAYS: SchoolHoliday[] = [
  // Italien: Friaul-Julisch Venetien und Venetien je halber Anteil am Markt
  {
    from: '2026-12-23',
    to: '2027-01-06',
    country: 'IT',
    regions: 'alle',
    share: 0.5,
    label: 'Weihnachtsferien Friaul',
    confirmed: true,
    source: FVG_2627,
  },
  {
    from: '2026-12-24',
    to: '2027-01-06',
    country: 'IT',
    regions: 'alle',
    share: 0.5,
    label: 'Weihnachtsferien Venetien',
    confirmed: true,
    source: VENETO_2627,
  },
  {
    from: '2027-02-06',
    to: '2027-02-10',
    country: 'IT',
    regions: 'alle',
    share: 1,
    label: 'Carnevale Friaul, Venetien',
    confirmed: true,
    source: FVG_2627,
  },
  {
    from: '2027-02-11',
    to: '2027-02-14',
    country: 'IT',
    regions: 'alle',
    share: 0.3,
    label: 'Settimana bianca Italien (Erfahrungswert)',
    confirmed: false,
    source: VENETO_2627,
  },
  {
    from: '2027-03-25',
    to: '2027-03-30',
    country: 'IT',
    regions: 'alle',
    share: 1,
    label: 'Osterferien Friaul, Venetien',
    confirmed: true,
    source: FVG_2627,
  },
  {
    from: '2027-04-29',
    to: '2027-05-02',
    country: 'IT',
    regions: 'alle',
    share: 0.5,
    label: 'Ponte 1. Mai Venetien',
    confirmed: true,
    source: VENETO_2627,
  },
  {
    from: '2027-06-09',
    to: '2027-09-12',
    country: 'IT',
    regions: 'alle',
    share: 1,
    label: 'Sommerferien Friaul, Venetien',
    confirmed: true,
    source: FVG_2627,
  },
  {
    from: '2027-08-07',
    to: '2027-08-22',
    country: 'IT',
    regions: 'alle',
    share: 1,
    label: 'Ferragosto-Wochen Italien',
    confirmed: false,
    source: IT_FEIERTAGE,
  },
  {
    from: '2027-12-24',
    to: '2028-01-06',
    country: 'IT',
    regions: 'alle',
    share: 1,
    label: 'Weihnachtsferien Friaul, Venetien',
    confirmed: false,
    source: FVG_KALENDER,
  },
  {
    from: '2028-02-26',
    to: '2028-03-05',
    country: 'IT',
    regions: 'alle',
    share: 0.6,
    label: 'Carnevale/Settimana bianca Friaul, Venetien',
    confirmed: false,
    source: VENETO_KALENDER,
  },
  // Slowenien: Winterferien in zwei Gruppen (Ost mit Koroška, West mit Ljubljana)
  {
    from: '2026-10-24',
    to: '2026-11-01',
    country: 'SI',
    regions: 'alle',
    label: 'Herbstferien Slowenien',
    confirmed: true,
    source: SI_SCHULE_2627,
  },
  {
    from: '2026-12-25',
    to: '2027-01-03',
    country: 'SI',
    regions: 'alle',
    label: 'Neujahrsferien Slowenien',
    confirmed: true,
    source: SI_SCHULE_2627,
  },
  {
    from: '2027-02-13',
    to: '2027-02-21',
    country: 'SI',
    regions: 'alle',
    share: 0.45,
    label: 'Winterferien Slowenien Ost',
    confirmed: true,
    source: SI_SCHULE_2627,
  },
  {
    from: '2027-02-20',
    to: '2027-02-28',
    country: 'SI',
    regions: 'alle',
    share: 0.55,
    label: 'Winterferien Slowenien West (Ljubljana)',
    confirmed: true,
    source: SI_SCHULE_2627,
  },
  {
    from: '2027-04-24',
    to: '2027-05-02',
    country: 'SI',
    regions: 'alle',
    label: 'Maiferien Slowenien',
    confirmed: true,
    source: SI_SCHULE_2627,
  },
  {
    from: '2027-06-25',
    to: '2027-08-31',
    country: 'SI',
    regions: 'alle',
    label: 'Sommerferien Slowenien',
    confirmed: true,
    source: SI_SCHULE_2627,
  },
  {
    from: '2027-10-23',
    to: '2027-11-01',
    country: 'SI',
    regions: 'alle',
    label: 'Herbstferien Slowenien',
    confirmed: false,
    source: SI_VERORDNUNG,
  },
  {
    from: '2027-12-25',
    to: '2028-01-02',
    country: 'SI',
    regions: 'alle',
    label: 'Neujahrsferien Slowenien',
    confirmed: false,
    source: SI_VERORDNUNG,
  },
  {
    from: '2028-02-19',
    to: '2028-02-27',
    country: 'SI',
    regions: 'alle',
    share: 0.55,
    label: 'Winterferien Slowenien West (Ljubljana)',
    confirmed: false,
    source: SI_VERORDNUNG,
  },
  {
    from: '2028-02-26',
    to: '2028-03-05',
    country: 'SI',
    regions: 'alle',
    share: 0.45,
    label: 'Winterferien Slowenien Ost',
    confirmed: false,
    source: SI_VERORDNUNG,
  },
];

const IT_SI_PUBLIC: PublicHoliday[] = [
  {
    date: '2026-11-01',
    country: 'IT',
    regions: 'alle',
    label: 'Ognissanti (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2026-12-08',
    country: 'IT',
    regions: 'alle',
    label: 'Immacolata (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-03-29',
    country: 'IT',
    regions: 'alle',
    label: 'Pasquetta (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-04-25',
    country: 'IT',
    regions: 'alle',
    label: 'Festa della Liberazione (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-05-01',
    country: 'IT',
    regions: 'alle',
    label: 'Festa del Lavoro (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-06-02',
    country: 'IT',
    regions: 'alle',
    label: 'Festa della Repubblica (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-10-04',
    country: 'IT',
    regions: 'alle',
    label: 'San Francesco (IT)',
    source: IT_SAN_FRANCESCO,
  },
  {
    date: '2027-11-01',
    country: 'IT',
    regions: 'alle',
    label: 'Ognissanti (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-12-08',
    country: 'IT',
    regions: 'alle',
    label: 'Immacolata (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2028-01-06',
    country: 'IT',
    regions: 'alle',
    label: 'Epifania (IT)',
    source: IT_FEIERTAGE,
  },
  {
    date: '2027-02-08',
    country: 'SI',
    regions: 'alle',
    label: 'Prešeren-Tag (SI)',
    source: SI_FEIERTAGE,
  },
  {
    date: '2027-06-25',
    country: 'SI',
    regions: 'alle',
    label: 'Staatsfeiertag (SI)',
    source: SI_FEIERTAGE,
  },
  {
    date: '2027-11-01',
    country: 'SI',
    regions: 'alle',
    label: 'Gedenktag (SI)',
    source: SI_FEIERTAGE,
  },
  {
    date: '2028-02-08',
    country: 'SI',
    regions: 'alle',
    label: 'Prešeren-Tag (SI)',
    source: SI_FEIERTAGE,
  },
];

// ---------------------------------------------------------------- Tschechien, Slowakei, Ungarn, Schweiz
const CZ_2627 = 'https://msmt.gov.cz/organizace-skolniho-roku';
const CZ_2728 =
  'https://msmt.gov.cz/media/wp-content/uploads/2025/08/Organizace_skolniho_roku_2027_2028lv.pdf';
const CZ_FEIERTAGE = 'https://e-sbirka.gov.cz/sb/2000/245';
const SK_SCHULE = 'https://www.minedu.sk/data/att/a96/36583.42ace6.pdf';
const SK_FEIERTAGE = 'https://static.slov-lex.sk/static/SK/ZZ/1993/241/20251101.html';
const HU_SCHULE = 'https://njt.jog.gov.hu/jogszabaly/2026-1-20-9M';
const HU_FEIERTAGE = 'https://njt.jog.gov.hu/jogszabaly/2012-1-00-00';
const CH_ZH = 'https://data.stadt-zuerich.ch/dataset/ssd_schulferien';
const CH_ZH_EMPFEHLUNG =
  'https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/bildung/bildungssystem/schulferien/volksschulen/feriendaten_empfehlung_bis_2033.pdf';
const CH_BE =
  'https://www.akvb-gemeinden.bkd.be.ch/content/dam/akvb-gemeinden_bkd/dokumente/de/startseite/organisation-finanzierung/schulorganisation/schulferienplanung/schulferien-kanton-bern-d.pdf';
const CH_LU =
  'https://volksschulbildung.lu.ch/-/media/Volksschulbildung/Dokumente/syst_schulen/ss_schulsystem/schulferien/feriendaten_volksschulen_kt_luzern.pdf';
const CH_BS = 'https://www.bs.ch/themen/bildung-und-kinderbetreuung/schulferien';
const CH_ZG = 'https://zg.ch/de/bildung/bildungssystem/schulferien';
const CH_SG = 'https://www.sg.ch/bildung-sport/volksschule/aus-dem-amt/ferienplan.htm';

const CZ_SK_HU_CH_HOLIDAYS: SchoolHoliday[] = [
  // Tschechien: Frühjahrsferien wochenweise nach Bezirken (Anteil ≈ Bevölkerung)
  {
    from: '2026-10-28',
    to: '2026-11-01',
    country: 'CZ',
    regions: 'alle',
    label: 'Herbstferien Tschechien',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2026-12-23',
    to: '2027-01-03',
    country: 'CZ',
    regions: 'alle',
    label: 'Weihnachtsferien Tschechien',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-01-29',
    to: '2027-01-31',
    country: 'CZ',
    regions: 'alle',
    label: 'Halbjahresferien Tschechien',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-01-30',
    to: '2027-02-07',
    country: 'CZ',
    regions: 'alle',
    share: 0.14,
    label: 'Frühjahrsferien Tschechien (Liberec, Jihlava, Kladno)',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-02-06',
    to: '2027-02-14',
    country: 'CZ',
    regions: 'alle',
    share: 0.17,
    label: 'Frühjahrsferien Tschechien (Olomouc, Ústí, Tábor)',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-02-13',
    to: '2027-02-21',
    country: 'CZ',
    regions: 'alle',
    share: 0.17,
    label: 'Frühjahrsferien Tschechien (Budweis, Pardubice, Ostrava)',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-02-20',
    to: '2027-02-28',
    country: 'CZ',
    regions: 'alle',
    share: 0.22,
    label: 'Frühjahrsferien Prag 1–5, Brünn',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-02-27',
    to: '2027-03-07',
    country: 'CZ',
    regions: 'alle',
    share: 0.15,
    label: 'Frühjahrsferien Prag 6–10, Karlsbad',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-03-06',
    to: '2027-03-14',
    country: 'CZ',
    regions: 'alle',
    share: 0.15,
    label: 'Frühjahrsferien Pilsen, Zlín, Prag-Umland',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-03-25',
    to: '2027-03-29',
    country: 'CZ',
    regions: 'alle',
    label: 'Osterferien Tschechien',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-07-01',
    to: '2027-08-31',
    country: 'CZ',
    regions: 'alle',
    label: 'Sommerferien Tschechien',
    confirmed: true,
    source: CZ_2627,
  },
  {
    from: '2027-10-27',
    to: '2027-10-31',
    country: 'CZ',
    regions: 'alle',
    label: 'Herbstferien Tschechien',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2027-12-23',
    to: '2028-01-02',
    country: 'CZ',
    regions: 'alle',
    label: 'Weihnachtsferien Tschechien',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-02-04',
    to: '2028-02-06',
    country: 'CZ',
    regions: 'alle',
    label: 'Halbjahresferien Tschechien',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-02-05',
    to: '2028-02-13',
    country: 'CZ',
    regions: 'alle',
    share: 0.15,
    label: 'Frühjahrsferien Pilsen, Zlín, Prag-Umland',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-02-12',
    to: '2028-02-20',
    country: 'CZ',
    regions: 'alle',
    share: 0.14,
    label: 'Frühjahrsferien Tschechien (Liberec, Jihlava, Kladno)',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-02-19',
    to: '2028-02-27',
    country: 'CZ',
    regions: 'alle',
    share: 0.17,
    label: 'Frühjahrsferien Tschechien (Olomouc, Ústí, Tábor)',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-02-26',
    to: '2028-03-05',
    country: 'CZ',
    regions: 'alle',
    share: 0.17,
    label: 'Frühjahrsferien Tschechien (Budweis, Pardubice, Ostrava)',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-03-04',
    to: '2028-03-12',
    country: 'CZ',
    regions: 'alle',
    share: 0.22,
    label: 'Frühjahrsferien Prag 1–5, Brünn',
    confirmed: true,
    source: CZ_2728,
  },
  {
    from: '2028-03-11',
    to: '2028-03-19',
    country: 'CZ',
    regions: 'alle',
    share: 0.15,
    label: 'Frühjahrsferien Prag 6–10, Karlsbad',
    confirmed: true,
    source: CZ_2728,
  },
  // Slowakei
  {
    from: '2026-10-29',
    to: '2026-11-01',
    country: 'SK',
    regions: 'alle',
    label: 'Herbstferien Slowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2026-12-23',
    to: '2027-01-07',
    country: 'SK',
    regions: 'alle',
    label: 'Weihnachtsferien Slowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-02-13',
    to: '2027-02-21',
    country: 'SK',
    regions: 'alle',
    share: 0.33,
    label: 'Frühjahrsferien Mittel-/Nordslowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-02-20',
    to: '2027-02-28',
    country: 'SK',
    regions: 'alle',
    share: 0.3,
    label: 'Frühjahrsferien Ostslowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-02-27',
    to: '2027-03-07',
    country: 'SK',
    regions: 'alle',
    share: 0.37,
    label: 'Frühjahrsferien Bratislava, Westslowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-03-25',
    to: '2027-03-30',
    country: 'SK',
    regions: 'alle',
    label: 'Osterferien Slowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-07-01',
    to: '2027-08-31',
    country: 'SK',
    regions: 'alle',
    label: 'Sommerferien Slowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-10-28',
    to: '2027-11-01',
    country: 'SK',
    regions: 'alle',
    label: 'Herbstferien Slowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2027-12-23',
    to: '2028-01-09',
    country: 'SK',
    regions: 'alle',
    label: 'Weihnachtsferien Slowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2028-02-19',
    to: '2028-02-27',
    country: 'SK',
    regions: 'alle',
    share: 0.3,
    label: 'Frühjahrsferien Ostslowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2028-02-26',
    to: '2028-03-05',
    country: 'SK',
    regions: 'alle',
    share: 0.37,
    label: 'Frühjahrsferien Bratislava, Westslowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  {
    from: '2028-03-04',
    to: '2028-03-12',
    country: 'SK',
    regions: 'alle',
    share: 0.33,
    label: 'Frühjahrsferien Mittel-/Nordslowakei',
    confirmed: true,
    source: SK_SCHULE,
  },
  // Ungarn (keine Februar-Skiferien)
  {
    from: '2026-10-23',
    to: '2026-11-01',
    country: 'HU',
    regions: 'alle',
    label: 'Herbstferien Ungarn',
    confirmed: true,
    source: HU_SCHULE,
  },
  {
    from: '2026-12-19',
    to: '2027-01-03',
    country: 'HU',
    regions: 'alle',
    label: 'Winterferien Ungarn',
    confirmed: true,
    source: HU_SCHULE,
  },
  {
    from: '2027-03-25',
    to: '2027-04-04',
    country: 'HU',
    regions: 'alle',
    label: 'Frühjahrsferien Ungarn',
    confirmed: true,
    source: HU_SCHULE,
  },
  {
    from: '2027-06-19',
    to: '2027-08-31',
    country: 'HU',
    regions: 'alle',
    label: 'Sommerferien Ungarn',
    confirmed: false,
    source: HU_SCHULE,
  },
  // Schweiz: Sportferien je Kanton/Stadt, Anteil ≈ Einwohner der genannten Gebiete
  {
    from: '2026-12-19',
    to: '2027-01-03',
    country: 'CH',
    regions: 'alle',
    share: 0.7,
    label: 'Weihnachtsferien Zürich, Basel, Luzern, St. Gallen',
    confirmed: true,
    source: CH_ZH_EMPFEHLUNG,
  },
  {
    from: '2026-12-24',
    to: '2027-01-10',
    country: 'CH',
    regions: 'alle',
    share: 0.15,
    label: 'Winterferien Bern',
    confirmed: true,
    source: CH_BE,
  },
  {
    from: '2027-01-30',
    to: '2027-02-14',
    country: 'CH',
    regions: 'alle',
    share: 0.1,
    label: 'Sportferien Luzern, Aarau',
    confirmed: true,
    source: CH_LU,
  },
  {
    from: '2027-02-06',
    to: '2027-02-21',
    country: 'CH',
    regions: 'alle',
    share: 0.15,
    label: 'Sportferien Basel, Zug, Winterthur',
    confirmed: true,
    source: CH_BS,
  },
  {
    from: '2027-02-13',
    to: '2027-02-28',
    country: 'CH',
    regions: 'alle',
    share: 0.3,
    label: 'Sportferien Zürich',
    confirmed: true,
    source: CH_ZH,
  },
  {
    from: '2027-07-03',
    to: '2027-08-15',
    country: 'CH',
    regions: 'alle',
    share: 0.4,
    label: 'Sommerferien Bern, Basel, Luzern, Zug',
    confirmed: true,
    source: CH_BE,
  },
  {
    from: '2027-07-10',
    to: '2027-08-15',
    country: 'CH',
    regions: 'alle',
    share: 0.08,
    label: 'Sommerferien St. Gallen',
    confirmed: true,
    source: CH_SG,
  },
  {
    from: '2027-07-17',
    to: '2027-08-22',
    country: 'CH',
    regions: 'alle',
    share: 0.3,
    label: 'Sommerferien Zürich',
    confirmed: true,
    source: CH_ZH,
  },
  {
    from: '2027-12-18',
    to: '2028-01-02',
    country: 'CH',
    regions: 'alle',
    share: 0.55,
    label: 'Weihnachtsferien Zürich, Basel, Luzern, St. Gallen',
    confirmed: true,
    source: CH_ZH_EMPFEHLUNG,
  },
  {
    from: '2027-12-24',
    to: '2028-01-09',
    country: 'CH',
    regions: 'alle',
    share: 0.18,
    label: 'Winterferien Bern, Aarau',
    confirmed: true,
    source: CH_BE,
  },
  {
    from: '2028-02-05',
    to: '2028-02-20',
    country: 'CH',
    regions: 'alle',
    share: 0.06,
    label: 'Sportferien Zug, Winterthur',
    confirmed: true,
    source: CH_ZG,
  },
  {
    from: '2028-02-12',
    to: '2028-02-27',
    country: 'CH',
    regions: 'alle',
    share: 0.3,
    label: 'Sportferien Zürich',
    confirmed: true,
    source: CH_ZH,
  },
  {
    from: '2028-02-19',
    to: '2028-03-05',
    country: 'CH',
    regions: 'alle',
    share: 0.08,
    label: 'Sportferien Luzern',
    confirmed: true,
    source: CH_LU,
  },
  {
    from: '2028-02-26',
    to: '2028-03-12',
    country: 'CH',
    regions: 'alle',
    share: 0.1,
    label: 'Fasnachtsferien Basel',
    confirmed: true,
    source: CH_BS,
  },
];

const CZ_SK_HU_PUBLIC: PublicHoliday[] = [
  {
    date: '2026-11-17',
    country: 'CZ',
    regions: 'alle',
    label: 'Tag der Freiheit (CZ)',
    source: CZ_FEIERTAGE,
  },
  {
    date: '2027-09-28',
    country: 'CZ',
    regions: 'alle',
    label: 'Tag der Staatlichkeit (CZ)',
    source: CZ_FEIERTAGE,
  },
  {
    date: '2027-11-17',
    country: 'CZ',
    regions: 'alle',
    label: 'Tag der Freiheit (CZ)',
    source: CZ_FEIERTAGE,
  },
  {
    date: '2027-09-15',
    country: 'SK',
    regions: 'alle',
    label: 'Sieben Schmerzen Mariens (SK)',
    source: SK_FEIERTAGE,
  },
  {
    date: '2028-01-06',
    country: 'SK',
    regions: 'alle',
    label: 'Heilige Drei Könige (SK)',
    source: SK_FEIERTAGE,
  },
  {
    date: '2027-03-15',
    country: 'HU',
    regions: 'alle',
    label: 'Nationalfeiertag 1848 (HU)',
    source: HU_FEIERTAGE,
  },
  {
    date: '2027-05-17',
    country: 'HU',
    regions: 'alle',
    label: 'Pfingstmontag (HU)',
    source: HU_FEIERTAGE,
  },
  {
    date: '2027-08-20',
    country: 'HU',
    regions: 'alle',
    label: 'Stephanstag (HU)',
    source: HU_FEIERTAGE,
  },
  {
    date: '2027-11-01',
    country: 'HU',
    regions: 'alle',
    label: 'Allerheiligen (HU)',
    source: HU_FEIERTAGE,
  },
  {
    date: '2028-03-15',
    country: 'HU',
    regions: 'alle',
    label: 'Nationalfeiertag 1848 (HU)',
    source: HU_FEIERTAGE,
  },
];

// ---------------------------------------------------------------- Zusammen
export const DEMAND_SCHOOL_HOLIDAYS: SchoolHoliday[] = [
  ...AT_HOLIDAYS,
  ...DE_HOLIDAYS,
  ...IT_SI_HOLIDAYS,
  ...CZ_SK_HU_CH_HOLIDAYS,
];
export const DEMAND_HOLIDAYS: PublicHoliday[] = [
  ...AT_PUBLIC,
  ...DE_PUBLIC,
  ...IT_SI_PUBLIC,
  ...CZ_SK_HU_PUBLIC,
];
export const DEMAND_EVENTS: DemandEvent[] = EVENTS_DATA;
export const SEASONS: Season[] = SEASONS_DATA;
