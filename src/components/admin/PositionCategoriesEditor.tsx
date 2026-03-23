'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, X, Plus, Loader2, AlertTriangle } from 'lucide-react';

interface PositionCategory {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
}

interface PositionCategoriesEditorProps {
}

export default function PositionCategoriesEditor({}: PositionCategoriesEditorProps) {
  const [categories, setCategories] = useState<PositionCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    icon: '',
    color: '',
    sort_order: '0',
  });

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/position-categories');
      const data = await res.json() as { categories?: PositionCategory[]; tableExists?: boolean };
      setCategories(data.categories || []);
      setTableExists(data.tableExists !== false);
    } catch (err) {
      console.error('Failed to fetch position categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const startEdit = (cat: PositionCategory) => {
    setEditingId(cat.id);
    setEditForm({
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon || '',
      color: cat.color || '',
      sort_order: String(cat.sort_order),
    });
    setShowAdd(false);
  };

  const startAdd = () => {
    setShowAdd(true);
    setEditingId(null);
    setEditForm({ name: '', slug: '', icon: '', color: '', sort_order: '0' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAdd(false);
  };

  const saveCategory = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        id: editingId || undefined,
        name: editForm.name,
        slug: editForm.slug || undefined,
        icon: editForm.icon || null,
        color: editForm.color || null,
        sort_order: parseInt(editForm.sort_order) || 0,
      };

      const method = editingId ? 'PUT' : 'POST';
      await fetch('/api/admin/position-categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      cancelEdit();
      await fetchCategories();
    } catch (err) {
      console.error('Failed to save position category:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm('Kategorie wirklich löschen?')) return;
    try {
      await fetch(`/api/admin/position-categories?id=${id}`, {
        method: 'DELETE',
        });
      await fetchCategories();
    } catch (err) {
      console.error('Failed to delete position category:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="text-sm text-gray-500">Lade Kategorien...</span>
      </div>
    );
  }

  if (!tableExists) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Kategorien-Tabelle nicht vorhanden</p>
            <p className="text-xs text-amber-600 mt-1">Bitte führen Sie die Datenbank-Migration im System-Tab aus.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
        Position-Kategorien
      </h3>
      <p className="text-xs text-gray-500">
        Kategorien gruppieren Positionen in Dropdowns, Finanzübersichten und dem Buchungs-Editor.
      </p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Slug</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Icon</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-3">Sortierung</th>
              <th className="w-20 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {categories.map((cat) => (
              <tr key={cat.id} className="admin-row hover:bg-gray-50 transition-colors">
                {editingId === cat.id ? (
                  <EditRow form={editForm} setForm={setEditForm} onSave={saveCategory} onCancel={cancelEdit} saving={saving} />
                ) : (
                  <>
                    <td className="px-4 py-3 text-sm text-gray-900">{cat.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{cat.slug}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{cat.icon || <span className="text-gray-300">–</span>}</td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500 text-right tabular-nums">{cat.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end admin-row-actions">
                        <button onClick={() => startEdit(cat)} className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteCategory(cat.id)} className="text-gray-400 hover:text-red-500 rounded p-1 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {showAdd && (
              <tr className="bg-gray-50">
                <EditRow form={editForm} setForm={setEditForm} onSave={saveCategory} onCancel={cancelEdit} saving={saving} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!showAdd && (
        <button onClick={startAdd} className="admin-add-button w-full flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="text-sm">Neue Kategorie hinzufügen</span>
        </button>
      )}
    </div>
  );
}

function EditRow({ form, setForm, onSave, onCancel, saving }: {
  form: { name: string; slug: string; icon: string; color: string; sort_order: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <>
      <td className="px-4 py-2">
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Kategoriename"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={form.slug}
          onChange={(e) => setForm(prev => ({ ...prev, slug: e.target.value }))}
          placeholder="auto"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="text"
          value={form.icon}
          onChange={(e) => setForm(prev => ({ ...prev, icon: e.target.value }))}
          placeholder="z.B. zap"
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-full focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          value={form.sort_order}
          onChange={(e) => setForm(prev => ({ ...prev, sort_order: e.target.value }))}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-16 text-right font-mono focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={onSave} disabled={saving} className="text-green-600 hover:bg-green-50 rounded p-1 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-xs font-medium">OK</span>}
          </button>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 rounded p-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </>
  );
}
