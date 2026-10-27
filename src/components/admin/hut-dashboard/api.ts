// Aufrufe des Reiters „Portalpreise“ (/api/admin/dashboard)

import {
  type DashboardData,
  enabledPlatforms,
  type NightState,
  type PlatformConfig,
  platformInfo,
  platformPrice,
} from '@/lib/dashboard/hutDashboard';

import { postJson } from '../price-overview/api';

export type HutTarget = 'own' | 'partner';

export interface DashboardHut {
  data?: DashboardData;
  error?: string;
  needsRoom?: boolean;
}

export interface DashboardLoad {
  own?: DashboardHut;
  partner?: DashboardHut | null;
  partnerName?: string | null;
}

export const loadDashboard = (from: string, to: string, partner: boolean) =>
  postJson<DashboardLoad>('/api/admin/dashboard', { action: 'load', from, to, partner });

export const savePlatformConfig = (hut: HutTarget, config: PlatformConfig) =>
  postJson<{ data?: PlatformConfig }>('/api/admin/dashboard', {
    action: 'saveConfig',
    hut,
    config,
  });

/** Eine Hütte in der Übersicht — eigene oder Partner-Hütte */
export interface HutSlot {
  target: HutTarget;
  key: string;
  name: string;
  data?: DashboardData;
  error?: string;
  states: Record<string, NightState>;
}

/** „400 €“, mit Cent nur wenn nötig */
export function euroShort(value: number): string {
  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}

export interface PlatformPriceRow {
  key: string;
  label: string;
  short: string;
  color: string;
  price: number | null;
  slot: number;
}

/** Preise einer Nacht auf allen eingeschalteten Plattformen */
export function pricesForNight(data: DashboardData, night: string): PlatformPriceRow[] {
  return enabledPlatforms(data.config).map((setting) => {
    const info = platformInfo(setting.key);
    return {
      key: setting.key,
      label: info.label,
      short: info.short,
      color: info.color,
      price: platformPrice(data.days[night], setting, data.config.rounding),
      slot: setting.slot,
    };
  });
}
