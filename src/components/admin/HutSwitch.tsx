'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Columns2, Loader2 } from 'lucide-react';

import { HUT_ORDER, HUT_SHORT_NAMES, type HutView } from '@/lib/dashboard/hutDashboard';

import { partnerApi, type PartnerStatus } from './price-overview/api';

// Hütten-Umschalter im Kopf des Admin Centers. Erscheint nur, wenn beide
// Admin Center gekoppelt sind (Partner-Verbindung, lib/server/partner.ts):
// - eigene Hütte: Übersicht nur dieser Hütte
// - andere Hütte: Wechsel in deren Admin Center (einmaliges Ticket; direkte
//   Anmeldung nur, wenn das Ziel es erlaubt — sonst dessen Anmeldung)
// - beide: Übersicht beider Hütten nebeneinander, hier im eigenen Admin Center

/** Ansicht aus der Adresse (?huts=both), damit sie ein Neuladen übersteht */
export function readHutView(): HutView {
  if (typeof window === 'undefined') return 'own';
  return new URLSearchParams(window.location.search).get('huts') === 'both' ? 'both' : 'own';
}

/** Ansicht in die Adresse schreiben, ohne die übrigen Parameter anzufassen */
export function hutViewUrl(view: HutView, tab?: string): string {
  const params = new URLSearchParams(window.location.search);
  if (tab) params.set('tab', tab);
  if (view === 'both') params.set('huts', 'both');
  else params.delete('huts');
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

interface Props {
  /** Aktiver Tab — das andere Admin Center öffnet denselben, wenn es ihn hat */
  tab?: string;
  view: HutView;
  onViewChange: (view: HutView) => void;
  compact?: boolean;
}

interface Option {
  id: 'own' | 'partner' | 'both';
  label: string;
  short: string;
  order: number;
}

export default function HutSwitch({ tab, view, onViewChange, compact = false }: Props) {
  const [status, setStatus] = useState<PartnerStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    partnerApi<PartnerStatus>({ action: 'status' }).then((res) => {
      if (active && res.success && res.partner) setStatus(res);
    });
    return () => {
      active = false;
    };
  }, []);

  // Menü (Handy) bei Tipp daneben schließen
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (!status?.partner) return null;

  const options: Option[] = [
    {
      id: 'own' as const,
      label: status.own.name,
      short: HUT_SHORT_NAMES[status.own.hut] ?? status.own.name,
      order: HUT_ORDER.indexOf(status.own.hut),
    },
    {
      id: 'partner' as const,
      label: status.partner.name,
      short: HUT_SHORT_NAMES[status.partner.hut] ?? status.partner.name,
      order: HUT_ORDER.indexOf(status.partner.hut),
    },
  ].sort((a, b) => a.order - b.order);
  options.push({ id: 'both', label: 'Beide', short: 'Beide', order: 99 });

  const current = view === 'both' ? 'both' : 'own';

  const choose = async (id: Option['id']) => {
    setOpen(false);
    if (id === 'own' || id === 'both') {
      onViewChange(id);
      return;
    }
    setBusy(true);
    const res = await partnerApi<{ url?: string }>({ action: 'switchUrl', tab });
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    setBusy(false);
    window.alert(res.error || 'Wechsel nicht möglich');
  };

  const icon = (option: Option) => {
    if (option.id === 'partner' && busy) return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
    if (option.id === 'both') return <Columns2 className="w-3.5 h-3.5" />;
    return null;
  };

  if (compact) {
    const active = options.find((o) => o.id === current);
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-700"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : active?.short}
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            {options.map((option) => (
              <button
                key={option.id}
                role="menuitem"
                onClick={() => choose(option.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  {icon(option)}
                  {option.id === 'both' ? 'Beide Hütten' : option.label}
                </span>
                {option.id === current && <Check className="w-4 h-4 text-green-600" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center rounded-lg border border-gray-200 p-0.5"
      role="radiogroup"
      aria-label="Hütte"
    >
      {options.map((option) => {
        const active = option.id === current;
        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={active}
            disabled={busy}
            onClick={() => choose(option.id)}
            title={option.id === 'partner' ? `Zum Admin Center der ${option.label}` : undefined}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
              active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {icon(option)}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
