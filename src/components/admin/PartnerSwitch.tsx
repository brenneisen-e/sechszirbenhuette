'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2 } from 'lucide-react';

import { partnerApi, type PartnerStatus } from './price-overview/api';

// Wechsel ins Admin Center der anderen Hütte (Partner-Verbindung). Erscheint
// nur, wenn beide Admin Center gekoppelt sind. Das Ziel meldet direkt an,
// wenn es das erlaubt — sonst zeigt es seine normale Anmeldung.

interface Props {
  /** Aktiver Tab — das andere Admin Center öffnet denselben, wenn es ihn hat */
  tab?: string;
  compact?: boolean;
}

export default function PartnerSwitch({ tab, compact = false }: Props) {
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    partnerApi<PartnerStatus>({ action: 'status' }).then((res) => {
      if (active && res.success && res.partner) setPartnerName(res.partner.name);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!partnerName) return null;

  const go = async () => {
    setBusy(true);
    const res = await partnerApi<{ url?: string }>({ action: 'switchUrl', tab });
    if (res.url) {
      window.location.href = res.url;
      return;
    }
    setBusy(false);
    window.alert(res.error || 'Wechsel nicht möglich');
  };

  const Icon = busy ? Loader2 : ArrowLeftRight;

  if (compact) {
    return (
      <button
        onClick={go}
        disabled={busy}
        title={`Zum Admin Center der ${partnerName}`}
        className="p-1 text-gray-400 hover:text-gray-600"
      >
        <Icon className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`} />
      </button>
    );
  }

  return (
    <button
      onClick={go}
      disabled={busy}
      title={`Zum Admin Center der ${partnerName}`}
      className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
    >
      <Icon className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
      {partnerName}
    </button>
  );
}
