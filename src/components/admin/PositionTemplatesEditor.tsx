'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, X, Plus, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';

interface PositionTemplate {
  id: number;
  name: string;
  category: string;
  type: string;
  default_amount: number;
  default_paid_by: string;
  affects_mieterlos: number;
  affects_gewinn: number;
  show_separate: number;
  auto_calculate: number;
  calc_rule: string | null;
  applies_to_platforms: string | null;
  is_default: number;
  sort_order: number;
}

interface PositionCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface PositionTemplatesEditorProps {
  adminPassword: string;
}

const PAID_BY_OPTIONS: { value: string; label: string }[] = [
  { value: 'guest_platform', label: 'Gast über Plattform (in Payout)' },
  { value: 'guest_cash', label: 'Gast bar vor Ort' },
  { value: 'guest_direct', label: 'Gast direkt überwiesen' },
  { value: 'owner', label: 'Vermieter (eigene Kosten)' },
  { value: 'included_payout', label: 'In Plattform-Auszahlung enthalten' },
];

const CATEGORY_LABELS: Record<string, string> = {
  nk: 'Nebenkosten',
  reinigung: 'Reinigung',
  kurtaxe: 'Kurtaxe',
  komfortpaket: 'Komfortpaket',
  gebuehr: 'Gebühren',
  buchungskosten: 'Buchungskosten',
  extras: 'Extras',
  custom: 'Sonstige',
};

export default function PositionTemplatesEditor({ adminPassword }: PositionTemplatesEditorProps) {
  const [templates, setTemplates] = useState<PositionTemplate[]>([]);
  const [categories, setCategories] = useState<PositionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [editForm, setEditForm] = useState({
    name: '',
    category: 'custom',
    type: 'expense',
    default_amount: '0',
    default_paid_by: 'guest_platform',
    affects_mieterlos: false,
    affects_gewinn: true,
    show_separate: false,
    auto_calculate: false,
    calc_rule: '',
    applies_to_platforms: '',
    is_default: false,
    sort_order: '0',
  });

  const fetchData = useCallback(async () => {
    try {
      const [templatesRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/position-templates', { headers: { 'x-admin-password': adminPassword } }),
        fetch('/api/admin/position-categories', { headers: { 'x-admin-password': adminPassword } }),
      ]);
      const templatesData = await templatesRes.json() as { templates?: PositionTemplate[]; tableExists?: boolean };
      const categoriesData = await categoriesRes.json() as { categories?: PositionCategory[] };
      setTemplates(templatesData.templates || []);
      setCategories(categoriesData.categories || []);
      setTableExists(templatesData.tableExists !== false);

      // Expand all groups by default
      const groupKeys = new Set((templatesData.templates || []).map(t => t.category));
      setExpandedGroups(groupKeys);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [adminPassword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getCategoryLabel = (slug: string): string => {
    const cat = categories.find(c => c.slug === slug);
    if (cat) return cat.name;
    return CATEGORY_LABELS[slug] || slug;
  };

  const startEdit = (template: PositionTemplate) => {
    setEditingId(template.id);
    setEditForm({
      name: template.name,
      category: template.category,
      type: template.type,
      default_amount: template.default_amount.toFixed(2),
      default_paid_by: template.default_paid_by,
      affects_mieterlos: template.affects_mieterlos === 1,
      affects_gewinn: template.affects_gewinn === 1,
      show_separate: template.show_separate === 1,
      auto_calculate: template.auto_calculate === 1,
      calc_rule: template.calc_rule || '',
      applies_to_platforms: template.applies_to_platforms || '',
      is_default: template.is_default === 1,
      sort_order: String(template.sort_order),
    });
    setShowAdd(false);
  };

  const startAdd = () => {
    setShowAdd(true);
    setEditingId(null);
    setEditForm({
      name: '',
      category: 'custom',
      type: 'expense',
      default_amount: '0',
      default_paid_by: 'guest_platform',
      affects_mieterlos: false,
      affects_gewinn: true,
      show_separate: false,
      auto_calculate: false,
      calc_rule: '',
      applies_to_platforms: '',
      is_default: false,
      sort_order: '0',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
  };

  const saveTemplate = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        id: editingId || undefined,
        name: editForm.name,
        category: editForm.category,
        type: editForm.type,
        default_amount: parseFloat(editForm.default_amount) || 0,
        default_paid_by: editForm.default_paid_by,
        affects_mieterlos: editForm.affects_mieterlos ? 1 : 0,
        affects_gewinn: editForm.affects_gewinn ? 1 : 0,
        show_separate: editForm.show_separate ? 1 : 0,
        auto_calculate: editForm.auto_calculate ? 1 : 0,
        calc_rule: editForm.calc_rule || null,
        applies_to_platforms: editForm.applies_to_platforms || null,
        is_default: editForm.is_default ? 1 : 0,
        sort_order: parseInt(editForm.sort_order) || 0,
      };

      const method = editingId ? 'PUT' : 'POST';
      await fetch('/api/admin/position-templates', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify(body),
      });

      cancelEdit();
      await fetchData();
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm('Vorlage wirklich löschen?')) return;
    try {
      await fetch(`/api/admin/position-templates?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': adminPassword },
      });
      await fetchData();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Lade Vorlagen...</span>
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Vorlagen-Tabelle nicht vorhanden</p>
            <p className="text-xs text-amber-600 mt-1">Bitte führen Sie die Datenbank-Migration im System-Tab aus.</p>
          </div>
        </div>
      </div>
    );
  }

  // Group templates by category
  const grouped = new Map<string, PositionTemplate[]>();
  for (const t of templates) {
    const key = t.category || 'custom';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }

  // Get all unique category options for the edit form
  const categoryOptions = Array.from(new Set([
    ...templates.map(t => t.category),
    ...categories.map(c => c.slug),
    'custom',
  ]));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
        Position-Vorlagen
      </h3>
      <p className="text-xs text-gray-500">
        Vorlagen werden beim Anlegen einer Buchung automatisch als Positionen erstellt. Templates mit &quot;Standard&quot; erscheinen als Schnellaktionen.
      </p>

      {/* Grouped template list */}
      <div className="space-y-3">
        {Array.from(grouped.entries()).map(([catKey, catTemplates]) => (
          <div key={catKey} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleGroup(catKey)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {getCategoryLabel(catKey)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{catTemplates.length}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedGroups.has(catKey) ? '' : '-rotate-90'}`} />
              </div>
            </button>

            {expandedGroups.has(catKey) && (
              <div className="divide-y divide-gray-50">
                {catTemplates.map((template) => (
                  <div key={template.id}>
                    {editingId === template.id ? (
                      <TemplateEditForm
                        form={editForm}
                        setForm={setEditForm}
                        onSave={saveTemplate}
                        onCancel={cancelEdit}
                        saving={saving}
                        categoryOptions={categoryOptions}
                        getCategoryLabel={getCategoryLabel}
                      />
                    ) : (
                      <div className="admin-row flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                        <span className="text-sm text-gray-900 flex-1 min-w-0 truncate">{template.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${template.type === 'expense' ? 'text-gray-500 bg-gray-100' : 'text-green-700 bg-green-50'}`}>
                          {template.type === 'expense' ? 'Ausgabe' : 'Einnahme'}
                        </span>
                        {template.auto_calculate === 1 && (
                          <span className="text-xs text-gray-400 bg-gray-100 rounded px-1 py-0.5">auto</span>
                        )}
                        {template.is_default === 1 && (
                          <span className="text-xs text-green-600 bg-green-50 rounded px-1 py-0.5">Standard</span>
                        )}
                        {template.show_separate === 1 && (
                          <span className="text-xs text-blue-600 bg-blue-50 rounded px-1 py-0.5">separat</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {PAID_BY_OPTIONS.find(o => o.value === template.default_paid_by)?.label.split(' ')[0] || template.default_paid_by}
                        </span>
                        <div className="admin-row-actions flex items-center gap-1">
                          <button onClick={() => startEdit(template)} className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteTemplate(template.id)} className="text-gray-400 hover:text-red-500 rounded p-1 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add form (when active) */}
      {showAdd && (
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-green-50 text-xs font-medium text-green-700 uppercase tracking-wide">
            Neue Vorlage
          </div>
          <TemplateEditForm
            form={editForm}
            setForm={setEditForm}
            onSave={saveTemplate}
            onCancel={cancelEdit}
            saving={saving}
            categoryOptions={categoryOptions}
            getCategoryLabel={getCategoryLabel}
          />
        </div>
      )}

      {/* Add button */}
      {!showAdd && (
        <button onClick={startAdd} className="admin-add-button w-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Neue Vorlage hinzufügen</span>
        </button>
      )}
    </div>
  );
}

function TemplateEditForm({ form, setForm, onSave, onCancel, saving, categoryOptions, getCategoryLabel }: {
  form: {
    name: string;
    category: string;
    type: string;
    default_amount: string;
    default_paid_by: string;
    affects_mieterlos: boolean;
    affects_gewinn: boolean;
    show_separate: boolean;
    auto_calculate: boolean;
    calc_rule: string;
    applies_to_platforms: string;
    is_default: boolean;
    sort_order: string;
  };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  categoryOptions: string[];
  getCategoryLabel: (slug: string) => string;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="bg-gray-50 p-4 space-y-4">
      {/* Name + Category row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="z.B. Parkplatz"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Kategorie</label>
          <select
            value={form.category}
            onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          >
            {categoryOptions.map(opt => (
              <option key={opt} value={opt}>{getCategoryLabel(opt)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type + Amount + PaidBy row */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Typ</label>
          <select
            value={form.type}
            onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          >
            <option value="expense">Ausgabe</option>
            <option value="income">Einnahme</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Standard-Betrag</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              value={form.default_amount}
              onChange={(e) => setForm(prev => ({ ...prev, default_amount: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full font-mono text-right focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
            <span className="text-xs text-gray-400">EUR</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Bezahlt von</label>
          <select
            value={form.default_paid_by}
            onChange={(e) => setForm(prev => ({ ...prev, default_paid_by: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
          >
            {PAID_BY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.auto_calculate}
            onChange={(e) => setForm(prev => ({ ...prev, auto_calculate: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-xs text-gray-600">Auto berechnen</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_default}
            onChange={(e) => setForm(prev => ({ ...prev, is_default: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-xs text-gray-600">Standard (Schnellaktion)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.show_separate}
            onChange={(e) => setForm(prev => ({ ...prev, show_separate: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-xs text-gray-600">Separat in Finanzübersicht</span>
        </label>
      </div>

      {/* Advanced toggle */}
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
              checked={form.affects_mieterlos}
              onChange={(e) => setForm(prev => ({ ...prev, affects_mieterlos: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-xs text-gray-600">Wirkt sich auf Mieterlös aus</span>
          </label>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Berechnungsregel (JSON)</label>
            <input
              type="text"
              value={form.calc_rule}
              onChange={(e) => setForm(prev => ({ ...prev, calc_rule: e.target.value }))}
              placeholder='{"type":"fixed","params":{"amount":50}}'
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 block mb-1">Plattformen (JSON-Array oder leer = alle)</label>
            <input
              type="text"
              value={form.applies_to_platforms}
              onChange={(e) => setForm(prev => ({ ...prev, applies_to_platforms: e.target.value }))}
              placeholder='["booking.com","fewo"]'
              className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:bg-gray-100 rounded-lg px-3 py-1.5 transition-colors">
          Abbrechen
        </button>
        <button onClick={onSave} disabled={saving} className="text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg px-4 py-1.5 transition-colors font-medium flex items-center gap-2">
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Speichern
        </button>
      </div>
    </div>
  );
}
