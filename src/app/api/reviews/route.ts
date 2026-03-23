import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

interface ReviewRecord {
  id: number;
  gast_name: string;
  bewertung: number;
  titel: string | null;
  text: string | null;
  aufenthalt_von: string | null;
  quelle: string | null;
}

// Fallback reviews when DB is not available
const FALLBACK_REVIEWS: ReviewRecord[] = [
  {
    id: 1,
    gast_name: 'Familie M.',
    bewertung: 5,
    titel: 'Traumhafter Urlaub',
    text: 'Die Sechszirbenhütte ist ein absoluter Traum! Die Lage ist einzigartig, die Ausstattung top und die Sauna perfekt nach einem Tag auf der Piste. Wir kommen definitiv wieder!',
    aufenthalt_von: '2024-02-10',
    quelle: 'Google',
  },
  {
    id: 2,
    gast_name: 'Stefan & Anna',
    bewertung: 5,
    titel: 'Perfekte Auszeit',
    text: 'Endlich mal richtig abschalten können. Die Hütte ist liebevoll eingerichtet, sehr sauber und die Umgebung ist einfach wunderschön. Ein Highlight war die private Sauna!',
    aufenthalt_von: '2024-01-15',
    quelle: 'Booking.com',
  },
  {
    id: 3,
    gast_name: 'Hundefamilie K.',
    bewertung: 5,
    titel: 'Perfekt mit Hund',
    text: 'Endlich eine Unterkunft, in der unser Hund wirklich willkommen ist! Die Wandermöglichkeiten direkt vor der Tür sind fantastisch. Die Hütte ist gemütlich und hat alles was man braucht.',
    aufenthalt_von: '2023-08-20',
    quelle: 'FeWo-direkt',
  },
  {
    id: 4,
    gast_name: 'Familie Schneider',
    bewertung: 5,
    titel: 'Wie im Bilderbuch',
    text: 'Die Hütte sieht genauso aus wie auf den Fotos - sogar noch schöner! Unsere Kinder haben die Heidi-Alm geliebt und wir die Ruhe am Abend. Absolute Empfehlung!',
    aufenthalt_von: '2024-07-05',
    quelle: 'Google',
  },
];

export async function GET() {
  try {
    const ctx = await getCloudflareContext();
    const env = ctx.env as unknown as { DB: { prepare: (q: string) => { all: <T>() => Promise<{ results?: T[] }> } } };

    if (env?.DB) {
      const result = await env.DB.prepare(
        'SELECT id, gast_name, bewertung, titel, text, aufenthalt_von, quelle FROM reviews WHERE sichtbar = 1 ORDER BY created_at DESC'
      ).all<ReviewRecord>();

      const reviews = result.results || [];
      if (reviews.length > 0) {
        return NextResponse.json({ reviews });
      }
    }
  } catch {
    // Fall through to fallback
  }

  return NextResponse.json({ reviews: FALLBACK_REVIEWS });
}
