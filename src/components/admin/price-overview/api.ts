// Aufrufe der Preisübersicht. Antworten immer als Text lesen und selbst
// parsen — bei einem Plattformfehler (HTML-Body) soll eine lesbare Meldung
// erscheinen statt „Unexpected token <“.

import type { HutData } from '@/lib/pricing/dynamicPricing';

export type HutTarget = 'own' | 'partner';

export interface HutResponse {
  data?: HutData;
  error?: string;
  needsRoom?: boolean;
}

export interface PartnerStatus {
  own: { name: string; hut: string };
  partner: { name: string; url: string; hut: string } | null;
  ssoAllowed: boolean;
  pendingInvite: boolean;
}

export async function postJson<T>(
  url: string,
  payload: Record<string, unknown>,
): Promise<T & { success?: boolean; error?: string; needsRoom?: boolean }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!text) return { error: `Leere Antwort (HTTP ${res.status})` } as T & { error: string };
    try {
      return JSON.parse(text) as T & { success?: boolean; error?: string };
    } catch {
      return {
        error: `Serverfehler (HTTP ${res.status}): ${text
          .replace(/<[^>]*>/g, ' ')
          .trim()
          .slice(0, 160)}`,
      } as T & { error: string };
    }
  } catch {
    return { error: 'Verbindungsfehler' } as T & { error: string };
  }
}

export const priceApi = (payload: Record<string, unknown>) =>
  postJson<{ data?: unknown }>('/api/admin/price-overview', payload);

export const partnerApi = <T = Record<string, unknown>>(payload: Record<string, unknown>) =>
  postJson<T>('/api/admin/partner', payload);

/** Heutiges Datum in Österreich (YYYY-MM-DD) */
export function viennaToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Vienna' }).format(new Date());
}

export function euro(value: number): string {
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} €`;
}

function plain(value: number): string {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 2 });
}

/** Verschiedene Werte wie in einer Saisonliste: „155 €“, „392/406 €“, ab vier Werten „155–406 €“ */
export function euroList(values: number[]): string {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined) return '—';
  if (values.length <= 3) return `${values.map(plain).join('/')} €`;
  return `${plain(first)}–${euro(last)}`;
}

export function stayList(values: number[]): string {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined) return '';
  if (values.length <= 3) return `min. ${values.join('/')}`;
  return `min. ${first}–${last}`;
}
