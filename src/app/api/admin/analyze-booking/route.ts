import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  ANTHROPIC_API_KEY?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

// Transaction from payment plan
interface Transaction {
  date: string;           // YYYY-MM-DD
  amount: number;         // Positive for payments, positive for refunds too
  type: 'payment' | 'refund';
  status: 'paid' | 'refunded' | 'pending';
  description?: string;
  fee?: number;           // Processing fee (positive for payments, negative for refund fee credits)
}

interface BookingData {
  guest_name: string;
  nationality: string;
  email: string;
  phone: string;
  address?: string;       // Guest address from communication
  arrival_date: string;
  departure_date: string;
  adults: number;
  children: number;
  children_ages: string;
  platform: string;
  booking_number: string;
  rental_price: number;  // Gesamtauszahlung (what owner receives)
  net_rent?: number;     // Netto Miete for commission calculation (base_rent - discount + management_fee)
  first_contact_date: string;
  notes: string;
  communication?: string; // Messages from PDF documents
  // Neue Billing-Logik
  guest_total_payment?: number;  // Gesamtzahlung Gast
  platform_fees?: number;        // Gebühren Plattform (Service + Zahlung kombiniert)
  service_fee?: number;          // Servicegebühr für Gäste (wird vom Gast gezahlt)
  payment_processing_fees?: number; // Netto Zahlungsbearbeitungsgebühren (nach Erstattungen)
  payout_amount?: number;        // Gesamtauszahlung
  payout_date?: string;          // Datum der Auszahlung an Vermieter (YYYY-MM-DD)
  // Einnahmen-Aufteilung
  nebenkosten_income?: number;   // NK-Einnahmen (Wasser + Strom + Heizung)
  cleaning_fee_income?: number;  // Reinigungsgebühr inkl. Haustiere
  kurtaxe_income?: number;       // Kurtaxe (Verwaltungsgebühr bei FeWo)
  // Transactions from payment plan
  transactions?: Transaction[];
  // FeWo/Vrbo breakdown (informational only, not for cost tracking)
  fewo_breakdown?: {
    base_rent?: number;           // Raten pro Nacht
    extra_guest_fee?: number;     // Gebühr für zusätzliche Gäste
    extra_night_fee?: number;     // Gebühr für zusätzliche Nächte
    discount?: number;            // Frühbucher-Promotion (negative)
    management_fee?: number;      // Verwaltungsgebühr = Kurtaxe
    water?: number;
    electricity?: number;
    heating?: number;
    cleaning?: number;
    nebenkosten_paid_on_site?: boolean; // True if NK are paid at property (not in PDF)
  };
  // Platform payment indicator
  platform_payment?: boolean;
}

// Country code mapping for nationality detection
const COUNTRY_CODES: Record<string, string> = {
  'deutschland': 'DE', 'germany': 'DE', 'german': 'DE', 'deutsch': 'DE',
  'österreich': 'AT', 'austria': 'AT', 'austrian': 'AT',
  'schweiz': 'CH', 'switzerland': 'CH', 'swiss': 'CH',
  'niederlande': 'NL', 'netherlands': 'NL', 'dutch': 'NL', 'holland': 'NL',
  'belgien': 'BE', 'belgium': 'BE', 'belgian': 'BE',
  'frankreich': 'FR', 'france': 'FR', 'french': 'FR',
  'italien': 'IT', 'italy': 'IT', 'italian': 'IT',
  'spanien': 'ES', 'spain': 'ES', 'spanish': 'ES',
  'großbritannien': 'GB', 'uk': 'GB', 'britain': 'GB', 'british': 'GB', 'england': 'GB',
  'polen': 'PL', 'poland': 'PL', 'polish': 'PL',
  'tschechien': 'CZ', 'czech': 'CZ', 'czechia': 'CZ',
  'dänemark': 'DK', 'denmark': 'DK', 'danish': 'DK',
  'schweden': 'SE', 'sweden': 'SE', 'swedish': 'SE',
  'norwegen': 'NO', 'norway': 'NO', 'norwegian': 'NO',
  'usa': 'US', 'united states': 'US', 'american': 'US',
  'kroatien': 'HR', 'croatia': 'HR', 'croatian': 'HR',
  'slowenien': 'SI', 'slovenia': 'SI', 'slovenian': 'SI',
  'ungarn': 'HU', 'hungary': 'HU', 'hungarian': 'HU',
  'rumänien': 'RO', 'romania': 'RO', 'romanian': 'RO',
  'slowakei': 'SK', 'slovakia': 'SK', 'slovak': 'SK',
};

// Phone prefix to country code mapping
const PHONE_PREFIX_TO_COUNTRY: Record<string, string> = {
  '49': 'DE',   // Germany
  '43': 'AT',   // Austria
  '41': 'CH',   // Switzerland
  '31': 'NL',   // Netherlands
  '32': 'BE',   // Belgium
  '33': 'FR',   // France
  '39': 'IT',   // Italy
  '34': 'ES',   // Spain
  '44': 'GB',   // UK
  '48': 'PL',   // Poland
  '420': 'CZ',  // Czech Republic
  '45': 'DK',   // Denmark
  '46': 'SE',   // Sweden
  '47': 'NO',   // Norway
  '1': 'US',    // USA/Canada
  '385': 'HR',  // Croatia
  '386': 'SI',  // Slovenia
  '36': 'HU',   // Hungary
  '40': 'RO',   // Romania
  '421': 'SK',  // Slovakia
  '352': 'LU',  // Luxembourg
  '353': 'IE',  // Ireland
  '30': 'GR',   // Greece
  '351': 'PT',  // Portugal
  '358': 'FI',  // Finland
  '359': 'BG',  // Bulgaria
  '370': 'LT',  // Lithuania
  '371': 'LV',  // Latvia
  '372': 'EE',  // Estonia
  '381': 'RS',  // Serbia
  '387': 'BA',  // Bosnia
};

// Detect nationality from phone number prefix
function getNationalityFromPhone(phone: string): string {
  if (!phone) return '';

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Handle different formats: +49, 0049, 49
  let prefix = cleaned;
  if (prefix.startsWith('+')) {
    prefix = prefix.substring(1);
  } else if (prefix.startsWith('00')) {
    prefix = prefix.substring(2);
  }

  // Try matching longest prefixes first (e.g., 420 before 42)
  const sortedPrefixes = Object.keys(PHONE_PREFIX_TO_COUNTRY).sort((a, b) => b.length - a.length);

  for (const countryPrefix of sortedPrefixes) {
    if (prefix.startsWith(countryPrefix)) {
      return PHONE_PREFIX_TO_COUNTRY[countryPrefix] ?? '';
    }
  }

  return '';
}

function normalizeNationality(nationality: string): string {
  if (!nationality) return '';
  const lower = nationality.toLowerCase().trim();
  return COUNTRY_CODES[lower] || nationality.toUpperCase().slice(0, 2);
}

// Capitalize each word in a name (nikola kovacevic → Nikola Kovacevic)
function capitalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Normalize platform name (must match GuestDatabase dropdown values)
function normalizePlatform(platform: string): string {
  if (!platform) return '';
  const lower = platform.toLowerCase();
  if (lower.includes('booking')) return 'Booking.com';
  if (lower.includes('fewo') || lower.includes('ferienwohnung') || lower.includes('vrbo')) return 'FeWo';
  if (lower.includes('feratel')) return 'Feratel';
  if (lower.includes('airbnb')) return 'Airbnb';
  if (lower.includes('mail') || lower.includes('direkt') || lower.includes('telefon')) return 'Mail';
  return platform;
}

// POST - Analyze a booking screenshot using Claude API
export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const apiKey = env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY is not configured',
        success: false
      }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // Determine media type and content type for Claude
    const mediaType = file.type || 'image/png';
    const isPdf = mediaType === 'application/pdf';

    console.log('Analyzing file with Claude, size:', arrayBuffer.byteLength, 'bytes, type:', mediaType, 'isPdf:', isPdf);

    // Build content array based on file type
    const fileContent = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64Data
          }
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType as 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp',
            data: base64Data
          }
        };

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Haiku 4.5 - faster and cheaper
        max_tokens: 16384, // High limit for PDFs with extensive communication
        messages: [
          {
            role: 'user',
            content: [
              fileContent,
              {
                type: 'text',
                text: `Analysiere ${isPdf ? 'dieses PDF-Dokument' : 'diesen Buchungs-Screenshot'} und extrahiere die Gastdaten.

PLATTFORM-ERKENNUNG (WICHTIG):
- Wenn du "FeWo-direkt" oder "Vrbo" irgendwo im Text siehst → platform = "FeWo"
- Texte wie "FeWo-direkt-Website", "über Vrbo gebucht", "Vrbo" → IMMER platform = "FeWo"
- Wenn du "Booking.com" siehst → platform = "Booking.com"
- Wenn du "Airbnb" siehst → platform = "Airbnb"
- Wenn du "Feratel" siehst → platform = "Feratel"

Extrahiere NUR Informationen die TATSÄCHLICH SICHTBAR sind. Erfinde KEINE Daten.

Suche nach diesen Feldern (verschiedene Bezeichnungen je nach Plattform):
- Name des Gasts (z.B. "Martin Mundorf", "nikola kovacevic")
- Nationalität/Land (z.B. "Deutschland", "Austria", etc.)
- E-Mail-Adresse (z.B. @guest.booking.com oder @googlemail.com)
- Telefonnummer (z.B. "+49 015...")
- Adresse des Gasts (oft in der Kommunikation zu finden, z.B. "Luxemburger Straße 15, 65428 Rüsselsheim")
- Check-in/Anreise Datum
- Check-out/Abreise Datum
- Anzahl Erwachsene (z.B. "4 Erwachsene")
- Anzahl Kinder
- Alter der Kinder (falls angegeben, z.B. "5, 8")
- Buchungsnummer/Reservierungsnr. (z.B. "HA-XK8WNH")
- Buchungsdatum (wann die Buchung erstellt wurde, z.B. "Am Mo., 15. Dez. über Vrbo gebucht")

WICHTIG - Extrahiere die BILLING-INFORMATIONEN (BEI FEWO AUF SEITE 2!):
- "Gesamtzahlung des Gastes" (bei FeWo auf Seite 2, z.B. "Gesamtzahlung des Gastes: 1209.46") - was der Gast insgesamt bezahlt hat inkl. Servicegebühr
- Gebühren Plattform (Servicegebühr + Zahlungsgebühren zusammen)
- "Ihre Gesamtauszahlung" (bei FeWo auf Seite 2, z.B. "Ihre Gesamtauszahlung: EUR 1012.52") - was der Vermieter tatsächlich erhält
- ACHTUNG: Die "Voraussichtliche Auszahlung für X Nächte" auf Seite 1 ist NUR der Mietpreis, NICHT die Gesamtauszahlung! Die echte Gesamtauszahlung steht auf Seite 2!

BEI FEWO/VRBO PDFs - Extrahiere den ZAHLUNGSPLAN (Transaktionen):
Im PDF findest du einen Abschnitt "Zahlungsplan" mit Datum, Status und Beträgen.
- Jede Zeile ist eine separate Transaktion (Zahlung 1/2, Zahlung 2/2, Erstattungen)
- Zahlungen haben positive Beträge (z.B. "452,46 €", "879 €")
- Erstattungen haben ebenfalls positive Beträge aber "Erstattet" als Status
- WICHTIG: Teilerstattungen sind möglich! Z.B. kann eine Zahlung von 452,46€ eine Teilerstattung von 122€ haben
- Extrahiere ALLE Transaktionen in chronologischer Reihenfolge

SEHR WICHTIG - ZWEI VERSCHIEDENE DATUMSTYPEN:
1. TRANSAKTIONS-DATUM (wann der GAST bezahlt hat):
   - Suche nach "Der Gast hat am XX.XX.XXXX bezahlt" - das ist wann der Gast an die Plattform gezahlt hat
   - Bei Erstattungen: "Erstattet am XX.XX.XXXX" oder "geleistet am XX.XX.XXXX"
   - Diese Daten kommen in die transactions[].date

2. AUSZAHLUNGS-DATUM (wann der VERMIETER das Geld erhält):
   - Suche nach "Wir haben Ihre Auszahlung am XX.XX.XXXX" oder "Auszahlung am XX.XX.XXXX"
   - Das ist EIN Datum für die gesamte Buchung - wann das Geld auf dem Konto des Vermieters ankommt
   - Dieses Datum kommt in das Feld "payout_date" (Format: DD.MM.YYYY)
   - WICHTIG: Bei FeWo erfolgt die Auszahlung meist erst wenn der Gast anreist!

Auch die ZAHLUNGSBEARBEITUNGSGEBÜHREN extrahieren (SEHR WICHTIG für korrekte Gebührenberechnung):
- Jede Zahlung hat eine "Zahlungsbearbeitungsgebühr" (z.B. "15,69 €")
- Bei Erstattungen gibt es eine NEGATIVE Gebührenerstattung (z.B. "-5,32 €" bei der Erstattung)
- BERECHNE DIE NETTO-GEBÜHREN: Summe aller positiven Gebühren + Summe aller negativen Gebühren (Erstattungen)
- Beispiel: Zahlung 1 hat 15,69€ Gebühr, Erstattung hat -5,32€ Gebühr, Zahlung 2 hat 30,47€ Gebühr
  -> Netto-Gebühren = 15,69 + (-5,32) + 30,47 = 40,84€
- WICHTIG: Die Gebühren stehen im Zahlungsplan unter jeder Transaktion als "Zahlungsbearbeitungsgebühr"

GANZ WICHTIG - UNTERSCHEIDE ZWEI VERSCHIEDENE GEBÜHREN:

1. "Servicegebühr für Gäste" (z.B. 229.67€):
   - Das zahlt der GAST an FeWo direkt!
   - Der Vermieter sieht dieses Geld NIE!
   - Kommt NICHT in platform_fees, nur in service_fee (zur Info)

2. "Zahlungsbearbeitungsgebühr" (z.B. 66.20€):
   - Das sind die EINZIGEN echten Kosten für den Vermieter!
   - Wird von der Auszahlung abgezogen
   - Kommt in platform_fees UND payment_processing_fees

- "Zahlungsbearbeitungsgebühr" bei Zahlungen: Hat Minus-Zeichen (z.B. -15.69€, -50.51€)
- "Zahlungsbearbeitungsgebühr" bei Erstattungen: Ist eine Gutschrift (reduziert Kosten)

SO BERECHNEST DU DIE FELDER:
- platform_fees = NUR Summe aller Zahlungsbearbeitungsgebühren (z.B. 66.20€)
- payment_processing_fees = gleicher Wert wie platform_fees (z.B. 66.20€)
- service_fee = NUR die Servicegebühr für Gäste (z.B. 229.67€) - zur Info, keine Kosten!

BEI FEWO/VRBO - Extrahiere die Aufschlüsselung aus "Zahlungsdetails" (SEHR WICHTIG):
- Raten pro Nacht (z.B. "Raten pro Nacht (7 Nächte): 1645.00") -> base_rent
- Gebühr für zusätzliche Gäste (z.B. "Gebühr für zusätzliche Gäste: 210.00") -> extra_guest_fee - WICHTIG: Das gehört zur Miete!
- Gebühr für zusätzliche Nächte (z.B. "Gebühr für zusätzliche Nächte: 142.00") -> extra_night_fee
- Frühbucher-Rabatt (z.B. "Frühbucher-Promotion: -99.40") -> discount
- Verwaltungsgebühr = das ist die KURTAXE! (z.B. "Verwaltungsgebühr: 86.80") -> management_fee / kurtaxe
- Wasser (z.B. "Wasser: 28.00") -> water
- Strom (z.B. "Gebühr für den Stromverbrauch: 112.00") -> electricity
- Heizkosten (z.B. "Gebühr für die Heizkosten: 63.00") -> heating
- Reinigung = "Reinigungsgebühr" + "Gebühr für Haustiere" zusammenrechnen!
  - Reinigungsgebühr: 100€ (oder 95€ bei älteren Buchungen)
  - Gebühr für Haustiere: 25€ pro Hund (z.B. 1 Hund = 25€, 2 Hunde = 50€)
  - Beispiel: 100 + 25 = 125€ bei 1 Hund, oder 100 + 50 = 150€ bei 2 Hunden -> cleaning
- Servicegebühr für Gäste (z.B. "Servicegebühr für Gäste: 229.67") -> guest_service_fee
Diese Werte stehen im Abschnitt "Zahlungsdetails" VOR der "Gesamtzahlung des Gastes"!

WICHTIG - NEBENKOSTEN VOR ORT (paid_on_site):
- Manche älteren Buchungen haben KEINE Nebenkosten (Wasser/Strom/Heizung) im PDF!
- Das bedeutet, dass die Nebenkosten VOR ORT bar bezahlt werden
- Erkennbar daran: Im PDF stehen NUR "Raten pro Nacht" und evtl. "Reinigungsgebühr", aber KEINE Wasser/Strom/Heizkosten
- Bei solchen Buchungen setze: nebenkosten_paid_on_site: true

BEI PDF-DOKUMENTEN - Extrahiere KOMMUNIKATION/NACHRICHTEN (SEHR WICHTIG):
- Bei FeWo/Vrbo PDFs: Die Nachrichten beginnen NACH dem Text "Um Ihre Zahlung zu schützen, kommunizieren und bezahlen Sie immer über die FeWo-direkt-Website oder -App."
- WICHTIG: Die Kommunikation kann sich über MEHRERE SEITEN erstrecken! Lies ALLE Seiten bis zum Ende des PDFs!

UNTERSCHEIDE zwischen SYSTEM-EVENTS und ECHTEN NACHRICHTEN:

SYSTEM-EVENTS (NICHT in communication aufnehmen!):
- "[Name] hat eine Buchungsanfrage gesendet."
- "Sie haben die Buchungsanfrage sofort bestätigt."
- "Sie haben die Buchung von [Name] vorläufig bestätigt."
- "[Name] reist heute an." / "[Name] ist abgereist."
- "[Name] hat eine Zahlung geleistet."
- "Sie haben den Aufenthalt von [Name] bewertet."
- "[Name] hat eine Bewertung abgegeben."
- "Sie haben [Name] eine Erstattung gesendet."
- "Sie haben die Buchung geändert."
- "Sie haben eine Zahlung angefordert."

ECHTE NACHRICHTEN (DIESE in communication aufnehmen!):
- Nachrichten vom GAST: Stehen unter dem Gastnamen (z.B. "Helen Britz", "Martin Mundorf", "Eva Kampka")
  - Enthalten oft: Begrüßungen, Fragen, Adressen, Familieninfos, Sonderwünsche
  - Beispiel: "Hallo Frau Brenneisen, meine Frau Bianca, unser Sohn Tim..."
- Nachrichten vom GASTGEBER: Stehen unter "Sie"
  - Enthalten oft: Willkommensnachrichten, Anleitungen, Anreiseinformationen
  - Beispiel: "Sehr geehrte Frau Britz, vielen Dank für Ihr Vertrauen..."

EXTRAKTIONS-FORMAT:
- Format: "DD.MM.YYYY HH:MM - [Gast/Gastgeber]: [Vollständiger Nachrichtentext]"
- Konvertiere Datumsformat von "17. Jan. 2024" zu "17.01.2024"
- Extrahiere den VOLLSTÄNDIGEN Text jeder Nachricht - auch über mehrere Absätze!
- Trenne Nachrichten durch Zeilenumbruch (\n)

ADRESS-EXTRAKTION (BESONDERS WICHTIG!):
- Suche in den Gast-Nachrichten nach Adressen wie:
  - "Ziegeleistraße 71, 67122 Altrip"
  - "Luxemburger Straße 15 65428 Rüsselsheim"
  - "Musterstraße 1, 12345 Berlin"
- Wenn eine Adresse gefunden wird, trage sie auch in das "address" Feld ein!

BEISPIEL für korrekte Extraktion:
  "17.01.2024 14:36 - Gastgeber: Sehr geehrte Frau Kampka, vielen Dank für Ihr Vertrauen und der damit verbundenen Buchung. Bitte geben Sie mir noch Ihre vollständige Adresse zu meiner Information.
  24.01.2024 17:53 - Gast: Hallo Frau Brenneisen, anbei noch die vollständige Adresse: Ziegeleistraße 71, 67122 Altrip. Wir freuen uns schon sehr auf den Aufenthalt."

- Wenn keine echten Nachrichten vorhanden sind (nur System-Events), lasse das Feld leer

EXTRAHIERE AUS DER KOMMUNIKATION auch folgende Infos (falls vorhanden):
- Kinderalter: z.B. "Unsere Kinder Amelie und Tim sind 17 Jahre alt" -> children_ages: "17, 17"
- Haustiere: z.B. "unser Hund Tom" -> notiere in notes: "Hund: Tom"
- Ankunftszeit: z.B. "Wir kommen gegen 15 Uhr" -> notiere in notes: "Ankunft ca. 15 Uhr"
- Sonderwünsche: z.B. "Brauchen Kinderbett" -> notiere in notes

WICHTIG: Schreibe NICHT "Unterkunftsnr." oder "Unterkunftsnummer" in die Notizen - diese Information ist nicht relevant.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "guest_name": "Name wie angezeigt",
  "nationality": "Land/Nationalität falls sichtbar, sonst leer (NICHT Unterkunftsnr!)",
  "email": "E-Mail wie angezeigt",
  "phone": "Telefon falls sichtbar, sonst leer",
  "address": "WICHTIG: Suche die Adresse in den Gast-Nachrichten! Format: 'Straße Nr, PLZ Ort' z.B. 'Ziegeleistraße 71, 67122 Altrip' oder 'Luxemburger Straße 15 65428 Rüsselsheim'. Leer falls nicht gefunden.",
  "arrival_date": "YYYY-MM-DD",
  "departure_date": "YYYY-MM-DD",
  "adults": Zahl,
  "children": Zahl,
  "children_ages": "Alter der Kinder kommagetrennt, z.B. '5, 8'",
  "platform": "FeWo oder Booking.com oder Airbnb oder Feratel",
  "booking_number": "Nummer wie angezeigt",
  "guest_total_payment": "Gesamtzahlung des Gastes" - der GROSSE Betrag BEVOR die Gebühren abgezogen werden (z.B. 2084.67) - das ist Miete+Zusatzgäste+Servicegebühr!,
  "platform_fees": NUR die "Zahlungsbearbeitungsgebühr" (z.B. 66.20) - NIEMALS die "Servicegebühr für Gäste"! Die Servicegebühr (229.67) zahlt der Gast an FeWo, nicht der Vermieter!,
  "service_fee": "Servicegebühr für Gäste" (z.B. 229.67) - das ist die FeWo-Gebühr die der GAST zahlt, NICHT der Vermieter,
  "payment_processing_fees": "Zahlungsbearbeitungsgebühr" (z.B. 66.20) - das sind die EINZIGEN Kosten für den Vermieter!,
  "payout_amount": "Ihre Gesamtauszahlung" - der KLEINERE Betrag NACHDEM Gebühren abgezogen wurden (z.B. 2630.62) - das kommt auf dem Konto an!,
  "payout_date": "DD.MM.YYYY - Datum von 'Wir haben Ihre Auszahlung am XX' - wann das Geld beim Vermieter ankommt",
  "rental_price": NUR die Grundmiete "Raten pro Nacht" (z.B. 2400) - OHNE NK, OHNE Reinigung, OHNE Gebühren!,
  "first_contact_date": "YYYY-MM-DD (Buchung eingegangen)",
  "notes": "",
  "communication": "NUR echte Nachrichten (Gast/Gastgeber), KEINE System-Events! Format: 'DD.MM.YYYY HH:MM - Gast/Gastgeber: Text'. Leer wenn keine echten Nachrichten vorhanden.",
  "transactions": [
    {
      "date": "DD.MM.YYYY - Wann der GAST bezahlt hat ('Der Gast hat am XX bezahlt'). Bei Erstattung: 'geleistet am XX' Datum.",
      "amount": Betrag als Zahl (immer positiv),
      "type": "payment" oder "refund",
      "status": "paid" oder "refunded" oder "pending",
      "description": "Kurze Beschreibung, z.B. 'Zahlung 1/2' oder 'Teilerstattung'",
      "fee": Zahlungsbearbeitungsgebühr für diese Transaktion (positiv bei Zahlung, negativ bei Erstattung) oder 0
    }
  ],
  "fewo_breakdown": {
    "base_rent": Raten pro Nacht als Zahl (z.B. 2400) oder null,
    "extra_guest_fee": Gebühr für zusätzliche Gäste als Zahl (z.B. 210) oder null,
    "extra_night_fee": Gebühr für zusätzliche Nächte als Zahl (z.B. 142) oder null,
    "discount": Frühbucher-Rabatt als negative Zahl oder null,
    "management_fee": Verwaltungsgebühr = KURTAXE als Zahl (z.B. 86.80) oder null,
    "water": Wasser als Zahl (z.B. 28) oder null,
    "electricity": Strom/Stromverbrauch als Zahl (z.B. 112) oder null,
    "heating": Heizkosten als Zahl (z.B. 63) oder null,
    "cleaning": Reinigung INKL. Haustiergebühr - summiere "Reinigungsgebühr" + "Gebühr für Haustiere" (z.B. 100+25=125 bei 1 Hund, 100+50=150 bei 2 Hunden) oder null,
    "guest_service_fee": Servicegebühr für Gäste als Zahl (z.B. 395.08) - das ist die FeWo-Plattformgebühr die der Gast zahlt!,
    "nebenkosten_paid_on_site": true falls KEINE Wasser/Strom/Heizkosten im PDF sind (dann zahlt Gast vor Ort bar), false oder null wenn NK im PDF enthalten sind
  }
}

WICHTIG: Gib NUR das JSON zurück, keinen anderen Text.`
              }
            ]
          }
        ]
      })
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errorText);
      return NextResponse.json({
        error: `Claude API error: ${claudeResponse.status}`,
        success: false,
        debug: { status: claudeResponse.status, response: errorText.substring(0, 500) }
      }, { status: 500 });
    }

    const claudeData = await claudeResponse.json() as {
      content: Array<{ type: string; text?: string }>;
    };

    console.log('Claude response:', JSON.stringify(claudeData).substring(0, 500));

    // Extract text from Claude response
    const textContent = claudeData.content?.find(c => c.type === 'text');
    const responseText = textContent?.text || '';

    // Parse JSON from response
    let bookingData: BookingData;

    try {
      // Try to find JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const platform = normalizePlatform(parsed.platform || '');
        const isFeWo = platform === 'FeWo';

        // Extract FeWo breakdown if present (informational only)
        const fb = parsed.fewo_breakdown;
        const fewoBreakdown = fb ? {
          base_rent: fb.base_rent ? parseFloat(fb.base_rent) : undefined,
          extra_guest_fee: fb.extra_guest_fee ? parseFloat(fb.extra_guest_fee) : undefined,
          extra_night_fee: fb.extra_night_fee ? parseFloat(fb.extra_night_fee) : undefined,
          discount: fb.discount ? parseFloat(fb.discount) : undefined,
          management_fee: fb.management_fee ? parseFloat(fb.management_fee) : undefined,
          water: fb.water ? parseFloat(fb.water) : undefined,
          electricity: fb.electricity ? parseFloat(fb.electricity) : undefined,
          heating: fb.heating ? parseFloat(fb.heating) : undefined,
          cleaning: fb.cleaning ? parseFloat(fb.cleaning) : undefined,
          nebenkosten_paid_on_site: fb.nebenkosten_paid_on_site === true,
        } : undefined;

        // Calculate net_rent for commission: base_rent - discount + management_fee
        let netRent: number | undefined;
        if (isFeWo && fewoBreakdown?.base_rent) {
          const baseRent = fewoBreakdown.base_rent || 0;
          const discount = Math.abs(fewoBreakdown.discount || 0); // Make positive
          const mgmtFee = fewoBreakdown.management_fee || 0;
          netRent = baseRent - discount + mgmtFee;
        }

        // Try to get nationality from parsed data, or fall back to phone prefix detection
        const parsedNationality = normalizeNationality(parsed.nationality || '');
        const phoneBasedNationality = parsed.phone ? getNationalityFromPhone(parsed.phone) : '';
        const finalNationality = parsedNationality || phoneBasedNationality;

        // Parse billing fields
        const guestTotalPayment = parsed.guest_total_payment ? parseFloat(parsed.guest_total_payment) : undefined;
        const platformFeesAmount = parsed.platform_fees ? parseFloat(parsed.platform_fees) : undefined;
        const serviceFee = parsed.service_fee ? parseFloat(parsed.service_fee) : undefined;
        const paymentProcessingFees = parsed.payment_processing_fees ? parseFloat(parsed.payment_processing_fees) : undefined;
        const payoutAmount = parsed.payout_amount ? parseFloat(parsed.payout_amount) : (parseFloat(parsed.rental_price) || undefined);

        // Parse transactions array
        const transactions: Transaction[] = [];
        let totalFeesFromTransactions = 0;
        if (Array.isArray(parsed.transactions)) {
          for (const t of parsed.transactions) {
            if (t.date && t.amount !== undefined) {
              const isRefund = t.type === 'refund';
              let fee = t.fee !== undefined ? parseFloat(t.fee) : 0;

              // Normalize fee values:
              // - Payment fees should be POSITIVE (they are costs that reduce the payout)
              //   In the PDF they appear with minus signs, so we take absolute value
              // - Refund fees should be NEGATIVE (they are credits that reduce total costs)
              //   In the PDF they often appear WITHOUT minus signs, so we make them negative
              if (isRefund) {
                // Refund fee credit should always be negative
                fee = -Math.abs(fee);
              } else {
                // Payment fee cost should always be positive
                fee = Math.abs(fee);
              }

              totalFeesFromTransactions += fee;
              transactions.push({
                date: t.date,
                amount: parseFloat(t.amount) || 0,
                type: isRefund ? 'refund' : 'payment',
                status: t.status || 'paid',
                description: t.description || '',
                fee: fee
              });
            }
          }
        }

        // Calculate platform_fees: ONLY Zahlungsbearbeitungsgebühren!
        // Die "Servicegebühr für Gäste" ist KEINE Kosten für den Vermieter - das zahlt der Gast an FeWo
        // Der Vermieter sieht nur die Zahlungsbearbeitungsgebühr als Abzug
        // PRIORITÄT: payment_processing_fees aus dem PDF (66.20€) > Transaktions-Summe
        const finalPlatformFees = paymentProcessingFees ||
          (transactions.length > 0 ? totalFeesFromTransactions : undefined);

        // Calculate nebenkosten_income and cleaning_fee_income from fewo_breakdown
        let nebenkostenIncome: number | undefined;
        let cleaningFeeIncome: number | undefined;

        if (fewoBreakdown) {
          // NK = Wasser + Strom + Heizung (OHNE Verwaltungsgebühr/Kurtaxe - die ist separat)
          const water = fewoBreakdown.water || 0;
          const electricity = fewoBreakdown.electricity || 0;
          const heating = fewoBreakdown.heating || 0;
          nebenkostenIncome = water + electricity + heating;
          if (nebenkostenIncome === 0) nebenkostenIncome = undefined;

          // Reinigung inkl. Haustiergebühr
          cleaningFeeIncome = fewoBreakdown.cleaning || undefined;
        }

        // Determine rental_price: use base_rent + extra_guest_fee from fewo_breakdown if available
        const baseRentForPrice = fewoBreakdown?.base_rent || parsed.rental_price || 0;
        const extraGuestFee = fewoBreakdown?.extra_guest_fee || 0;
        const finalRentalPrice = baseRentForPrice + extraGuestFee;

        bookingData = {
          guest_name: capitalizeName(parsed.guest_name || ''),
          nationality: finalNationality,
          email: parsed.email || '',
          phone: parsed.phone || '',
          address: parsed.address || '',
          arrival_date: parsed.arrival_date || '',
          departure_date: parsed.departure_date || '',
          adults: parseInt(parsed.adults) || 2,
          children: parseInt(parsed.children) || 0,
          children_ages: parsed.children_ages || '',
          platform: platform,
          booking_number: String(parsed.booking_number || ''),
          rental_price: finalRentalPrice, // Miete aus "Raten pro Nacht"
          net_rent: netRent,
          first_contact_date: parsed.first_contact_date || '',
          notes: parsed.notes || '',
          communication: parsed.communication || '',
          // Billing fields
          guest_total_payment: guestTotalPayment,
          platform_fees: finalPlatformFees, // Nur Zahlungsbearbeitungsgebühren!
          service_fee: serviceFee,
          payment_processing_fees: paymentProcessingFees,
          payout_amount: payoutAmount,
          payout_date: parsed.payout_date || undefined,
          // Einnahmen aus FeWo-Breakdown
          nebenkosten_income: nebenkostenIncome, // Wasser + Strom + Heizung
          cleaning_fee_income: cleaningFeeIncome, // Reinigung inkl. Haustiere
          kurtaxe_income: fewoBreakdown?.management_fee || undefined, // Verwaltungsgebühr = Kurtaxe
          // Details
          transactions: transactions.length > 0 ? transactions : undefined,
          fewo_breakdown: fewoBreakdown,
          platform_payment: isFeWo, // FeWo/Vrbo payments are handled by platform
        };

        console.log('Successfully parsed booking data:', bookingData);

        return NextResponse.json({
          success: true,
          data: bookingData
        });
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
    }

    // Fallback - couldn't parse response
    return NextResponse.json({
      success: false,
      data: {
        guest_name: '',
        nationality: '',
        email: '',
        phone: '',
        arrival_date: '',
        departure_date: '',
        adults: 2,
        children: 0,
        children_ages: '',
        platform: '',
        booking_number: '',
        rental_price: 0,
        first_contact_date: '',
        notes: 'Screenshot-Analyse fehlgeschlagen. Bitte Daten manuell eingeben.'
      },
      debug: {
        message: 'Konnte JSON nicht parsen',
        responsePreview: responseText.substring(0, 500)
      }
    });

  } catch (error) {
    console.error('POST /api/admin/analyze-booking error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({
      error: message,
      success: false,
      data: {
        guest_name: '',
        nationality: '',
        email: '',
        phone: '',
        arrival_date: '',
        departure_date: '',
        adults: 2,
        children: 0,
        children_ages: '',
        platform: '',
        booking_number: '',
        rental_price: 0,
        first_contact_date: '',
        notes: `Fehler: ${message}`
      }
    }, { status: 500 });
  }
}
