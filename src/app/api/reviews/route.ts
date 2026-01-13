import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Placeholder reviews - in production this would come from Cloudflare D1
const PLACEHOLDER_REVIEWS = [
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
  {
    id: 5,
    gast_name: 'Thomas W.',
    bewertung: 5,
    titel: 'Wintertraum',
    text: 'Perfekte Lage für Skifahrer und Langläufer. Die Pisten sind schnell erreichbar und nach einem aktiven Tag gibt es nichts Besseres als die private Sauna. Top Ausstattung, sehr sauber!',
    aufenthalt_von: '2024-01-28',
    quelle: 'Booking.com',
  },
  {
    id: 6,
    gast_name: 'Maria & Peter',
    bewertung: 5,
    titel: 'Romantischer Rückzugsort',
    text: 'Der perfekte Ort für eine Auszeit zu zweit. Die Alleinlage ist wunderbar ruhig, die Ausstattung hochwertig. Besonders der Pelletofen sorgt für eine tolle Atmosphäre.',
    aufenthalt_von: '2024-03-15',
    quelle: 'FeWo-direkt',
  },
];

export async function GET() {
  return NextResponse.json({ reviews: PLACEHOLDER_REVIEWS });
}
