import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface Env {
  DB: D1Database;
  ADMIN_PASSWORD?: string;
  ADMIN_PWD?: string;
}

function getAdminPassword(env: Env): string | undefined {
  return env.ADMIN_PASSWORD || env.ADMIN_PWD;
}

interface GuestImport {
  guest_name: string;
  address?: string;
  phone?: string;
  email?: string;
  is_returning_guest?: boolean;
  platform: string;
  arrival_date: string;
  departure_date: string;
  adults: number;
  children: number;
  pets?: string;
  rental_price: number;
  additional_costs: string; // NK - "vor Ort" = "0 (vor Ort)"
  final_cleaning: string;   // ER - "vor Ort" = "0 (vor Ort)"
  other_notes?: string;
  booking_number?: string;
}

// Parse currency string like "203,00 €" or "0 (vor Ort)" to number
function parseCurrency(value: string): number {
  if (!value || value.includes('vor Ort') || value === '0' || value === '') {
    return 0;
  }
  // Remove € symbol, spaces, and convert German decimal separator
  const cleaned = value.replace(/[€\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Check if cleaning is included in rent (not paid separately on-site)
function isCleaningIncludedInRent(notes: string | undefined, finalCleaning: string): boolean {
  // If "vor Ort" → paid separately, NOT included in rent
  if (finalCleaning.includes('vor Ort')) {
    return false;
  }
  // If notes mention "kein Bargeld für M" → cleaning handled by platform, included in rent
  if (notes && notes.includes('kein Bargeld für M')) {
    return true;
  }
  // Default: if there's a cleaning amount, assume it's included
  return parseCurrency(finalCleaning) > 0;
}

// Calculate number of nights between two dates
function calculateNights(arrivalDate: string, departureDate: string): number {
  const arrival = new Date(arrivalDate);
  const departure = new Date(departureDate);
  const diffTime = departure.getTime() - arrival.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Calculate Kurtaxe (tourist tax) for historical imports: 2.70€ per adult per night
// Hinweis: Ab 01.11.2026 gilt 4,50€ — neue Buchungen nutzen die kurtaxe_rates Tabelle
const KURTAXE_RATE = 2.70;
function calculateKurtaxe(adults: number, nights: number): number {
  return adults * nights * KURTAXE_RATE;
}

// Calculate net rent for commission: rental_price - cleaning (if included)
// NOTE: Kurtaxe is NOT deducted from net rent
function calculateNetRent(
  rentalPrice: number,
  finalCleaningAmount: number,
  isCleaningIncluded: boolean
): number {
  let netRent = rentalPrice;
  if (isCleaningIncluded && finalCleaningAmount > 0) {
    netRent -= finalCleaningAmount;
  }
  return Math.max(0, netRent);
}

// Guest data from PDF - 2024/2025/2026
const PDF_GUEST_DATA: GuestImport[] = [
  // 2024
  {
    guest_name: "Eva Kampka",
    address: "Ziegeleistr. 71, 67122 Altrip",
    phone: "+49 17180-84453",
    email: "evakampka@googlemail.com",
    platform: "FeWo",
    arrival_date: "2024-12-21",
    departure_date: "2024-12-28",
    adults: 4,
    children: 4,
    pets: "1 Hund",
    rental_price: 1788.80,
    additional_costs: "0 (vor Ort)",
    final_cleaning: "0 (vor Ort)",
    booking_number: "1"
  },
  // 2025 - Januar
  {
    guest_name: "Patrick Schanz",
    phone: "+4916099796638",
    email: "patrick_schanz@web.de",
    platform: "FeWo",
    arrival_date: "2024-12-28",
    departure_date: "2025-01-04",
    adults: 2,
    children: 2,
    pets: "1 Hund",
    rental_price: 2400.00,
    additional_costs: "203,00 €",
    final_cleaning: "125,00 €",
    booking_number: "2"
  },
  {
    guest_name: "Helen Britz",
    address: "Luxemburger Straße 15, 65428 Rüsselsheim",
    phone: "+49 17749-47818",
    email: "helen.britz@web.de",
    platform: "FeWo",
    arrival_date: "2025-01-04",
    departure_date: "2025-01-11",
    adults: 4,
    children: 1,
    rental_price: 1043.90,
    additional_costs: "0 (vor Ort)",
    final_cleaning: "0 (vor Ort)",
    other_notes: "NK zu alten Bedingungen",
    booking_number: "3"
  },
  {
    guest_name: "Mike Gericks",
    address: "Am Ölbach 13, 48691 Vreden",
    phone: "+491715213896",
    email: "mike.gericks@hotmail.com",
    platform: "Mail",
    arrival_date: "2025-01-11",
    departure_date: "2025-01-19",
    adults: 4,
    children: 3,
    rental_price: 840.00,
    additional_costs: "437,60 €",
    final_cleaning: "100,00 €",
    other_notes: "kein Bargeld für M, hat er mit überwiesen / 160 Euro für E",
    booking_number: "4"
  },
  {
    guest_name: "Alexandra Pohl / Solarek",
    address: "Wunderlichtr. 2, 01326 Dresden",
    phone: "+491606413044",
    email: "pohl-alexandra@web.de",
    platform: "Mail",
    arrival_date: "2025-01-25",
    departure_date: "2025-02-01",
    adults: 2,
    children: 0,
    pets: "1 Hund",
    rental_price: 675.00,
    additional_costs: "265,30 €",
    final_cleaning: "125,00 €",
    booking_number: "5"
  },
  // 2025 - Februar
  {
    guest_name: "Andrea + Stefan Poisinger",
    phone: "+43 67695 04393",
    email: "andrea.poisinger@gmail.com",
    platform: "FeWo",
    arrival_date: "2025-02-01",
    departure_date: "2025-02-08",
    adults: 4,
    children: 2,
    rental_price: 651.00,
    additional_costs: "217,00 €",
    final_cleaning: "100,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "6"
  },
  {
    guest_name: "Babett Schalitz",
    address: "Rütlistr. 4, 01169 Dresden",
    phone: "+491796043002",
    email: "babett_schalitz@gmx.de",
    is_returning_guest: true,
    platform: "Mail",
    arrival_date: "2025-02-15",
    departure_date: "2025-02-22",
    adults: 2,
    children: 3,
    rental_price: 936.20,
    additional_costs: "163,80 €",
    final_cleaning: "95,00 €",
    other_notes: "ggf + 2 Freunde, dann Zuzahlung 50 Euro",
    booking_number: "7"
  },
  {
    guest_name: "Claudia Repp",
    phone: "+49 491 774200717",
    email: "claudia.repp66@outlook.de",
    platform: "FeWo",
    arrival_date: "2025-02-22",
    departure_date: "2025-03-01",
    adults: 5,
    children: 0,
    pets: "2 Hunde",
    rental_price: 994.00,
    additional_costs: "196,00 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "8"
  },
  // 2025 - März
  {
    guest_name: "Wolfgang Fleischer",
    phone: "+49 1755245510",
    email: "wolfgangfleischer@gmx.de",
    platform: "FeWo",
    arrival_date: "2025-03-02",
    departure_date: "2025-03-09",
    adults: 3,
    children: 3,
    pets: "1 Hund",
    rental_price: 735.00,
    additional_costs: "228,20 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da FeWo, evtl. noch 2 E",
    booking_number: "9"
  },
  // 2025 - April/Mai (privat)
  {
    guest_name: "Brenneisen + Kleideiter",
    platform: "privat",
    arrival_date: "2025-04-26",
    departure_date: "2025-05-10",
    adults: 0,
    children: 0,
    rental_price: 0,
    additional_costs: "0",
    final_cleaning: "0",
    booking_number: "10"
  },
  // 2025 - Mai
  {
    guest_name: "Dirk Pilz",
    address: "In der Trift 3, 65385 Rüdesheim am Rhein",
    phone: "+49 (0)6722 48183",
    email: "D.Pilz@web.de",
    platform: "Mail",
    arrival_date: "2025-05-24",
    departure_date: "2025-05-31",
    adults: 2,
    children: 0,
    rental_price: 200.00,
    additional_costs: "0 (vor Ort)",
    final_cleaning: "0 (vor Ort)",
    other_notes: "NK komplett vor Ort abrechnen",
    booking_number: "11"
  },
  // 2025 - Juni
  {
    guest_name: "Annika Jänicke",
    phone: "+49 1729135102",
    email: "annikamill@gmx.de",
    platform: "FeWo",
    arrival_date: "2025-06-05",
    departure_date: "2025-06-14",
    adults: 2,
    children: 0,
    pets: "1 Hund",
    rental_price: 1278.00,
    additional_costs: "257,40 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "12"
  },
  {
    guest_name: "Stefanie Sträßner",
    phone: "+49 17044-97575",
    email: "steffi_str@web.de",
    platform: "FeWo",
    arrival_date: "2025-06-28",
    departure_date: "2025-07-12",
    adults: 3,
    children: 2,
    pets: "1 Hund",
    rental_price: 1873.14,
    additional_costs: "0 (vor Ort)",
    final_cleaning: "0 (vor Ort)",
    other_notes: "NK komplett vor Ort abrechnen",
    booking_number: "13"
  },
  // 2025 - Juli
  {
    guest_name: "Judith und Rene van den Elzen",
    phone: "+31 64-7631772",
    email: "elzen1@outlook.com",
    platform: "FeWo",
    arrival_date: "2025-07-12",
    departure_date: "2025-07-19",
    adults: 7,
    children: 0,
    rental_price: 1044.00,
    additional_costs: "258,90 €",
    final_cleaning: "100,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "14"
  },
  {
    guest_name: "Sybille Katzenbach",
    phone: "+49 01726553262",
    platform: "FeWo",
    arrival_date: "2025-07-20",
    departure_date: "2025-08-01",
    adults: 3,
    children: 0,
    pets: "1 Hund",
    rental_price: 1729.00,
    additional_costs: "325,60 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da FeWo / 4 Wäschepakete",
    booking_number: "15"
  },
  // 2025 - August
  {
    guest_name: "Thomas Goldberg",
    phone: "+491603656622",
    platform: "FeWo",
    arrival_date: "2025-08-03",
    departure_date: "2025-08-10",
    adults: 4,
    children: 2,
    rental_price: 1137.40,
    additional_costs: "0 (vor Ort)",
    final_cleaning: "0 (vor Ort)",
    other_notes: "NK komplett vor Ort abrechnen",
    booking_number: "16"
  },
  {
    guest_name: "Silke Grumaz",
    address: "Im Feldblick 48, 71336 Waiblingen",
    phone: "+49 1728393319",
    email: "silke.grumaz@gmail.com",
    platform: "Feratel",
    arrival_date: "2025-08-16",
    departure_date: "2025-08-30",
    adults: 2,
    children: 3,
    pets: "1 Hund",
    rental_price: 1988.00,
    additional_costs: "518,00 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da Feratel / 25 Euro für Wäschepaket",
    booking_number: "17"
  },
  // 2025 - September/Oktober
  {
    guest_name: "Kathrin Wirker + Steffen Voß",
    address: "Rheingoldallee 9, 15834 Rangsdorf",
    phone: "+491725875436",
    email: "kathrin.wirker@web.de",
    platform: "Mail",
    arrival_date: "2025-09-20",
    departure_date: "2025-10-11",
    adults: 2,
    children: 0,
    pets: "1 Hund",
    rental_price: 2025.00,
    additional_costs: "653,00 €",
    final_cleaning: "125,00 €",
    other_notes: "Reinigung bar vor Ort",
    booking_number: "18"
  },
  // 2025 - Dezember
  {
    guest_name: "Eva Pilath",
    email: "evapilath@web.de",
    phone: "+49 1512 7171155",
    platform: "FeWo",
    arrival_date: "2025-12-20",
    departure_date: "2025-12-27",
    adults: 2,
    children: 3,
    pets: "1 Hund",
    rental_price: 1624.00,
    additional_costs: "315,70 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "20"
  },
  {
    guest_name: "Simone Schmitt",
    phone: "+49 1609 4630538",
    email: "mone_grubi@gmx.de",
    platform: "FeWo",
    arrival_date: "2025-12-27",
    departure_date: "2026-01-03",
    adults: 3,
    children: 3,
    rental_price: 2107.00,
    additional_costs: "228,20 €",
    final_cleaning: "100,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "21"
  },
  // 2026 - Januar
  {
    guest_name: "Nikola Kovacevic",
    platform: "Booking",
    arrival_date: "2026-01-04",
    departure_date: "2026-01-10",
    adults: 3,
    children: 1,
    rental_price: 1421.00,
    additional_costs: "",
    final_cleaning: "",
    other_notes: "kein Bargeld für M, da Booking",
    booking_number: "1"
  },
  {
    guest_name: "Andrea + Stefan Poisinger",
    address: "Schulgasse 395, 2013 Göllersdorf, Österreich",
    phone: "+43 67695 04393",
    email: "andrea.poisinger@gmail.com",
    platform: "Feratel",
    arrival_date: "2026-01-31",
    departure_date: "2026-02-07",
    adults: 2,
    children: 2,
    rental_price: 994.00,
    additional_costs: "259,00 €",
    final_cleaning: "100,00 €",
    other_notes: "kein Bargeld für M, da Feratel",
    booking_number: "2"
  },
  // 2026 - Februar
  {
    guest_name: "Babett Schalitz",
    address: "Rütlistr. 4, 01169 Dresden",
    phone: "+491796043002",
    email: "babett_schalitz@gmx.de",
    is_returning_guest: true,
    platform: "Mail",
    arrival_date: "2026-02-07",
    departure_date: "2026-02-14",
    adults: 2,
    children: 3,
    rental_price: 0, // "siehe Vertrag"
    additional_costs: "248,00 €",
    final_cleaning: "100,00 €",
    other_notes: "Mietpreis siehe Vertrag",
    booking_number: "3"
  },
  {
    guest_name: "Gerard Vrolijk",
    phone: "+31 63-5665319",
    email: "gerardvrolijk1@gmail.com",
    platform: "FeWo",
    arrival_date: "2026-02-14",
    departure_date: "2026-02-21",
    adults: 4,
    children: 2,
    rental_price: 994.00,
    additional_costs: "341,60 €",
    final_cleaning: "100,00 €",
    other_notes: "kein Bargeld für M, da FeWo, Holländer",
    booking_number: "4"
  },
  {
    guest_name: "Markus Bastian",
    phone: "+49 16053-22774",
    email: "markusbastian75@gmail.com",
    platform: "FeWo",
    arrival_date: "2026-02-21",
    departure_date: "2026-02-28",
    adults: 4,
    children: 0,
    pets: "1 Hund",
    rental_price: 994.00,
    additional_costs: "278,12 €",
    final_cleaning: "125,00 €",
    other_notes: "kein Bargeld für M, da FeWo",
    booking_number: "5"
  },
  // 2026 - Juli
  {
    guest_name: "Sebastian Schwartz",
    phone: "+49 1575 0373612",
    platform: "FeWo",
    arrival_date: "2026-07-19",
    departure_date: "2026-08-03",
    adults: 2,
    children: 3,
    rental_price: 2130.00,
    additional_costs: "676,50 €",
    final_cleaning: "100,00 €",
    other_notes: "Wäschepaket erfragen",
    booking_number: "6"
  },
  // 2026 - Oktober
  {
    guest_name: "Manuel Seizer",
    address: "Oststr. 11, 74196 Neuenstadt",
    phone: "+491733805909",
    email: "manuel@seizer-nsu.de",
    is_returning_guest: true,
    platform: "WhatsApp",
    arrival_date: "2026-10-24",
    departure_date: "2026-10-31",
    adults: 2,
    children: 1,
    rental_price: 550.00,
    additional_costs: "217,30 €",
    final_cleaning: "125,00 €",
    other_notes: "Reinigung bar vor Ort / Buchung von 25 auf 26 verschoben",
    booking_number: "7"
  }
];

function getMonthName(date: string): string {
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const d = new Date(date);
  return months[d.getMonth()];
}

function getYear(date: string): number {
  return new Date(date).getFullYear();
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    const adminPassword = request.headers.get('x-admin-password');
    const envPassword = getAdminPassword(env);

    if (!envPassword) {
      return NextResponse.json({ error: 'ADMIN_PASSWORD is not configured' }, { status: 500 });
    }

    if (adminPassword !== envPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!env.DB) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Run migrations to ensure columns exist
    try {
      // Check if ancillary_costs_amount column exists by trying a simple query
      await env.DB.prepare('SELECT ancillary_costs_amount FROM guests LIMIT 1').first();
    } catch {
      // Column doesn't exist, run migration
      console.log('Running migration: adding ancillary_costs_amount column');
      await env.DB.prepare('ALTER TABLE guests ADD COLUMN ancillary_costs_amount REAL DEFAULT 0').run();
    }

    try {
      await env.DB.prepare('SELECT final_cleaning_amount FROM guests LIMIT 1').first();
    } catch {
      console.log('Running migration: adding final_cleaning_amount column');
      await env.DB.prepare('ALTER TABLE guests ADD COLUMN final_cleaning_amount REAL DEFAULT 0').run();
    }

    try {
      await env.DB.prepare('SELECT net_rent FROM guests LIMIT 1').first();
    } catch {
      console.log('Running migration: adding net_rent column');
      await env.DB.prepare('ALTER TABLE guests ADD COLUMN net_rent REAL DEFAULT 0').run();
    }

    const results: { guest_name: string; action: string; success: boolean; error?: string }[] = [];

    for (const guest of PDF_GUEST_DATA) {
      try {
        // Calculate numeric values
        const ancillaryCostsAmount = parseCurrency(guest.additional_costs);
        const finalCleaningAmount = parseCurrency(guest.final_cleaning);
        const cleaningIncluded = isCleaningIncludedInRent(guest.other_notes, guest.final_cleaning);
        const netRent = calculateNetRent(guest.rental_price, finalCleaningAmount, cleaningIncluded);

        // Check if guest already exists (by name + arrival_date)
        const existing = await env.DB.prepare(
          'SELECT id FROM guests WHERE guest_name = ? AND arrival_date = ?'
        ).bind(guest.guest_name, guest.arrival_date).first<{ id: number }>();

        if (existing) {
          // Update existing guest
          await env.DB.prepare(`
            UPDATE guests SET
              address = COALESCE(?, address),
              phone = COALESCE(?, phone),
              email = COALESCE(?, email),
              is_returning_guest = ?,
              platform = ?,
              departure_date = ?,
              adults = ?,
              children = ?,
              pets = COALESCE(?, pets),
              rental_price = ?,
              additional_costs = ?,
              ancillary_costs_amount = ?,
              final_cleaning = ?,
              final_cleaning_amount = ?,
              net_rent = ?,
              other_notes = COALESCE(?, other_notes),
              booking_number = COALESCE(?, booking_number),
              month = ?,
              year = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(
            guest.address || null,
            guest.phone || null,
            guest.email || null,
            guest.is_returning_guest ? 1 : 0,
            guest.platform,
            guest.departure_date,
            guest.adults,
            guest.children,
            guest.pets || null,
            guest.rental_price,
            guest.additional_costs,
            ancillaryCostsAmount,
            guest.final_cleaning,
            finalCleaningAmount,
            netRent,
            guest.other_notes || null,
            guest.booking_number || null,
            getMonthName(guest.arrival_date),
            getYear(guest.arrival_date),
            existing.id
          ).run();

          results.push({ guest_name: guest.guest_name, action: 'updated', success: true });
        } else {
          // Insert new guest
          await env.DB.prepare(`
            INSERT INTO guests (
              booking_number, month, year, guest_name, address, phone, email,
              is_returning_guest, platform, arrival_date, departure_date,
              adults, children, pets, rental_price, additional_costs, ancillary_costs_amount,
              final_cleaning, final_cleaning_amount, net_rent, other_notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
          `).bind(
            guest.booking_number || null,
            getMonthName(guest.arrival_date),
            getYear(guest.arrival_date),
            guest.guest_name,
            guest.address || null,
            guest.phone || null,
            guest.email || null,
            guest.is_returning_guest ? 1 : 0,
            guest.platform,
            guest.arrival_date,
            guest.departure_date,
            guest.adults,
            guest.children,
            guest.pets || null,
            guest.rental_price,
            guest.additional_costs,
            ancillaryCostsAmount,
            guest.final_cleaning,
            finalCleaningAmount,
            netRent,
            guest.other_notes || null
          ).run();

          results.push({ guest_name: guest.guest_name, action: 'inserted', success: true });
        }
      } catch (error) {
        results.push({
          guest_name: guest.guest_name,
          action: 'failed',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const inserted = results.filter(r => r.action === 'inserted').length;
    const updated = results.filter(r => r.action === 'updated').length;
    const failed = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Import complete: ${inserted} inserted, ${updated} updated, ${failed} failed`,
      total: PDF_GUEST_DATA.length,
      inserted,
      updated,
      failed,
      results
    });

  } catch (error) {
    console.error('POST /api/admin/import-guests error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// GET - Show available data for import
export async function GET(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;
  } catch {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Guest import endpoint',
    totalGuests: PDF_GUEST_DATA.length,
    guests: PDF_GUEST_DATA.map(g => ({
      name: g.guest_name,
      arrival: g.arrival_date,
      departure: g.departure_date,
      platform: g.platform,
      rental_price: g.rental_price,
      additional_costs: g.additional_costs
    })),
    instructions: 'POST to this endpoint with x-admin-password header to import/update guests'
  });
}
