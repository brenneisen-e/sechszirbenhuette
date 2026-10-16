'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Link2,
  Loader2,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';

import { DEMAND_COLOR, demandByNight } from '@/lib/demand/scoring';
import {
  buildRows,
  type CellSummary,
  deriveRules,
  differs,
  formatRange,
  type HutData,
  type HutKey,
  LEVEL_NAMES,
  monthName,
  nightsOf,
  type NightSuggestion,
  type PeriodRow,
  type PriceRules,
  type RowMode,
  rulesProblem,
  suggestAll,
  summarize,
  toEntries,
} from '@/lib/pricing/dynamicPricing';

import {
  euroList,
  type HutResponse,
  type HutTarget,
  partnerApi,
  type PartnerStatus,
  priceApi,
  stayList,
  viennaToday,
} from './price-overview/api';
import EditPeriodDialog, {
  manualTargets,
  type ManualValues,
} from './price-overview/EditPeriodDialog';
import PartnerConnection from './price-overview/PartnerConnection';
import RulesEditor from './price-overview/RulesEditor';

// Preisübersicht beider Hütten: Preise und Mindestaufenthalte der
// Natberger Hütte und der Sechszirbenhütte live aus Beds24, nebeneinander
// je Zeitraum, mit Vorschlägen aus den Preisregeln (Nachfrage je Nacht) —
// und steuerbar: Vorschläge oder eigene Werte lassen sich direkt zu Beds24
// schreiben. Die andere Hütte läuft über ihr eigenes Admin Center
// (Partner-Verbindung, lib/server/partner.ts).

const HUT_ORDER: HutKey[] = ['szh', 'natberger'];
const TARGETS: HutTarget[] = ['own', 'partner'];

interface Slot {
  target: HutTarget;
  hutKey: string;
  name: string;
  response: HutResponse;
}

interface RoomOption {
  id: number;
  name: string;
  propertyName: string;
  hasPrices: boolean;
}

type Target = { night: string; price1?: number; minStay?: number };

const MODES: { id: RowMode; label: string }[] = [
  { id: 'seasons', label: 'Preiszeiträume' },
  { id: 'weeks', label: 'Wochen' },
  { id: 'months', label: 'Monate' },
];

/**
 * Gliederung links: Wie viele Zeilen umfasst der Saison- bzw. Monatsblock,
 * der in dieser Zeile beginnt (0 = Zeile gehört zum Block darüber)? Ein
 * Monatsblock endet auch an einer Saisongrenze, damit er im Saisonblock liegt.
 */
function groupSpans(rows: PeriodRow[]): { season: number; month: number }[] {
  const spans = rows.map(() => ({ season: 0, month: 0 }));
  let seasonStart = 0;
  let monthStart = 0;
  rows.forEach((row, i) => {
    const prev = rows[i - 1];
    if (!prev || prev.season !== row.season) seasonStart = i;
    if (!prev || prev.season !== row.season || prev.month !== row.month) monthStart = i;
    const season = spans[seasonStart];
    const month = spans[monthStart];
    if (season) season.season += 1;
    if (month) month.month += 1;
  });
  return spans;
}

function levelDot(level: number) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full border border-gray-300 shrink-0"
      style={{ background: level === 0 ? '#ffffff' : DEMAND_COLOR[level as 1 | 2 | 3] }}
    />
  );
}

/** Aktueller Wert einzeilig: „155 € min. 3“, belegte Zeiträume grau */
function CurrentCell({ summary }: { summary: CellSummary }) {
  if (summary.nights === 0) return <span className="text-gray-300">—</span>;
  if (summary.blocked === summary.nights) {
    // Wie in der Saisonliste: Preis bleibt sichtbar, der Zeitraum ist aber vergeben
    return (
      <span className="text-gray-400 whitespace-nowrap">
        {summary.blockedPrices.length > 0 && `${euroList(summary.blockedPrices)} · `}belegt
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap">
      <span className="font-medium text-gray-900 tabular-nums">{euroList(summary.prices)}</span>
      <span className="ml-1.5 text-xs text-gray-500">{stayList(summary.stays)}</span>
      {summary.blocked > 0 && (
        <span className="ml-1.5 text-xs text-gray-400">
          {summary.blocked}/{summary.nights} belegt
        </span>
      )}
    </span>
  );
}

function SuggestionCell({ summary }: { summary: CellSummary }) {
  if (summary.suggestPrices.length === 0) return <span className="text-gray-300">—</span>;
  if (summary.diffNights === 0) return <span className="text-xs text-gray-400">passt</span>;
  return (
    <span className="whitespace-nowrap text-purple-700">
      <span className="font-medium tabular-nums">
        {summary.fixedLabel && `${summary.fixedLabel} `}
        {euroList(summary.suggestPrices)}
      </span>
      <span className="ml-1.5 text-xs">{stayList(summary.suggestStays)}</span>
    </span>
  );
}

export default function PriceOverview() {
  const [status, setStatus] = useState<PartnerStatus | null>(null);
  const [showConnection, setShowConnection] = useState(false);
  const [months, setMonths] = useState(12);
  const [mode, setMode] = useState<RowMode>('seasons');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [responses, setResponses] = useState<Record<HutTarget, HutResponse | null>>({
    own: null,
    partner: null,
  });
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

  // Preisregeln: gespeichert und Entwurf je Hütte
  const [savedRules, setSavedRules] = useState<Partial<Record<HutTarget, PriceRules>>>({});
  // Gespeicherter Stand für load(): ungespeicherte Entwürfe bleiben beim Neuladen erhalten
  const savedRef = useRef<Partial<Record<HutTarget, PriceRules>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<HutTarget, PriceRules>>>({});
  const [rulesOpen, setRulesOpen] = useState<HutTarget | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesError, setRulesError] = useState('');

  const [editing, setEditing] = useState<{ row: PeriodRow; target: HutTarget } | null>(null);
  const [dialogError, setDialogError] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [confirmAll, setConfirmAll] = useState<HutTarget | null>(null);
  const [busy, setBusy] = useState<HutTarget | null>(null);
  const [notice, setNotice] = useState<
    Partial<Record<HutTarget, { text: string; error?: boolean }>>
  >({});

  const [rooms, setRooms] = useState<RoomOption[] | null>(null);
  const [roomChoice, setRoomChoice] = useState('');

  const today = useMemo(() => viennaToday(), []);

  const loadStatus = useCallback(async () => {
    const res = await partnerApi<PartnerStatus>({ action: 'status' });
    if (res.success) setStatus(res);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const res = (await priceApi({ action: 'load', months })) as {
      success?: boolean;
      error?: string;
      own?: HutResponse;
      partner?: HutResponse | null;
      partnerName?: string | null;
    };
    setLoading(false);
    if (!res.success) {
      setLoadError(res.error || 'Daten konnten nicht geladen werden');
      return;
    }
    setResponses({ own: res.own ?? null, partner: res.partner ?? null });
    setPartnerName(res.partnerName ?? null);
    const rules: Partial<Record<HutTarget, PriceRules>> = {};
    if (res.own?.data?.rules) rules.own = res.own.data.rules;
    if (res.partner?.data?.rules) rules.partner = res.partner.data.rules;
    const previous = savedRef.current;
    savedRef.current = rules;
    setSavedRules(rules);
    setDrafts((prev) => {
      const next: Partial<Record<HutTarget, PriceRules>> = {};
      for (const t of TARGETS) {
        const draft = prev[t];
        const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(previous[t] ?? null);
        const value = dirty ? draft : rules[t];
        if (value) next[t] = value;
      }
      return next;
    });
    setLoadedAt(new Date());
  }, [months]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const connectionChanged = () => {
    loadStatus();
    load();
  };

  // ---------------------------------------------------------------- Daten

  const range = useMemo(() => {
    const list = TARGETS.map((t) => responses[t]?.data).filter(Boolean) as HutData[];
    const [first, ...rest] = list;
    if (!first) return null;
    return {
      from: rest.reduce((min, d) => (d.from < min ? d.from : min), first.from),
      to: rest.reduce((max, d) => (d.to > max ? d.to : max), first.to),
    };
  }, [responses]);

  const demand = useMemo(() => (range ? demandByNight(range.from, range.to) : {}), [range]);
  const rows = useMemo(
    () =>
      range
        ? buildRows(
            range.from,
            range.to,
            mode,
            demand,
            // Für die Saisons: Reihenfolge wie die Spalten, damit der Schlüssel stabil ist
            TARGETS.map((t) => responses[t]?.data?.days ?? {}),
          )
        : [],
    [range, mode, demand, responses],
  );

  const suggestions = useMemo(() => {
    const out: Partial<Record<HutTarget, Record<string, NightSuggestion>>> = {};
    for (const t of TARGETS) {
      const data = responses[t]?.data;
      const rules = drafts[t];
      if (data && rules && !rulesProblem(rules)) {
        out[t] = suggestAll(Object.keys(data.days), demand, rules, today);
      }
    }
    return out;
  }, [responses, drafts, demand, today]);

  const slots = useMemo(() => {
    const list: Slot[] = [];
    if (responses.own) {
      list.push({
        target: 'own',
        hutKey: responses.own.data?.hut ?? status?.own.hut ?? '',
        name: responses.own.data?.name ?? status?.own.name ?? 'Diese Hütte',
        response: responses.own,
      });
    }
    if (responses.partner) {
      list.push({
        target: 'partner',
        hutKey: responses.partner.data?.hut ?? status?.partner?.hut ?? '',
        name: responses.partner.data?.name ?? partnerName ?? 'Partner-Hütte',
        response: responses.partner,
      });
    }
    return list.sort(
      (a, b) => HUT_ORDER.indexOf(a.hutKey as HutKey) - HUT_ORDER.indexOf(b.hutKey as HutKey),
    );
  }, [responses, status, partnerName]);

  const isDirty = (t: HutTarget) =>
    !!drafts[t] && JSON.stringify(drafts[t]) !== JSON.stringify(savedRules[t] ?? null);

  const suggestionTargets = (t: HutTarget, from?: string, to?: string): Target[] => {
    const data = responses[t]?.data;
    const sugg = suggestions[t];
    if (!data || !sugg) return [];
    const nights = from && to ? nightsOf(from, to) : Object.keys(data.days).sort();
    const targets: Target[] = [];
    for (const night of nights) {
      const day = data.days[night];
      const s = sugg[night];
      if (day?.a === 1 && s && differs(day, s)) {
        targets.push({ night, price1: s.price, minStay: s.minStay });
      }
    }
    return targets;
  };

  // ---------------------------------------------------------------- Aktionen

  const setHutNotice = (t: HutTarget, text: string, error = false) =>
    setNotice((prev) => ({ ...prev, [t]: { text, error } }));

  const saveRules = async (t: HutTarget, rules: PriceRules): Promise<boolean> => {
    const res = (await priceApi({ action: 'saveRules', hut: t, rules })) as {
      success?: boolean;
      error?: string;
      data?: PriceRules;
    };
    if (!res.success || !res.data) {
      setRulesError(res.error || 'Speichern fehlgeschlagen');
      return false;
    }
    savedRef.current = { ...savedRef.current, [t]: res.data };
    setSavedRules((prev) => ({ ...prev, [t]: res.data }));
    setDrafts((prev) => ({ ...prev, [t]: res.data }));
    return true;
  };

  /** Ziele zu Beds24 schreiben; geänderte Regeln vorher speichern */
  const apply = async (
    t: HutTarget,
    targets: Target[],
    label: string,
    rulesToSave?: PriceRules,
  ): Promise<{ ok: boolean; error?: string }> => {
    if (targets.length === 0) return { ok: false, error: 'Keine Änderung nötig' };
    setBusy(t);
    if (rulesToSave && !(await saveRules(t, rulesToSave))) {
      setBusy(null);
      return { ok: false, error: 'Preisregeln konnten nicht gespeichert werden' };
    }
    const res = await priceApi({ action: 'apply', hut: t, entries: toEntries(targets), label });
    setBusy(null);
    if (!res.success) {
      setHutNotice(t, res.error || 'Übernahme fehlgeschlagen', true);
      return { ok: false, error: res.error || 'Übernahme fehlgeschlagen' };
    }
    setHutNotice(t, `${targets.length} Nächte bei Beds24 geändert (${label})`);
    await load();
    return { ok: true };
  };

  const applyRowSuggestions = async () => {
    if (!editing) return;
    const { row, target } = editing;
    setDialogError('');
    setDialogMessage('');
    const result = await apply(
      target,
      suggestionTargets(target, row.from, row.to),
      `Vorschläge ${formatRange(row.from, row.to)}`,
      isDirty(target) ? drafts[target] : undefined,
    );
    if (result.ok) setDialogMessage('Übernommen');
    else setDialogError(result.error || 'Fehler');
  };

  const applyRowManual = async (values: ManualValues) => {
    if (!editing) return;
    const { row, target } = editing;
    const data = responses[target]?.data;
    if (!data) return;
    setDialogError('');
    setDialogMessage('');
    let rulesToSave = isDirty(target) ? drafts[target] : undefined;
    const draft = drafts[target];
    if (values.remember && draft) {
      rulesToSave = {
        ...draft,
        fixed: [
          ...draft.fixed.filter((f) => !(f.from === row.from && f.to === row.to)),
          {
            from: row.from,
            to: row.to,
            price: values.price,
            minStay: values.minStay,
            label: row.label.slice(0, 60),
          },
        ].sort((a, b) => a.from.localeCompare(b.from)),
      };
    }
    const parts = [
      values.price !== null ? `${values.price} €` : '',
      values.minStay !== null ? `min. ${values.minStay}` : '',
    ].filter(Boolean);
    const result = await apply(
      target,
      manualTargets(data, row.from, row.to, values),
      `${parts.join(', ')} ${formatRange(row.from, row.to)}`,
      rulesToSave,
    );
    if (result.ok) setDialogMessage('Gesetzt');
    else setDialogError(result.error || 'Fehler');
  };

  const applyAll = async (t: HutTarget) => {
    setConfirmAll(null);
    await apply(t, suggestionTargets(t), 'Alle Vorschläge', isDirty(t) ? drafts[t] : undefined);
  };

  const undo = async (t: HutTarget) => {
    const last = responses[t]?.data?.lastChange;
    if (!last) return;
    if (
      !window.confirm(
        `„${last.label}“ rückgängig machen? Die vorherigen Preise werden zurückgeschrieben.`,
      )
    ) {
      return;
    }
    setBusy(t);
    const res = await priceApi({ action: 'restore', hut: t, snapshotId: last.snapshotId });
    setBusy(null);
    if (!res.success) {
      setHutNotice(t, res.error || 'Rückgängig fehlgeschlagen', true);
      return;
    }
    setHutNotice(t, 'Vorherige Preise wiederhergestellt');
    await load();
  };

  const openRules = (t: HutTarget) => {
    setRulesError('');
    const data = responses[t]?.data;
    if (!drafts[t] && data) {
      setDrafts((prev) => ({ ...prev, [t]: deriveRules(data.days, demand) }));
    }
    setRulesOpen(t);
  };

  const deriveDraft = (t: HutTarget) => {
    const data = responses[t]?.data;
    if (!data) return;
    const derived = deriveRules(data.days, demand);
    setDrafts((prev) => ({ ...prev, [t]: { ...derived, fixed: prev[t]?.fixed ?? [] } }));
  };

  const loadRooms = async () => {
    const res = (await priceApi({ action: 'rooms' })) as { success?: boolean; data?: RoomOption[] };
    if (!res.success || !res.data) return;
    setRooms(res.data);
    // Gemeinsames Beds24-Konto: Zimmer der eigenen Unterkunft vorschlagen —
    // nach Namen, sonst das erste Zimmer, für das Beds24 Preise führt
    const key = (status?.own.name ?? '').split(' ')[0]?.toLowerCase() ?? '';
    const byName = key ? res.data.filter((r) => r.propertyName.toLowerCase().includes(key)) : [];
    const guess = byName.length === 1 ? byName[0] : res.data.find((r) => r.hasPrices);
    if (guess) setRoomChoice(String(guess.id));
  };

  const saveRoom = async () => {
    const res = await priceApi({ action: 'setRoom', roomId: Number(roomChoice) });
    if (!res.success) {
      setHutNotice('own', res.error || 'Zimmer konnte nicht gespeichert werden', true);
      return;
    }
    setRooms(null);
    await load();
  };

  // ---------------------------------------------------------------- Ansicht

  const editingData = editing ? responses[editing.target]?.data : undefined;
  const confirmTargets = confirmAll ? suggestionTargets(confirmAll) : [];
  const confirmFirst = confirmTargets[0];
  const confirmLast = confirmTargets[confirmTargets.length - 1];
  // Nächte, die mehr als 30 % günstiger würden — zur Sicherheit im Dialog nennen
  const confirmDrops = confirmAll
    ? confirmTargets.filter((x) => {
        const current = responses[confirmAll]?.data?.days[x.night]?.p;
        return current !== undefined && x.price1 !== undefined && x.price1 < current * 0.7;
      }).length
    : 0;
  const confirmSlot = slots.find((s) => s.target === confirmAll);

  const renderSlotCard = (slot: Slot) => {
    const data = slot.response.data;
    const t = slot.target;
    const pending = data && suggestions[t] ? suggestionTargets(t).length : 0;
    const hutNotice = notice[t];
    return (
      <div key={t} className="min-w-0 border border-gray-200 rounded-lg p-4 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900">{slot.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {data ? `Beds24 · ${data.roomName || `Zimmer ${data.roomId}`}` : 'keine Daten'}
              {t === 'partner' && ' · über die Partner-Verbindung'}
            </p>
          </div>
          {busy === t && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
        </div>

        {slot.response.error && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg p-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <div className="space-y-2">
              <p>{slot.response.error}</p>
              {slot.response.needsRoom && t === 'partner' && (
                <p>Bitte im Admin Center der {slot.name} unter Preisübersicht festlegen.</p>
              )}
              {slot.response.needsRoom && t === 'own' && !rooms && (
                <button onClick={loadRooms} className="underline">
                  Zimmer auswählen
                </button>
              )}
              {slot.response.needsRoom && t === 'own' && rooms && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={roomChoice}
                    onChange={(e) => setRoomChoice(e.target.value)}
                    className="px-2 py-1 border border-amber-200 rounded bg-white text-gray-900"
                  >
                    <option value="">Zimmer wählen …</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.propertyName} · {r.name || 'Zimmer'} (ID {r.id})
                        {!r.hasPrices && ' — ohne Preise'}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={saveRoom}
                    disabled={!roomChoice}
                    className="px-2 py-1 rounded bg-gray-900 text-white disabled:opacity-50"
                  >
                    Festlegen
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {data && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => (rulesOpen === t ? setRulesOpen(null) : openRules(t))}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border ${
                rulesOpen === t
                  ? 'border-gray-900 text-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Preisregeln
              {!savedRules[t] && <span className="text-gray-400">(neu)</span>}
              {isDirty(t) && <span className="text-amber-700">*</span>}
            </button>
            {suggestions[t] && (
              <button
                onClick={() => setConfirmAll(t)}
                disabled={busy !== null || pending === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {pending === 0
                  ? 'Alles entspricht den Regeln'
                  : `Alle Vorschläge übernehmen (${pending} N.)`}
              </button>
            )}
            {data.lastChange && (
              <button
                onClick={() => undo(t)}
                disabled={busy !== null}
                title={`${data.lastChange.label} · ${data.lastChange.createdAt}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Letzte Übernahme rückgängig
              </button>
            )}
          </div>
        )}
        {drafts[t] && rulesProblem(drafts[t] as PriceRules) && (
          <p className="mt-2 text-xs text-amber-700">
            Preisregeln unvollständig: {rulesProblem(drafts[t] as PriceRules)} — keine Vorschläge
          </p>
        )}
        {hutNotice && (
          <p className={`mt-2 text-xs ${hutNotice.error ? 'text-red-600' : 'text-green-700'}`}>
            {hutNotice.text}
          </p>
        )}
      </div>
    );
  };

  // Zeitraum einzeilig; Ferien und Feiertage nur bei hoher Nachfrage als
  // kurzer Hinweis, alles Weitere im Tooltip
  const periodCell = (row: PeriodRow) => (
    <span
      className="flex items-center gap-1.5 whitespace-nowrap"
      title={[
        `${formatRange(row.from, row.to)} · ${nightsOf(row.from, row.to).length} Nächte`,
        `Nachfrage ${LEVEL_NAMES[row.level]}`,
        ...row.reasons,
      ].join('\n')}
    >
      {levelDot(row.level)}
      <span className="text-gray-900 tabular-nums">{row.label}</span>
      {row.level >= 2 && row.reasons[0] && (
        <span className="text-xs text-gray-400 truncate max-w-[13rem]">{row.reasons[0]}</span>
      )}
    </span>
  );

  const spans = groupSpans(rows);
  const showMonth = mode !== 'months';

  const summaryFor = (slot: Slot, row: PeriodRow) =>
    summarize(row.from, row.to, slot.response.data?.days ?? {}, suggestions[slot.target] ?? null);

  const openEdit = (slot: Slot, row: PeriodRow) => {
    if (!slot.response.data) return;
    setDialogError('');
    setDialogMessage('');
    setEditing({ row, target: slot.target });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Preisübersicht beider Hütten</h2>
          <p className="text-xs text-gray-500">
            Preis je Nacht (Beds24 Standard-Rate) und Mindestaufenthalt für Anreisen — live aus
            Beds24
            {loadedAt &&
              `, Stand ${loadedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr`}
            . Zelle anklicken zum Ändern.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`px-3 py-1.5 ${
                  mode === m.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
          >
            <option value={6}>6 Monate</option>
            <option value={12}>12 Monate</option>
            <option value={18}>18 Monate</option>
          </select>
          {status?.partner && (
            <button
              onClick={() => setShowConnection((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              <Link2 className="w-3.5 h-3.5" />
              Verbindung
            </button>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Neu laden
          </button>
        </div>
      </div>

      {status && (!status.partner || showConnection) && (
        <PartnerConnection status={status} onChanged={connectionChanged} />
      )}

      {loadError && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
          <AlertCircle className="w-4 h-4" />
          {loadError}
        </div>
      )}

      {loading && !range && (
        <div className="flex items-center justify-center py-16 text-sm text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Lade Preise aus Beds24 …
        </div>
      )}

      {slots.length > 0 && (
        <div className={`grid gap-3 ${slots.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {slots.map(renderSlotCard)}
        </div>
      )}

      {rulesOpen && drafts[rulesOpen] && (
        <RulesEditor
          hutName={slots.find((s) => s.target === rulesOpen)?.name ?? ''}
          rules={drafts[rulesOpen] as PriceRules}
          dirty={isDirty(rulesOpen)}
          saving={rulesSaving}
          error={rulesError}
          onChange={(rules) => setDrafts((prev) => ({ ...prev, [rulesOpen]: rules }))}
          onDerive={() => deriveDraft(rulesOpen)}
          onSave={async () => {
            setRulesSaving(true);
            setRulesError('');
            await saveRules(rulesOpen, drafts[rulesOpen] as PriceRules);
            setRulesSaving(false);
          }}
          onClose={() => setRulesOpen(null)}
        />
      )}

      {range && rows.length > 0 && (
        <>
          {/* Desktop: Tabelle, links nach Saison und Monat gegliedert */}
          <div className="hidden md:block border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="text-left font-medium px-3 py-2 w-px" rowSpan={2}>
                    Saison
                  </th>
                  {showMonth && (
                    <th className="text-left font-medium px-3 py-2 w-px" rowSpan={2}>
                      Monat
                    </th>
                  )}
                  <th className="text-left font-medium px-3 py-2 w-px" rowSpan={2}>
                    {mode === 'months' ? 'Monat' : 'Zeitraum (Sa–Sa)'}
                  </th>
                  {slots.map((slot) => (
                    <th
                      key={slot.target}
                      colSpan={suggestions[slot.target] ? 2 : 1}
                      className="text-left font-semibold text-gray-700 px-3 pt-2 border-l border-gray-200"
                    >
                      {slot.name}
                    </th>
                  ))}
                </tr>
                <tr>
                  {slots.map((slot) => (
                    <Fragment key={slot.target}>
                      <th className="text-left font-normal px-3 pb-2 border-l border-gray-200">
                        Beds24
                      </th>
                      {suggestions[slot.target] && (
                        <th className="text-left font-normal px-3 pb-2">Vorschlag</th>
                      )}
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const span = spans[i] ?? { season: 0, month: 0 };
                  // Trennlinien: kräftig zwischen Saisons, deutlich zwischen Monaten
                  let rule = 'border-t border-gray-100';
                  if (span.season > 0) rule = 'border-t-2 border-gray-300';
                  else if (span.month > 0) rule = 'border-t border-gray-300';
                  return (
                    <tr key={row.key} className={rule}>
                      {span.season > 0 && (
                        <td
                          rowSpan={span.season}
                          className="align-top px-3 py-1.5 bg-gray-50 font-semibold text-gray-800 whitespace-nowrap border-r border-gray-200"
                        >
                          {row.season}
                        </td>
                      )}
                      {showMonth && span.month > 0 && (
                        <td
                          rowSpan={span.month}
                          className="align-top px-3 py-1.5 whitespace-nowrap border-r border-gray-200"
                        >
                          <span className="font-medium text-gray-800">{monthName(row.month)}</span>
                          <span className="ml-1 text-xs text-gray-400">
                            {row.month.slice(0, 4)}
                          </span>
                        </td>
                      )}
                      <td className="px-3 py-1.5">{periodCell(row)}</td>
                      {slots.map((slot) => {
                        const summary = summaryFor(slot, row);
                        const clickable = !!slot.response.data;
                        return (
                          <Fragment key={slot.target}>
                            <td
                              onClick={() => openEdit(slot, row)}
                              className={`px-3 py-1.5 border-l border-gray-100 ${
                                clickable ? 'cursor-pointer hover:bg-gray-50' : ''
                              }`}
                            >
                              <CurrentCell summary={summary} />
                            </td>
                            {suggestions[slot.target] && (
                              <td
                                onClick={() => openEdit(slot, row)}
                                className="px-3 py-1.5 cursor-pointer hover:bg-purple-50/50"
                              >
                                <SuggestionCell summary={summary} />
                              </td>
                            )}
                          </Fragment>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobil: je Saison und Monat ein Block, darin eine kompakte Liste */}
          <div className="md:hidden">
            {rows.map((row, i) => {
              const span = spans[i] ?? { season: 0, month: 0 };
              if (span.month === 0) return null;
              const block = rows.slice(i, i + span.month);
              return (
                <div key={row.key} className="mb-3">
                  {span.season > 0 && (
                    <p className="text-sm font-semibold text-gray-900 mt-5 mb-1.5">{row.season}</p>
                  )}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-baseline justify-between gap-2 bg-gray-50 px-3 py-1.5 text-xs">
                      <span className="font-medium text-gray-800">
                        {monthName(row.month)} {row.month.slice(0, 4)}
                      </span>
                      <span className="text-gray-400 truncate">
                        {slots.map((slot) => slot.name.split(' ')[0]).join(' · ')}
                      </span>
                    </div>
                    {block.map((r) => (
                      <div key={r.key} className="px-3 py-2 border-t border-gray-100">
                        <div className="text-xs">{periodCell(r)}</div>
                        <div className={`grid gap-2 mt-1 ${slots.length > 1 ? 'grid-cols-2' : ''}`}>
                          {slots.map((slot) => {
                            const summary = summaryFor(slot, r);
                            return (
                              <button
                                key={slot.target}
                                onClick={() => openEdit(slot, r)}
                                className="min-w-0 text-left text-sm rounded px-1 -mx-1 active:bg-gray-100"
                              >
                                <CurrentCell summary={summary} />
                                {suggestions[slot.target] && summary.diffNights > 0 && (
                                  <span className="block text-xs">
                                    <SuggestionCell summary={summary} />
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            {LEVEL_NAMES.map((name, i) => (
              <span key={name} className="flex items-center gap-1.5">
                {levelDot(i)}
                Nachfrage {name}
              </span>
            ))}
            <span>„N.“ = Nächte · Vorschläge gelten nur für freie Nächte</span>
          </div>
        </>
      )}

      {editing && editingData && (
        <EditPeriodDialog
          key={`${editing.target}-${editing.row.key}`}
          row={editing.row}
          hut={editingData}
          suggestions={suggestions[editing.target] ?? null}
          busy={busy === editing.target}
          error={dialogError}
          message={dialogMessage}
          onApplySuggestions={applyRowSuggestions}
          onApplyManual={applyRowManual}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmAll && confirmSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-5 space-y-3">
            <p className="text-base font-semibold text-gray-900">
              Alle Vorschläge für die {confirmSlot.name} übernehmen?
            </p>
            <p className="text-sm text-gray-600">
              {confirmTargets.length} freie Nächte
              {confirmFirst &&
                confirmLast &&
                ` zwischen ${formatRange(confirmFirst.night, confirmLast.night)}`}{' '}
              bekommen bei Beds24 Preis und Mindestaufenthalt aus den Preisregeln. Belegte und
              gesperrte Nächte bleiben unverändert. Vorher wird alles gesichert.
            </p>
            {confirmDrops > 0 && (
              <p className="text-xs text-red-700">
                Achtung: {confirmDrops} Nächte würden mehr als 30 % günstiger als bisher.
              </p>
            )}
            {isDirty(confirmAll) && (
              <p className="text-xs text-amber-700">
                Die geänderten Preisregeln werden dabei gespeichert.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmAll(null)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={() => applyAll(confirmAll)}
                disabled={confirmTargets.length === 0}
                className="px-3 py-1.5 text-sm rounded-lg bg-purple-700 text-white hover:bg-purple-800 disabled:opacity-50"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
