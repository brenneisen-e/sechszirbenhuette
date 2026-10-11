// Booking.com liefert Gastangaben nicht als Nachricht, sondern als Freitext im
// Beds24-Buchungsfeld `comments`. Der Block ist immer englisch und folgt festen
// Zeilen, z.B.:
//
//   ** THIS RESERVATION HAS BEEN PRE-PAID **
//   Approximate time of arrival: between 16:00 and 17:00
//   Non Smoking Requested
//
// Hier wird daraus die voraussichtliche Ankunftszeit gelesen.

/** Ab dieser Uhrzeit gilt eine Anreise als Late Check-In. */
export const LATE_CHECKIN_FROM_HOUR = 19;

export interface ParsedArrivalTime {
  /** Anzeigefertig, z.B. "16:00" oder "16:00 - 17:00" */
  time: string;
  /** Späteste genannte Uhrzeit in Minuten seit Mitternacht */
  latestMinutes: number;
  /** Anreise kann um 19:00 oder später erfolgen → Bestätigung nötig */
  isLate: boolean;
}

/**
 * Liest die Zeile "Approximate time of arrival: ..." aus dem Kommentarfeld.
 * Gibt null zurück, wenn die Zeile fehlt oder keine Uhrzeit enthält (Gäste
 * können bei Booking.com auch "I don't know" auswählen).
 */
export function parseArrivalTime(comments: string | null | undefined): ParsedArrivalTime | null {
  if (!comments) return null;

  // Nur die Angabe bis zum Zeilenende betrachten — sonst würden Zahlen aus
  // Folgezeilen ("Payment charge is EUR 8.694") mitgelesen.
  const line = /approximate\s+(?:time\s+of\s+arrival|arrival\s+time)\s*:?\s*([^\r\n]*)/i.exec(
    comments,
  );
  if (!line) return null;

  const times: number[] = [];
  const timePattern = /(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/gi;
  const rest = line[1] ?? '';
  let match = timePattern.exec(rest);
  while (match !== null) {
    const minutes = toMinutes(match[1] ?? '', match[2], match[3]);
    if (minutes !== null) times.push(minutes);
    match = timePattern.exec(rest);
  }
  const first = times[0];
  if (first === undefined) return null;

  // Booking.com nennt bei einer Zeitspanne immer Start und Ende in dieser
  // Reihenfolge; mehr als zwei Werte kommen nicht vor, werden aber toleriert.
  const from = first;
  const to = times[times.length - 1] ?? first;
  const latestMinutes = Math.max(from, to);

  return {
    time: from === to ? formatTime(from) : `${formatTime(from)} - ${formatTime(to)}`,
    latestMinutes,
    isLate: latestMinutes >= LATE_CHECKIN_FROM_HOUR * 60,
  };
}

function toMinutes(
  rawHour: string,
  rawMinute: string | undefined,
  meridiem: string | undefined,
): number | null {
  let hour = Number(rawHour);
  const minute = rawMinute === undefined ? 0 : Number(rawMinute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (minute > 59) return null;

  if (meridiem) {
    // 12-Stunden-Angabe: 12:30 AM ist 00:30, 12:30 PM bleibt 12:30.
    if (hour < 1 || hour > 12) return null;
    const isPm = meridiem.toLowerCase() === 'pm';
    if (hour === 12) hour = isPm ? 12 : 0;
    else if (isPm) hour += 12;
  } else if (hour > 23) {
    return null;
  }

  return hour * 60 + minute;
}

function formatTime(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
