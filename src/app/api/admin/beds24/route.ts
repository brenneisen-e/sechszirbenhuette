import { NextRequest, NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

import {
  addDaysIso,
  BEDS24_API,
  beds24ResultError,
  fetchPropertyRoomIds,
  getBeds24AccessToken,
  getPropertyId,
  getSetting,
  KEY_ACCESS_EXPIRES,
  KEY_ACCESS_TOKEN,
  KEY_PROPERTY_ID,
  KEY_REFRESH_TOKEN,
  KEY_ROOM_ID,
  parseJsonSafe,
  setSetting,
} from '@/lib/server/beds24';
import {
  importBeds24Booking,
  type ImportBookingInput,
  type ImportGuestInput,
  syncBeds24Booking,
  type SyncFinanceInput,
} from '@/lib/server/beds24Import';
import {
  getSnapshot,
  listSnapshots,
  restoreEntries,
  saveSnapshot,
} from '@/lib/server/beds24Snapshots';
import {
  type BookingCutoffMode,
  getBookingCutoffStatus,
  runBookingCutoff,
  setBookingCutoffMode,
} from '@/lib/server/bookingCutoff';
import {
  getBookingHorizonStatus,
  releaseHorizonRange,
  runBookingHorizon,
  setBookingHorizon,
} from '@/lib/server/bookingHorizon';

interface Env {
  DB: D1Database;
}

// Beds24 API v2 (Channel-Manager für Booking.com, Feratel und FeWo-direkt).
// Auth: Admin-Session, geprüft in cloudflare-worker.js.
// Verbindung: In Beds24 unter Settings → Apps & Integrations → API einen
// Invite Code erzeugen, hier einlösen. Der zurückgegebene Refresh-Token ist
// langlebig und wird in der settings-Tabelle gespeichert; daraus werden bei
// Bedarf 24h-Access-Tokens geholt.

// Abrufbare Bereiche — bewusst eine Whitelist statt freier Pfade. Alles außer
// Konto und Nachrichten wird auf die gewählte Unterkunft eingeschränkt: Das
// Beds24-Konto wird mit der Natberger Hütte geteilt.
function buildTargetPath(
  target: string,
  propertyId: number,
  bookingId?: number,
  months?: number,
): string | null {
  // Zeitraum fürs Cockpit: 1–24 Monate (Standard 12)
  const monthsClamped = Math.min(Math.max(Number(months) || 12, 1), 24);
  const rangeEnd = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsClamped);
    return d.toISOString().slice(0, 10);
  })();
  switch (target) {
    case 'account':
      return '/authentication/details';
    case 'properties':
      return `/properties?id=${propertyId}`;
    case 'bookingMessages': {
      // Nachrichten/Kommunikation zu einer Buchung (z.B. Booking.com-Chat)
      if (!bookingId || !Number.isFinite(bookingId)) return null;
      return `/bookings/messages?bookingId=${bookingId}`;
    }
    case 'rooms':
      // Eigener /properties/rooms-Pfad liefert je nach Account leere Antworten —
      // Zimmer deshalb über die Properties-Abfrage mitladen
      return `/properties?id=${propertyId}&includeAllRooms=true`;
    case 'bookings': {
      // Buchungen ab 30 Tage zurück, damit auch laufende Aufenthalte sichtbar sind
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return `/bookings?propertyId=${propertyId}&arrivalFrom=${from}&includeInvoiceItems=true&includeInfoItems=true`;
    }
    case 'bookingsYear': {
      // Buchungen des Cockpit-Zeitraums, inkl. Einzelpositionen
      // (Preisaufstellung) und Booking.com-Zusatzinfos (z.B. Promotions).
      // Start bewusst 90 Tage in der Vergangenheit, damit auch bereits
      // abgereiste Gäste geladen werden — für nachträgliche Bewertungsanfragen
      // und damit vergangene belegte Kalendertage anklickbar bleiben.
      const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return `/bookings?propertyId=${propertyId}&arrivalFrom=${from}&arrivalTo=${rangeEnd}&includeInvoiceItems=true&includeInfoItems=true`;
    }
    case 'calendar': {
      // Tageswerte (Preis, Mindestaufenthalt, Verfügbarkeit) des Cockpit-Zeitraums
      const from = new Date().toISOString().slice(0, 10);
      return `/inventory/rooms/calendar?propertyId=${propertyId}&startDate=${from}&endDate=${rangeEnd}&includeNumAvail=true&includePrices=true&includeMinStay=true&includeMaxStay=true`;
    }
    case 'offers':
      return `/properties?id=${propertyId}&includeAllRooms=true&includeOffers=true`;
    default:
      return null;
  }
}

// Aktionen, die ein Zimmer lesen oder ändern — nur für Zimmer der gewählten Unterkunft
const ROOM_ACTIONS = new Set([
  'restoreSnapshot',
  'setCalendar',
  'setCalendarBatch',
  'verifyCalendar',
  'checkStay',
  'setRoomSettings',
]);

async function ensureSettingsTable(db: D1Database) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
    )
    .run();
}

async function deleteSetting(db: D1Database, key: string) {
  await db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
}

// Transport- und Fachfehler einer Beds24-Antwort prüfen.
// Gibt bei Erfolg null zurück, sonst die fertige Fehlerantwort.
function beds24Failure(
  res: Response,
  parsed: { ok: boolean; data: unknown },
  context: string,
): NextResponse | null {
  if (!res.ok || !parsed.ok) {
    const suffix = parsed.ok ? '' : ' — keine gültige JSON-Antwort';
    return NextResponse.json(
      { error: `Beds24 antwortete mit HTTP ${res.status}${suffix}`, data: parsed.data },
      { status: 502 },
    );
  }
  const apiError = beds24ResultError(parsed.data);
  if (apiError) {
    return NextResponse.json(
      { error: `${context}: ${apiError}`, data: parsed.data },
      { status: 502 },
    );
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getCloudflareContext();
    const env = (ctx as { env: Env }).env;

    if (!env.DB) {
      return NextResponse.json({ error: 'D1 Database binding not configured.' }, { status: 500 });
    }

    await ensureSettingsTable(env.DB);

    const body = (await request.json()) as {
      action: string;
      inviteCode?: string;
      target?: string;
      roomId?: number | string;
      bookingId?: number | string;
      from?: string;
      to?: string;
      price1?: number | string | null;
      minStay?: number | string | null;
      numAvail?: number | string | null;
      message?: string;
      months?: number | string;
      propertyId?: number | string;
      cleaningFee?: number | string | null;
      arrival?: string;
      nights?: number | string;
      numAdults?: number | string;
      mode?: string;
      horizon?: string;
      guestId?: number | string;
      guest?: ImportGuestInput;
      booking?: ImportBookingInput;
      finance?: SyncFinanceInput | null;
      ownBookingId?: number | string;
      beds24Id?: string;
      snapshotId?: number | string;
      label?: string;
      entries?: Array<{
        from?: string;
        to?: string;
        price1?: number | string | null;
        minStay?: number | string | null;
        numAvail?: number | string | null;
      }>;
    };

    // Buchungsschluss (bis Anreisetag / bis Vortag) lesen und setzen
    if (body.action === 'getBookingCutoff') {
      // Rückfall für den GitHub-Workflow: Beim Öffnen des Beds24-Tabs den
      // heutigen Lauf nachholen (pro Tag nur einmal, sonst ein DB-Zugriff).
      await runBookingCutoff(env.DB).catch(() => undefined);
      return NextResponse.json({ success: true, ...(await getBookingCutoffStatus(env.DB)) });
    }
    if (body.action === 'setBookingCutoff') {
      if (body.mode !== 'same_day' && body.mode !== 'day_before') {
        return NextResponse.json({ error: 'Ungültige Einstellung' }, { status: 400 });
      }
      const outcome = await setBookingCutoffMode(env.DB, body.mode as BookingCutoffMode);
      return NextResponse.json({
        success: outcome.result !== 'error',
        result: outcome.result,
        error: outcome.error,
        ...(await getBookingCutoffStatus(env.DB)),
      });
    }

    // „Buchbar bis“ (lib/server/bookingHorizon.ts)
    if (body.action === 'getBookingHorizon') {
      // Rückfall für den GitHub-Workflow, wie beim Buchungsschluss
      await runBookingHorizon(env.DB).catch(() => undefined);
      return NextResponse.json({ success: true, ...(await getBookingHorizonStatus(env.DB)) });
    }
    if (body.action === 'setBookingHorizon') {
      const outcome = await setBookingHorizon(env.DB, String(body.horizon ?? ''));
      return NextResponse.json({
        success: outcome.result !== 'error',
        ...outcome,
        ...(await getBookingHorizonStatus(env.DB)),
      });
    }
    if (body.action === 'releaseHorizon') {
      const outcome = await releaseHorizonRange(env.DB, String(body.from), String(body.to));
      return NextResponse.json(outcome, { status: outcome.success ? 200 : 502 });
    }

    // Beds24-Buchung in die Gästedatenbank übernehmen (Cockpit)
    if (body.action === 'importBooking') {
      if (!body.guest || !body.booking) {
        return NextResponse.json({ error: 'Gast- und Buchungsdaten fehlen' }, { status: 400 });
      }
      const guestId = body.guestId === 'new' ? 'new' : Number(body.guestId);
      if (guestId !== 'new' && (!Number.isFinite(guestId) || guestId <= 0)) {
        return NextResponse.json({ error: 'Ungültiger Gast' }, { status: 400 });
      }
      const result = await importBeds24Booking(env.DB, guestId, body.guest, body.booking);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      return NextResponse.json({ success: true, ...result });
    }

    // Bereits übernommene Buchung mit Beds24 abgleichen (Kontaktdaten, Finanzen)
    if (body.action === 'syncBooking') {
      const ownBookingId = Number(body.ownBookingId);
      if (!Number.isFinite(ownBookingId) || ownBookingId <= 0) {
        return NextResponse.json({ error: 'Ungültige Buchung' }, { status: 400 });
      }
      const result = await syncBeds24Booking(
        env.DB,
        ownBookingId,
        body.guest || {},
        body.finance ?? null,
        body.beds24Id || null,
      );
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json({ success: true, ...result });
    }

    // Verbindungsstatus
    if (body.action === 'status') {
      const refreshToken = await getSetting(env.DB, KEY_REFRESH_TOKEN);
      return NextResponse.json({
        connected: !!refreshToken,
        propertyId: await getPropertyId(env.DB),
      });
    }

    // Alle Unterkünfte des Beds24-Kontos — zur Auswahl der Sechszirbenhütte
    if (body.action === 'listProperties') {
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      const res = await fetch(`${BEDS24_API}/properties?includeAllRooms=true`, {
        headers: { token, Accept: 'application/json' },
      });
      const parsed = await parseJsonSafe(res);
      if (!res.ok || !parsed.ok) {
        return NextResponse.json(
          { error: `Beds24 antwortete mit HTTP ${res.status}` },
          { status: 502 },
        );
      }
      const rows = (parsed.data as { data?: unknown })?.data;
      const properties = (Array.isArray(rows) ? rows : []).map((row) => {
        const p = row as { id?: unknown; name?: unknown; roomTypes?: unknown };
        const rooms = Array.isArray(p.roomTypes) ? p.roomTypes : [];
        return {
          id: Number(p.id),
          name: String(p.name ?? ''),
          rooms: rooms.map((r) => {
            const room = r as { id?: unknown; name?: unknown };
            return { id: Number(room.id), name: String(room.name ?? '') };
          }),
        };
      });
      return NextResponse.json({
        success: true,
        properties,
        propertyId: await getPropertyId(env.DB),
      });
    }

    // Unterkunft festlegen, auf die sich dieses Admin Center bezieht
    if (body.action === 'setProperty') {
      const propertyId = Number(body.propertyId);
      if (!Number.isFinite(propertyId) || propertyId <= 0) {
        return NextResponse.json({ error: 'Ungültige Unterkunft' }, { status: 400 });
      }
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      const rooms = await fetchPropertyRoomIds(token, propertyId);
      if (!rooms.roomIds) {
        return NextResponse.json({ error: rooms.error }, { status: 400 });
      }
      await setSetting(env.DB, KEY_PROPERTY_ID, String(propertyId));
      // Ein fest hinterlegtes Zimmer einer anderen Unterkunft verwerfen
      const fixedRoom = Number(await getSetting(env.DB, KEY_ROOM_ID));
      if (fixedRoom > 0 && !rooms.roomIds.includes(fixedRoom)) {
        await deleteSetting(env.DB, KEY_ROOM_ID);
      }
      return NextResponse.json({ success: true, propertyId });
    }

    // Invite Code einlösen → Refresh-Token speichern
    if (body.action === 'setup') {
      const inviteCode = (body.inviteCode || '').trim();
      if (!inviteCode) {
        return NextResponse.json({ error: 'Invite Code fehlt' }, { status: 400 });
      }

      const res = await fetch(`${BEDS24_API}/authentication/setup`, {
        headers: {
          code: inviteCode,
          deviceName: 'Sechszirbenhuette Admin Center',
          Accept: 'application/json',
        },
      });
      const data = (await res.json()) as {
        token?: string;
        expiresIn?: number;
        refreshToken?: string;
        error?: string;
      };

      if (!res.ok || !data.refreshToken) {
        return NextResponse.json(
          {
            error: `Setup fehlgeschlagen (HTTP ${res.status}): ${data.error || 'Invite Code ungültig oder bereits verwendet'}`,
          },
          { status: 400 },
        );
      }

      await setSetting(env.DB, KEY_REFRESH_TOKEN, data.refreshToken);
      if (data.token) {
        await setSetting(env.DB, KEY_ACCESS_TOKEN, data.token);
        await setSetting(
          env.DB,
          KEY_ACCESS_EXPIRES,
          String(Date.now() + (data.expiresIn || 86400) * 1000),
        );
      }
      return NextResponse.json({ success: true, connected: true });
    }

    // Verbindung trennen (Tokens lokal löschen)
    if (body.action === 'disconnect') {
      await deleteSetting(env.DB, KEY_REFRESH_TOKEN);
      await deleteSetting(env.DB, KEY_ACCESS_TOKEN);
      await deleteSetting(env.DB, KEY_ACCESS_EXPIRES);
      return NextResponse.json({ success: true, connected: false });
    }

    // Daten von Beds24 abrufen
    if (body.action === 'fetch') {
      const propertyId = await getPropertyId(env.DB);
      if (!propertyId && body.target !== 'account') {
        return NextResponse.json(
          { error: 'Bitte zuerst die Beds24-Unterkunft der Sechszirbenhütte wählen' },
          { status: 400 },
        );
      }
      const path = buildTargetPath(
        body.target || '',
        propertyId ?? 0,
        Number(body.bookingId) || undefined,
        Number(body.months) || undefined,
      );
      if (!path) {
        return NextResponse.json({ error: `Unbekanntes Ziel: ${body.target}` }, { status: 400 });
      }

      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }

      const res = await fetch(`${BEDS24_API}${path}`, {
        headers: { token, Accept: 'application/json' },
      });
      const parsed = await parseJsonSafe(res);
      // Beim LESEN bewusst nur Transportfehler prüfen. Beds24 liefert bei
      // Abfragen auch Antworten mit success:false, die trotzdem verwertbare
      // Daten enthalten — ein harter Abbruch würde das ganze Cockpit lahmlegen.
      // Die Body-Prüfung bleibt den Schreibvorgängen vorbehalten.
      if (!res.ok || !parsed.ok) {
        const suffix = parsed.ok ? '' : ' — keine gültige JSON-Antwort';
        const detail = beds24ResultError(parsed.data);
        return NextResponse.json(
          {
            error: `Beds24 antwortete mit HTTP ${res.status}${suffix}${detail ? `: ${detail}` : ''}`,
            data: parsed.data,
          },
          { status: 502 },
        );
      }
      return NextResponse.json({ success: true, data: parsed.data });
    }

    // Schreibschutz für das gemeinsame Beds24-Konto: Zimmer-Aktionen nur für
    // Zimmer der gewählten Unterkunft — nie für die Natberger Hütte.
    if (ROOM_ACTIONS.has(body.action)) {
      const propertyId = await getPropertyId(env.DB);
      if (!propertyId) {
        return NextResponse.json(
          { error: 'Bitte zuerst die Beds24-Unterkunft der Sechszirbenhütte wählen' },
          { status: 400 },
        );
      }
      if (body.action === 'setRoomSettings' && Number(body.propertyId) !== propertyId) {
        return NextResponse.json(
          { error: 'Unterkunft passt nicht zur Auswahl im Admin Center' },
          { status: 403 },
        );
      }
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      const rooms = await fetchPropertyRoomIds(token, propertyId);
      if (!rooms.roomIds) {
        return NextResponse.json({ error: rooms.error }, { status: 502 });
      }
      if (!rooms.roomIds.includes(Number(body.roomId))) {
        return NextResponse.json(
          { error: `Zimmer ${body.roomId} gehört nicht zur gewählten Unterkunft` },
          { status: 403 },
        );
      }
    }

    // Tageswerte bei Beds24 ändern (Preis / Mindestaufenthalt für einen Zeitraum)
    if (body.action === 'setCalendar') {
      const roomId = Number(body.roomId);
      const from = String(body.from || '');
      const to = String(body.to || '');
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!Number.isFinite(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'roomId fehlt oder ungültig' }, { status: 400 });
      }
      if (!dateRe.test(from) || !dateRe.test(to) || to < from) {
        return NextResponse.json({ error: 'Ungültiger Zeitraum' }, { status: 400 });
      }

      const entry: Record<string, unknown> = { from, to };
      if (body.price1 !== undefined && body.price1 !== null && body.price1 !== '') {
        const price = Number(body.price1);
        if (!Number.isFinite(price) || price < 0 || price > 100000) {
          return NextResponse.json({ error: 'Ungültiger Preis' }, { status: 400 });
        }
        entry.price1 = price;
      }
      if (body.minStay !== undefined && body.minStay !== null && body.minStay !== '') {
        const minStay = Number(body.minStay);
        if (!Number.isInteger(minStay) || minStay < 1 || minStay > 365) {
          return NextResponse.json({ error: 'Ungültiger Mindestaufenthalt' }, { status: 400 });
        }
        entry.minStay = minStay;
      }
      if (body.numAvail !== undefined && body.numAvail !== null && body.numAvail !== '') {
        const numAvail = Number(body.numAvail);
        if (numAvail !== 0 && numAvail !== 1) {
          return NextResponse.json({ error: 'Ungültige Verfügbarkeit' }, { status: 400 });
        }
        entry.numAvail = numAvail;
      }
      if (Object.keys(entry).length === 2) {
        return NextResponse.json(
          { error: 'Keine Änderung angegeben (Preis, Mindestaufenthalt oder Verfügbarkeit)' },
          { status: 400 },
        );
      }

      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }

      // Vorher sichern — ohne Sicherung wird nichts geschrieben
      const snapshot = await saveSnapshot(
        env.DB,
        token,
        roomId,
        from,
        to,
        String(body.label || 'Cockpit: Werte geändert'),
      );
      if (snapshot.error) {
        return NextResponse.json({ error: snapshot.error }, { status: 502 });
      }

      const res = await fetch(`${BEDS24_API}/inventory/rooms/calendar`, {
        method: 'POST',
        headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify([{ roomId, calendar: [entry] }]),
      });
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Änderung abgelehnt');
      if (failure) return failure;
      return NextResponse.json({ success: true, data: parsed.data });
    }

    // Mehrere Zeiträume in einem Rutsch setzen — z.B. die Saisonpreise aus
    // dem Mietpreise-Tab. Beds24 nimmt alle Einträge in einem Aufruf an.
    if (body.action === 'setCalendarBatch') {
      const roomId = Number(body.roomId);
      if (!Number.isFinite(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'roomId fehlt oder ungültig' }, { status: 400 });
      }
      const input = Array.isArray(body.entries) ? body.entries : [];
      if (input.length === 0 || input.length > 200) {
        return NextResponse.json({ error: 'Keine oder zu viele Zeiträume' }, { status: 400 });
      }
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      const calendar: Record<string, unknown>[] = [];
      for (const raw of input) {
        const from = String(raw?.from || '');
        const to = String(raw?.to || '');
        if (!dateRe.test(from) || !dateRe.test(to) || to < from) {
          return NextResponse.json(
            { error: `Ungültiger Zeitraum ${from} – ${to}` },
            { status: 400 },
          );
        }
        const entry: Record<string, unknown> = { from, to };
        if (raw.price1 !== undefined && raw.price1 !== null && raw.price1 !== '') {
          const price = Number(raw.price1);
          if (!Number.isFinite(price) || price < 0 || price > 100000) {
            return NextResponse.json({ error: `Ungültiger Preis ab ${from}` }, { status: 400 });
          }
          entry.price1 = price;
        }
        if (raw.minStay !== undefined && raw.minStay !== null && raw.minStay !== '') {
          const minStay = Number(raw.minStay);
          if (!Number.isInteger(minStay) || minStay < 1 || minStay > 365) {
            return NextResponse.json(
              { error: `Ungültiger Mindestaufenthalt ab ${from}` },
              { status: 400 },
            );
          }
          entry.minStay = minStay;
        }
        if (raw.numAvail !== undefined && raw.numAvail !== null && raw.numAvail !== '') {
          const numAvail = Number(raw.numAvail);
          if (numAvail !== 0 && numAvail !== 1) {
            return NextResponse.json(
              { error: `Ungültige Verfügbarkeit ab ${from}` },
              { status: 400 },
            );
          }
          entry.numAvail = numAvail;
        }
        if (Object.keys(entry).length === 2) {
          return NextResponse.json({ error: `Keine Änderung ab ${from}` }, { status: 400 });
        }
        calendar.push(entry);
      }

      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }

      // Gesamten betroffenen Zeitraum vorher sichern
      const spanFrom = calendar.map((e) => String(e.from)).sort()[0] ?? '';
      const spanTo =
        calendar
          .map((e) => String(e.to))
          .sort()
          .at(-1) ?? '';
      const snapshot = await saveSnapshot(
        env.DB,
        token,
        roomId,
        spanFrom,
        spanTo,
        String(body.label || `Sammeländerung (${calendar.length} Zeiträume)`),
      );
      if (snapshot.error) {
        return NextResponse.json({ error: snapshot.error }, { status: 502 });
      }

      const res = await fetch(`${BEDS24_API}/inventory/rooms/calendar`, {
        method: 'POST',
        headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify([{ roomId, calendar }]),
      });
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Änderung abgelehnt');
      if (failure) return failure;
      return NextResponse.json({ success: true, count: calendar.length, data: parsed.data });
    }

    // Sicherungen der gewählten Unterkunft auflisten (neueste zuerst)
    if (body.action === 'listSnapshots') {
      const propertyId = await getPropertyId(env.DB);
      if (!propertyId) {
        return NextResponse.json({ success: true, snapshots: [] });
      }
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      const rooms = await fetchPropertyRoomIds(token, propertyId);
      if (!rooms.roomIds) {
        return NextResponse.json({ error: rooms.error }, { status: 502 });
      }
      const rows = await listSnapshots(env.DB, rooms.roomIds);
      return NextResponse.json({
        success: true,
        snapshots: rows.map((r) => ({
          id: r.id,
          createdAt: r.created_at,
          roomId: r.room_id,
          label: r.label,
          from: r.date_from,
          to: r.date_to,
          entries: restoreEntries(r).length,
        })),
      });
    }

    // Preise und Mindestaufenthalt einer Sicherung zurückschreiben. Die
    // Verfügbarkeit bleibt bewusst unangetastet: Nächte, die seitdem gebucht
    // oder gesperrt wurden, dürfen nicht wieder freigegeben werden.
    if (body.action === 'restoreSnapshot') {
      const snapshot = await getSnapshot(env.DB, Number(body.snapshotId));
      if (!snapshot) {
        return NextResponse.json({ error: 'Sicherung nicht gefunden' }, { status: 404 });
      }
      // ROOM_ACTIONS hat body.roomId geprüft — die Sicherung muss dazu passen
      if (snapshot.room_id !== Number(body.roomId)) {
        return NextResponse.json(
          { error: 'Sicherung gehört zu einem anderen Zimmer' },
          { status: 403 },
        );
      }
      const entries = restoreEntries(snapshot);
      if (entries.length === 0) {
        return NextResponse.json({ error: 'Die Sicherung enthält keine Preise' }, { status: 400 });
      }
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      // Auch das Zurückschreiben wird gesichert — so lässt es sich ebenfalls umkehren
      const backup = await saveSnapshot(
        env.DB,
        token,
        snapshot.room_id,
        snapshot.date_from,
        snapshot.date_to,
        `Vor Wiederherstellung von Sicherung #${snapshot.id}`,
      );
      if (backup.error) {
        return NextResponse.json({ error: backup.error }, { status: 502 });
      }
      const res = await fetch(`${BEDS24_API}/inventory/rooms/calendar`, {
        method: 'POST',
        headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify([{ roomId: snapshot.room_id, calendar: entries }]),
      });
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Wiederherstellung abgelehnt');
      if (failure) return failure;
      return NextResponse.json({ success: true, count: entries.length });
    }

    // Rückprüfung nach dem Speichern: Was steht bei Beds24 jetzt wirklich im
    // Kalender? Damit lässt sich sauber trennen, ob eine Änderung schon bei
    // Beds24 hängt oder erst auf dem Weg zu den Portalen.
    if (body.action === 'verifyCalendar') {
      const roomId = Number(body.roomId);
      const from = String(body.from || '');
      const to = String(body.to || '');
      const dateRe = /^\d{4}-\d{2}-\d{2}$/;
      if (!Number.isFinite(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'roomId fehlt oder ungültig' }, { status: 400 });
      }
      if (!dateRe.test(from) || !dateRe.test(to) || to < from) {
        return NextResponse.json({ error: 'Ungültiger Zeitraum' }, { status: 400 });
      }

      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }

      const res = await fetch(
        `${BEDS24_API}/inventory/rooms/calendar?startDate=${from}&endDate=${to}&roomId=${roomId}` +
          '&includePrices=true&includeMinStay=true&includeNumAvail=true',
        { headers: { token, Accept: 'application/json' } },
      );
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Rückprüfung abgelehnt');
      if (failure) return failure;

      // Antwort auf die Tageswerte des Zeitraums eindampfen
      const rows = ((parsed.data as { data?: unknown })?.data ?? []) as unknown[];
      const days: Array<{
        from?: string;
        to?: string;
        price1?: number;
        minStay?: number;
        numAvail?: number;
      }> = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        const list = (row as { calendar?: unknown }).calendar;
        for (const entry of Array.isArray(list) ? list : []) {
          const e = entry as {
            from?: string;
            to?: string;
            price1?: number;
            minStay?: number;
            numAvail?: number;
          };
          days.push({
            from: e.from,
            to: e.to,
            price1: e.price1,
            minStay: e.minStay,
            numAvail: e.numAvail,
          });
        }
      }

      return NextResponse.json({ success: true, days });
    }

    // Gegenprobe: Was bietet Beds24 für einen konkreten Aufenthalt wirklich an?
    // Der Mindestaufenthalt im Kalender gilt nur für Anreisen an diesem Tag und
    // kann von einem Angebot/Ratenplan mit eigenem (kleinerem) Mindestaufenthalt
    // ausgehebelt werden. Liefert /inventory/rooms/offers hier trotz minStay ein
    // buchbares Angebot für z.B. eine Nacht, greift die Beschränkung nicht — und
    // dann ist die Nacht auch bei Booking.com buchbar.
    if (body.action === 'checkStay') {
      const roomId = Number(body.roomId);
      const arrival = String(body.arrival || '');
      const nights = Math.min(Math.max(Number(body.nights) || 1, 1), 30);
      const numAdults = Math.min(Math.max(Number(body.numAdults) || 2, 1), 20);
      if (!Number.isFinite(roomId) || roomId <= 0) {
        return NextResponse.json({ error: 'roomId fehlt oder ungültig' }, { status: 400 });
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival)) {
        return NextResponse.json({ error: 'Ungültiges Anreisedatum' }, { status: 400 });
      }
      const departure = addDaysIso(arrival, nights);

      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }

      const res = await fetch(
        `${BEDS24_API}/inventory/rooms/offers?roomId=${roomId}&arrival=${arrival}&departure=${departure}&numAdults=${numAdults}`,
        { headers: { token, Accept: 'application/json' } },
      );
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Prüfung abgelehnt');
      if (failure) return failure;

      // Antwort auf das Wesentliche eindampfen: welche Angebote sind buchbar?
      const rows = ((parsed.data as { data?: unknown })?.data ?? []) as unknown[];
      const offers: { offerId?: number; offerName?: string; price?: number }[] = [];
      for (const row of Array.isArray(rows) ? rows : []) {
        const list = (row as { offers?: unknown }).offers;
        for (const offer of Array.isArray(list) ? list : []) {
          const o = offer as {
            offerId?: number;
            offerName?: string;
            price?: number;
            unitsAvailable?: number;
          };
          if (o.unitsAvailable !== undefined && o.unitsAvailable <= 0) continue;
          offers.push({ offerId: o.offerId, offerName: o.offerName, price: o.price });
        }
      }

      return NextResponse.json({ success: true, arrival, departure, nights, offers });
    }

    // Zimmer-Einstellungen bei Beds24 ändern (z.B. Endreinigung/cleaningFee)
    if (body.action === 'setRoomSettings') {
      const propertyId = Number(body.propertyId);
      const roomId = Number(body.roomId);
      const cleaningFee = Number(body.cleaningFee);
      if (
        !Number.isFinite(propertyId) ||
        propertyId <= 0 ||
        !Number.isFinite(roomId) ||
        roomId <= 0
      ) {
        return NextResponse.json({ error: 'propertyId/roomId fehlt' }, { status: 400 });
      }
      if (!Number.isFinite(cleaningFee) || cleaningFee < 0 || cleaningFee > 10000) {
        return NextResponse.json({ error: 'Ungültige Endreinigung' }, { status: 400 });
      }
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      const res = await fetch(`${BEDS24_API}/properties`, {
        method: 'POST',
        headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify([{ id: propertyId, roomTypes: [{ id: roomId, cleaningFee }] }]),
      });
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Änderung abgelehnt');
      if (failure) return failure;
      return NextResponse.json({ success: true, data: parsed.data });
    }

    // Webhook-URL für Beds24 (Key wird beim ersten Abruf erzeugt)
    if (body.action === 'webhookInfo') {
      let webhookKey = await getSetting(env.DB, 'beds24_webhook_key');
      if (!webhookKey) {
        webhookKey = crypto.randomUUID().replace(/-/g, '');
        await setSetting(env.DB, 'beds24_webhook_key', webhookKey);
      }
      const origin = new URL(request.url).origin;
      return NextResponse.json({
        success: true,
        url: `${origin}/api/beds24-webhook?key=${webhookKey}`,
      });
    }

    // Nachricht an den Gast senden (z.B. Booking.com-Chat via Beds24)
    if (body.action === 'sendMessage') {
      const bookingId = Number(body.bookingId);
      const message = (body.message || '').trim();
      if (!Number.isFinite(bookingId) || bookingId <= 0 || !message) {
        return NextResponse.json({ error: 'bookingId und message erforderlich' }, { status: 400 });
      }
      const propertyId = await getPropertyId(env.DB);
      if (!propertyId) {
        return NextResponse.json(
          { error: 'Bitte zuerst die Beds24-Unterkunft der Sechszirbenhütte wählen' },
          { status: 400 },
        );
      }
      const { token, error } = await getBeds24AccessToken(env.DB);
      if (!token) {
        return NextResponse.json({ error }, { status: 400 });
      }
      // Nur an Gäste der eigenen Unterkunft schreiben (gemeinsames Konto)
      const ownRes = await fetch(
        `${BEDS24_API}/bookings?id=${bookingId}&propertyId=${propertyId}`,
        { headers: { token, Accept: 'application/json' } },
      );
      const own = await parseJsonSafe(ownRes);
      const ownRows = own.ok ? (own.data as { data?: unknown })?.data : null;
      if (!Array.isArray(ownRows) || ownRows.length === 0) {
        return NextResponse.json(
          { error: `Buchung ${bookingId} gehört nicht zur gewählten Unterkunft` },
          { status: 403 },
        );
      }
      const res = await fetch(`${BEDS24_API}/bookings/messages`, {
        method: 'POST',
        headers: { token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify([{ bookingId, message }]),
      });
      const parsed = await parseJsonSafe(res);
      const failure = beds24Failure(res, parsed, 'Beds24 hat die Nachricht abgelehnt');
      if (failure) return failure;
      return NextResponse.json({ success: true, data: parsed.data });
    }

    return NextResponse.json({ error: `Unbekannte Aktion: ${body.action}` }, { status: 400 });
  } catch (error) {
    console.error('POST /api/admin/beds24 error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
