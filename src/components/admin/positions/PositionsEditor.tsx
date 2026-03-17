'use client';

import { useState, useMemo } from 'react';
import { Plus, MoreVertical, ChevronDown, Info, Zap, Droplets, Trash2, TreePine, FileText, Sparkles, Package, CreditCard, X } from 'lucide-react';
import type { BookingPosition, ResolvedPosition, PositionCategory, PaidBy } from '@/lib/types/positions';
import { PAID_BY_LABELS } from '@/lib/types/positions';
import { formatCurrency } from '@/lib/utils/formatting';
import type { PositionCalcContext } from '@/lib/utils/positionCalculator';
import { resolvePositions, summarizePositions } from '@/lib/utils/positionCalculator';

// Category icons using Lucide
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  nk: Zap,
  reinigung: Sparkles,
  kurtaxe: FileText,
  komfortpaket: Package,
  gebuehr: CreditCard,
  custom: Plus,
};

// Sub-icons for NK types
const NK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'NK Strom': Zap,
  'NK Wasser': Droplets,
  'NK Müll': Trash2,
  'NK Holz': TreePine,
};

interface FinanceSummaryOverride {
  gesamteinzahlung: number;
  gesamtbelastung: number;
  mieterlos: number;
  provision: number;
  gesamtertrag: number;
}

interface PositionsEditorProps {
  positions: BookingPosition[];
  onChange: (positions: BookingPosition[]) => void;
  calcContext: PositionCalcContext;
  payoutAmount?: number;
  rentalPrice?: number;
  financeSummary?: FinanceSummaryOverride;
}

interface TemplateGroup {
  label: string;
  templates: Array<{
    name: string;
    category: PositionCategory;
    type: 'income' | 'expense';
    paid_by: PaidBy;
    auto_calculate: boolean;
    calc_rule: string | null;
    affects_mieterlos: boolean;
    show_separate: boolean;
  }>;
}

const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    label: 'Nebenkosten',
    templates: [
      { name: 'NK Strom', category: 'nk', type: 'expense', paid_by: 'guest_platform', auto_calculate: true, calc_rule: '{"type":"nk_strom","params":{}}', affects_mieterlos: false, show_separate: false },
      { name: 'NK Wasser', category: 'nk', type: 'expense', paid_by: 'guest_platform', auto_calculate: true, calc_rule: '{"type":"nk_wasser","params":{}}', affects_mieterlos: false, show_separate: false },
      { name: 'NK Müll', category: 'nk', type: 'expense', paid_by: 'guest_platform', auto_calculate: true, calc_rule: '{"type":"nk_muell","params":{}}', affects_mieterlos: false, show_separate: false },
      { name: 'NK Holz', category: 'nk', type: 'expense', paid_by: 'guest_platform', auto_calculate: true, calc_rule: '{"type":"nk_holz","params":{}}', affects_mieterlos: false, show_separate: false },
    ],
  },
  {
    label: 'Buchungskosten',
    templates: [
      { name: 'Kurtaxe', category: 'kurtaxe', type: 'expense', paid_by: 'guest_platform', auto_calculate: true, calc_rule: '{"type":"kurtaxe","params":{"minAge":16}}', affects_mieterlos: false, show_separate: true },
      { name: 'Reinigung', category: 'reinigung', type: 'expense', paid_by: 'guest_platform', auto_calculate: true, calc_rule: '{"type":"reinigung","params":{"base":100,"dogSurcharge":25}}', affects_mieterlos: false, show_separate: true },
      { name: 'Komfortpaket', category: 'komfortpaket', type: 'income', paid_by: 'guest_cash', auto_calculate: false, calc_rule: null, affects_mieterlos: false, show_separate: true },
    ],
  },
  {
    label: 'Gebühren',
    templates: [
      { name: 'Service Fee', category: 'gebuehr', type: 'expense', paid_by: 'guest_platform', auto_calculate: false, calc_rule: null, affects_mieterlos: false, show_separate: false },
      { name: 'Zahlungsgebühr', category: 'gebuehr', type: 'expense', paid_by: 'guest_platform', auto_calculate: false, calc_rule: null, affects_mieterlos: true, show_separate: false },
    ],
  },
];

export default function PositionsEditor({ positions, onChange, calcContext, payoutAmount, rentalPrice, financeSummary }: PositionsEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);

  // Resolve all positions
  const resolved = useMemo(() => resolvePositions(positions, calcContext), [positions, calcContext]);
  const summary = useMemo(() => summarizePositions(resolved), [resolved]);

  // Calculate financial summary
  const payout = payoutAmount || 0;
  const totalExpenses = summary.totalExpenses;
  const berechneteMiete = payout - totalExpenses;
  const mieterlos = berechneteMiete - summary.mieterlosAffectingExpenses;
  const isPrivate = calcContext.isPrivate;
  const provision = isPrivate ? 0 : mieterlos * 0.1;
  const gewinn = payout + summary.totalIncome - totalExpenses - provision;

  const addFromTemplate = (template: typeof TEMPLATE_GROUPS[0]['templates'][0]) => {
    const newPos: BookingPosition = {
      booking_id: 0,
      name: template.name,
      category: template.category,
      type: template.type,
      amount: 0,
      paid_by: template.paid_by,
      paid: false,
      affects_mieterlos: template.affects_mieterlos,
      affects_gewinn: true,
      show_separate: template.show_separate,
      auto_calculate: template.auto_calculate,
      calc_rule: template.calc_rule ? JSON.parse(template.calc_rule) : null,
      sort_order: positions.length,
      notes: null,
    };

    onChange([...positions, newPos]);
    setShowDropdown(false);
    setShowTemplates(false);
    setEditingIndex(positions.length);
  };

  const addCustom = () => {
    const newPos: BookingPosition = {
      booking_id: 0,
      name: '',
      category: 'custom',
      type: 'expense',
      amount: 0,
      paid_by: 'guest_platform',
      paid: false,
      affects_mieterlos: false,
      affects_gewinn: true,
      show_separate: false,
      auto_calculate: false,
      calc_rule: null,
      sort_order: positions.length,
      notes: null,
    };

    onChange([...positions, newPos]);
    setShowDropdown(false);
    setEditingIndex(positions.length);
  };

  const updatePosition = (index: number, updates: Partial<BookingPosition>) => {
    const updated = positions.map((p, i) => i === index ? { ...p, ...updates } : p);
    onChange(updated);
  };

  const deletePosition = (index: number) => {
    onChange(positions.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    setMenuIndex(null);
  };

  const getIcon = (pos: BookingPosition): React.ComponentType<{ className?: string }> => {
    return NK_ICONS[pos.name] || CATEGORY_ICONS[pos.category] || Plus;
  };

  return (
    <div className="space-y-4">
      {/* Payout/Rental Price Input */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {calcContext.platform?.toLowerCase() === 'booking.com' ? 'Plattform-Auszahlung' : 'Mietpreis'}
        </label>
        <div className="mt-1 text-2xl font-semibold font-mono text-gray-900 tabular-nums">
          {formatCurrency(payout || rentalPrice || 0)}
        </div>
        {calcContext.platform && (
          <p className="text-xs text-gray-400 mt-0.5">{calcContext.platform}</p>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* Positions Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Positionen</h4>
      </div>

      {/* Position List */}
      {positions.length > 0 && (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-50">
          {positions.map((pos, index) => {
            const resolvedPos = resolved[index];
            const Icon = getIcon(pos);
            const isEditing = editingIndex === index;

            return (
              <div key={index}>
                {/* Position row */}
                <div
                  className="admin-row flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setEditingIndex(isEditing ? null : index)}
                >
                  <Icon className="w-4 h-4 text-gray-300 shrink-0" />
                  <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{pos.name || 'Neue Position'}</span>
                  <span className="text-sm font-mono text-gray-900 tabular-nums shrink-0">
                    {formatCurrency(resolvedPos?.resolvedAmount || pos.amount || 0)}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${pos.type === 'expense' ? 'text-gray-500' : 'text-green-700 bg-green-50'}`}>
                    {pos.type === 'expense' ? 'Ausgabe' : 'Einnahme'}
                  </span>
                  <span className="text-xs text-gray-400">{PAID_BY_LABELS[pos.paid_by]}</span>
                  {pos.auto_calculate && (
                    <span className="text-xs text-gray-400 bg-gray-100 rounded px-1 py-0.5">auto</span>
                  )}
                  <div className="admin-row-actions relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuIndex(menuIndex === index ? null : index); }}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuIndex === index && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingIndex(index); setMenuIndex(null); }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deletePosition(index); }}
                          className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Editor */}
                {isEditing && (
                  <InlineEditor
                    position={pos}
                    resolvedPosition={resolvedPos}
                    onChange={(updates) => updatePosition(index, updates)}
                    onDelete={() => deletePosition(index)}
                    onClose={() => setEditingIndex(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Position Button */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="admin-add-button w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Position hinzufügen</span>
        </button>

        {showDropdown && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            {!showTemplates ? (
              <>
                <button
                  onClick={() => setShowTemplates(true)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between border-b border-gray-100"
                >
                  <span>Aus Vorlage wählen</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                </button>
                <button
                  onClick={addCustom}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Eigene Position erstellen
                </button>
              </>
            ) : (
              <div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="w-full text-left px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 border-b border-gray-100"
                >
                  ← Zurück
                </button>
                {TEMPLATE_GROUPS.map((group) => (
                  <div key={group.label}>
                    <div className="px-4 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide bg-gray-50">
                      {group.label}
                    </div>
                    {group.templates.map((template) => {
                      const exists = positions.some(p => p.name === template.name);
                      return (
                        <button
                          key={template.name}
                          onClick={() => !exists && addFromTemplate(template)}
                          disabled={exists}
                          className={`w-full text-left px-4 py-2 text-sm ${
                            exists ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {template.name} {exists && '(bereits vorhanden)'}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click-away handler for dropdown */}
      {(showDropdown || menuIndex !== null) && (
        <div className="fixed inset-0 z-[5]" onClick={() => { setShowDropdown(false); setShowTemplates(false); setMenuIndex(null); }} />
      )}

      {/* Summary */}
      <div className="border-t border-gray-100 pt-4 space-y-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Zusammenfassung</h4>
        <div className="space-y-1.5">
          <SummaryRow label="Gesamteinzahlung" amount={financeSummary?.gesamteinzahlung ?? (payout + summary.barTotal + summary.directTotal + summary.totalIncome)} />
          <SummaryRow label="Kalkulierte Kosten" amount={-(financeSummary?.gesamtbelastung ?? totalExpenses)} muted />
          <SummaryRow label="Mieterlös" amount={financeSummary?.mieterlos ?? mieterlos} />
          <SummaryRow label={`Provision (10%)`} amount={-(financeSummary?.provision ?? provision)} muted />
          <div className="border-t border-gray-200 pt-2">
            <SummaryRow label="Ertrag" amount={financeSummary?.gesamtertrag ?? gewinn} bold />
          </div>
        </div>

        {/* Bar items */}
        {summary.barItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Barzahlungen</p>
            {summary.barItems.map((item, i) => (
              <SummaryRow key={i} label={item.name} amount={item.amount} muted />
            ))}
            <SummaryRow label="Gesamt bar" amount={summary.barTotal} />
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, amount, bold, highlight, muted }: {
  label: string;
  amount: number;
  bold?: boolean;
  highlight?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${muted ? 'text-gray-400' : bold ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-mono tabular-nums ${
        highlight ? 'text-gray-900 font-medium' :
        bold ? 'text-gray-900 font-semibold' :
        muted ? 'text-gray-400' : 'text-gray-900'
      }`}>
        {amount < 0 ? '−' : ''}{formatCurrency(Math.abs(amount))}
      </span>
    </div>
  );
}

function InlineEditor({ position, resolvedPosition, onChange, onDelete, onClose }: {
  position: BookingPosition;
  resolvedPosition?: ResolvedPosition;
  onChange: (updates: Partial<BookingPosition>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">
      {/* Name */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
        <input
          type="text"
          value={position.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          placeholder="Positionsname"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Betrag</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              value={position.auto_calculate ? Math.round((resolvedPosition?.resolvedAmount || 0) * 100) / 100 : position.amount}
              onChange={(e) => onChange({ amount: parseFloat(e.target.value) || 0 })}
              disabled={position.auto_calculate}
              className={`border border-gray-200 rounded-lg px-3 py-2 text-sm w-full font-mono text-right focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none ${
                position.auto_calculate ? 'bg-gray-100 text-gray-500' : ''
              }`}
            />
            <span className="text-xs text-gray-400">EUR</span>
          </div>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={position.auto_calculate}
              onChange={(e) => onChange({ auto_calculate: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs text-gray-500">Auto berechnen</span>
            {position.auto_calculate && resolvedPosition?.calcDescription && (
              <div className="group relative">
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-20">
                  {resolvedPosition.calcDescription}
                </div>
              </div>
            )}
          </label>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Typ</label>
          <div className="flex items-center gap-4 mt-2">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={position.type === 'expense'}
                onChange={() => onChange({ type: 'expense' })}
                className="text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Ausgabe</span>
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={position.type === 'income'}
                onChange={() => onChange({ type: 'income' })}
                className="text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Einnahme</span>
            </label>
          </div>
        </div>
      </div>

      {/* Paid By */}
      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Bezahlt von</label>
        <select
          value={position.paid_by}
          onChange={(e) => onChange({ paid_by: e.target.value as PaidBy })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        >
          <option value="guest_platform">Gast über Plattform (in Payout)</option>
          <option value="guest_cash">Gast bar vor Ort</option>
          <option value="guest_direct">Gast direkt überwiesen</option>
          <option value="owner">Vermieter (eigene Kosten)</option>
          <option value="included_payout">In Plattform-Auszahlung enthalten</option>
        </select>
      </div>

      {/* Advanced */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
        Erweitert
      </button>

      {showAdvanced && (
        <div className="space-y-3 pl-1">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={position.affects_mieterlos}
              onChange={(e) => onChange({ affects_mieterlos: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs text-gray-600">Wirkt sich auf Mieterlös aus (beeinflusst Provision)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={position.show_separate}
              onChange={(e) => onChange({ show_separate: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs text-gray-600">Separat in Finanzübersicht ausweisen</span>
          </label>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Notiz (optional)</label>
            <textarea
              value={position.notes || ''}
              onChange={(e) => onChange({ notes: e.target.value || null })}
              rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={onDelete} className="text-sm text-red-500 hover:bg-red-50 rounded-lg px-3 py-1.5 transition-colors">
          Löschen
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-sm text-gray-500 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors">
            Abbrechen
          </button>
          <button onClick={onClose} className="text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-1.5 transition-colors font-medium">
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
