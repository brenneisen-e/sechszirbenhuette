'use client';

import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { FlagIcon } from './FlagIcon';
import { PLATFORMS, COUNTRIES, STATUS_OPTIONS } from './constants';
import type { Guest } from './types';

interface GuestEditModalProps {
  guest: Guest;
  onClose: () => void;
  onSave: (guest: Guest) => Promise<boolean>;
}

export function GuestEditModal({ guest, onClose, onSave }: GuestEditModalProps) {
  const [editingGuest, setEditingGuest] = useState<Guest>({ ...guest });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(editingGuest);
    setIsSaving(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">Gast bearbeiten</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={editingGuest.guest_name}
                onChange={(e) => setEditingGuest({ ...editingGuest, guest_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Nationality */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationalität</label>
              <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg min-h-[42px]">
                {(editingGuest.nationality || '').split(',').filter(Boolean).map(code => {
                  const country = COUNTRIES.find(c => c.code === code.trim());
                  return country ? (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-sm cursor-pointer hover:bg-red-100"
                      onClick={() => {
                        const codes = (editingGuest.nationality || '').split(',').filter(c => c.trim() !== code.trim());
                        setEditingGuest({ ...editingGuest, nationality: codes.join(',') });
                      }}
                      title="Klicken zum Entfernen"
                    >
                      <FlagIcon code={code.trim()} size="small" /> {country.name} ×
                    </span>
                  ) : null;
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      const current = (editingGuest.nationality || '').split(',').filter(Boolean);
                      if (!current.includes(e.target.value)) {
                        setEditingGuest({
                          ...editingGuest,
                          nationality: [...current, e.target.value].join(',')
                        });
                      }
                    }
                  }}
                  className="flex-1 min-w-[120px] px-1 py-0.5 border-0 text-sm focus:ring-0 bg-transparent"
                >
                  <option value="">+ Land hinzufügen</option>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                type="email"
                value={editingGuest.email || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="text"
                value={editingGuest.phone || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Platform - Multiple Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plattform(en)</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => {
                  const currentPlatforms = (editingGuest.platform || '').split(',').map(s => s.trim()).filter(Boolean);
                  const isSelected = currentPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        let newPlatforms: string[];
                        if (isSelected) {
                          newPlatforms = currentPlatforms.filter(cp => cp !== p);
                        } else {
                          newPlatforms = [...currentPlatforms, p];
                        }
                        setEditingGuest({ ...editingGuest, platform: newPlatforms.join(', ') });
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isSelected
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={editingGuest.address || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. Musterstr. 123, 12345 Musterstadt"
              />
            </div>

            {/* Arrival Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anreise</label>
              <input
                type="date"
                value={editingGuest.arrival_date || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, arrival_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Departure Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Abreise</label>
              <input
                type="date"
                value={editingGuest.departure_date || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, departure_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Adults */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Erwachsene</label>
              <input
                type="number"
                value={editingGuest.adults}
                onChange={(e) => setEditingGuest({ ...editingGuest, adults: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Children */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kinder</label>
              <input
                type="number"
                value={editingGuest.children}
                onChange={(e) => setEditingGuest({ ...editingGuest, children: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Children Ages */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alter der Kinder</label>
              <input
                type="text"
                value={editingGuest.children_ages || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, children_ages: e.target.value })}
                placeholder="z.B. 5, 8, 12"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Pets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Haustiere</label>
              <input
                type="text"
                value={editingGuest.pets || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, pets: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Rental Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mietpreis</label>
              <input
                type="number"
                step="0.01"
                value={editingGuest.rental_price}
                onChange={(e) => setEditingGuest({ ...editingGuest, rental_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Deposit Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anzahlung</label>
              <input
                type="number"
                step="0.01"
                value={editingGuest.deposit_amount}
                onChange={(e) => setEditingGuest({ ...editingGuest, deposit_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editingGuest.status}
                onChange={(e) => setEditingGuest({ ...editingGuest, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                value={editingGuest.other_notes || ''}
                onChange={(e) => setEditingGuest({ ...editingGuest, other_notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingGuest.is_returning_guest === 1}
                onChange={(e) => setEditingGuest({ ...editingGuest, is_returning_guest: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Stammgast</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingGuest.is_private === 1}
                onChange={(e) => setEditingGuest({ ...editingGuest, is_private: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Privat</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingGuest.no_nebenkosten === 1}
                onChange={(e) => setEditingGuest({ ...editingGuest, no_nebenkosten: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Keine NK berechnen</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
