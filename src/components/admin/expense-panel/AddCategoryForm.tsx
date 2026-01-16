'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface AddCategoryFormProps {
  onAdd: (name: string) => Promise<void>;
}

export function AddCategoryForm({ onAdd }: AddCategoryFormProps) {
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const handleAdd = async () => {
    if (!categoryName.trim()) return;
    await onAdd(categoryName.trim());
    setCategoryName('');
    setShowForm(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setCategoryName('');
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
      >
        <Plus className="w-5 h-5" />
        Neue Ausgabenkategorie hinzufügen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="text"
        value={categoryName}
        onChange={(e) => setCategoryName(e.target.value)}
        placeholder="Name der neuen Kategorie..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        autoFocus
      />
      <button
        onClick={handleAdd}
        disabled={!categoryName.trim()}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        Hinzufügen
      </button>
      <button onClick={handleCancel} className="p-2 text-gray-500 hover:text-gray-700">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
