'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Plus, Upload, Loader2, Camera, FileText, ListTodo
} from 'lucide-react';
import type { Guest, ScreenshotAnalysisResponse } from './types';
import { COUNTRIES, STANDARD_TASKS, DEFAULT_NEW_GUEST } from './constants';
import { FlagIcon } from './FlagIcon';

interface CreateGuestModalProps {
  isOpen: boolean;
  guests: Guest[];
  isSaving: boolean;
  onClose: () => void;
  onCreateGuest: (
    newGuest: Partial<Guest>,
    bookingMode: 'new' | 'existing',
    selectedExistingGuestId: number | null,
    createStandardTasks: boolean,
    importFile: File | null,
    extractedNetRent: number | null,
    isPlatformPayment: boolean
  ) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function CreateGuestModal({
  isOpen,
  guests,
  isSaving,
  onClose,
  onCreateGuest,
  onSuccess,
  onError,
}: CreateGuestModalProps) {
  const [newGuest, setNewGuest] = useState<Partial<Guest>>(DEFAULT_NEW_GUEST);
  const [createStandardTasks, setCreateStandardTasks] = useState(true);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const resetRef = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && !resetRef.current) {
      setNewGuest(DEFAULT_NEW_GUEST);
      setScreenshotPreview(null);
      setImportFile(null);
      resetRef.current = true;
    } else if (!isOpen) {
      resetRef.current = false;
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
  };

  const analyzeFile = async (file: File, isScreenshot: boolean) => {
    if (isScreenshot) {
      setIsAnalyzingScreenshot(true);
      setScreenshotPreview(URL.createObjectURL(file));
    } else {
      setIsAnalyzingPdf(true);
    }
    setImportFile(file);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/analyze-booking', {
        method: 'POST',
        body: formData
      });

      const result = await response.json() as ScreenshotAnalysisResponse;
      const data = result.data;

      if (data) {
        const hasAnyData = data.guest_name || data.email || data.phone ||
                          data.arrival_date || data.departure_date ||
                          data.platform || data.booking_number ||
                          (data.rental_price && data.rental_price > 0);

        if (hasAnyData) {
          // Only populate guest-level fields (personal data)
          // Booking data (dates, prices, etc.) will be entered when creating a booking
          setNewGuest(prev => ({
            ...prev,
            guest_name: data.guest_name || prev.guest_name,
            nationality: data.nationality || prev.nationality,
            email: data.email || prev.email,
            phone: data.phone || prev.phone,
            address: data.address || prev.address,
            other_notes: data.notes || prev.other_notes,
          }));

          onSuccess(`${isScreenshot ? 'Screenshot' : 'PDF'} analysiert! Gastdaten wurden extrahiert. Bitte prüfen. Buchungsdaten können nach dem Anlegen des Gastes in einer neuen Buchung erfasst werden.`);
        } else {
          onError(`${isScreenshot ? 'Screenshot' : 'PDF'}-Analyse konnte keine Daten extrahieren.`);
        }
      } else if (result.error) {
        onError(`Fehler bei der Analyse: ${result.error}`);
      } else {
        onError(`${isScreenshot ? 'Screenshot' : 'PDF'} konnte nicht analysiert werden. Bitte Daten manuell eingeben.`);
      }
    } catch (err) {
      onError(`Fehler bei der Analyse: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      if (isScreenshot) {
        setIsAnalyzingScreenshot(false);
      } else {
        setIsAnalyzingPdf(false);
      }
    }
  };

  const handleSubmit = () => {
    onCreateGuest(
      newGuest,
      'new',
      null,
      createStandardTasks,
      importFile,
      null,
      false
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4" style={{ fontFamily: "'Aptos', 'Inter', system-ui, -apple-system, sans-serif" }}>
      <div className="bg-white rounded-xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Neuer Gast
            </h3>
            <button onClick={handleClose} className="text-gray-300 hover:text-gray-500 p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* File Import Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Buchungsdaten importieren
            </h4>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Screenshot Upload */}
              <div
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (items) {
                    for (const item of items) {
                      if (item.type.startsWith('image/')) {
                        const file = item.getAsFile();
                        if (file) {
                          e.preventDefault();
                          analyzeFile(file, true);
                        }
                        break;
                      }
                    }
                  }
                }}
                tabIndex={0}
              >
                <p className="text-sm text-blue-700 mb-2 flex items-center gap-1">
                  <Camera className="w-4 h-4" />
                  <strong>Screenshot</strong> (Strg+V oder Datei)
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) analyzeFile(file, true);
                    }}
                    className="hidden"
                    disabled={isAnalyzingScreenshot}
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
                    isAnalyzingScreenshot
                      ? 'border-blue-300 bg-blue-100'
                      : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'
                  }`}>
                    {isAnalyzingScreenshot ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-blue-700 font-medium text-sm">Analysiere...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-blue-600" />
                        <span className="text-blue-700 font-medium text-sm">Screenshot</span>
                      </>
                    )}
                  </div>
                </label>
                {screenshotPreview && (
                  <div className="relative w-16 h-16 mt-2 rounded-lg overflow-hidden border border-blue-300">
                    <img src={screenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setScreenshotPreview(null)}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* PDF Upload */}
              <div>
                <p className="text-sm text-indigo-700 mb-2 flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <strong>PDF</strong> (FeWo, Vrbo)
                </p>
                <label className="block">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) analyzeFile(file, false);
                    }}
                    className="hidden"
                    disabled={isAnalyzingPdf}
                  />
                  <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer transition ${
                    isAnalyzingPdf
                      ? 'border-indigo-300 bg-indigo-100'
                      : 'border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}>
                    {isAnalyzingPdf ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-indigo-700 font-medium text-sm">Analysiere...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <span className="text-indigo-700 font-medium text-sm">PDF-Datei</span>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Unterstützt: Booking.com, FeWo-Direkt, Vrbo, Airbnb
            </p>
          </div>

          {/* Guest Form Fields - Only personal/guest data, no booking fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={newGuest.guest_name || ''}
                onChange={(e) => setNewGuest({ ...newGuest, guest_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. Max Mustermann"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationalität</label>
              <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg min-h-[42px]">
                {(newGuest.nationality || '').split(',').filter(Boolean).map(code => {
                  const country = COUNTRIES.find(c => c.code === code.trim());
                  return country ? (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-sm cursor-pointer hover:bg-red-100"
                      onClick={() => {
                        const codes = (newGuest.nationality || '').split(',').filter(c => c.trim() !== code.trim());
                        setNewGuest({ ...newGuest, nationality: codes.join(',') });
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
                      const current = (newGuest.nationality || '').split(',').filter(Boolean);
                      if (!current.includes(e.target.value)) {
                        setNewGuest({
                          ...newGuest,
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
              <input
                type="email"
                value={newGuest.email || ''}
                onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. max@beispiel.de"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="text"
                value={newGuest.phone || ''}
                onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. +49 123 456789"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <input
                type="text"
                value={newGuest.address || ''}
                onChange={(e) => setNewGuest({ ...newGuest, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="z.B. Musterstr. 123, 12345 Musterstadt"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notizen</label>
              <textarea
                value={newGuest.other_notes || ''}
                onChange={(e) => setNewGuest({ ...newGuest, other_notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Zusätzliche Informationen..."
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newGuest.is_returning_guest === 1}
                onChange={(e) => setNewGuest({ ...newGuest, is_returning_guest: e.target.checked ? 1 : 0 })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Stammgast</span>
            </label>
          </div>

          {/* Standard Tasks Toggle */}
          <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={createStandardTasks}
                onChange={(e) => setCreateStandardTasks(e.target.checked)}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-5 h-5"
              />
              <div>
                <span className="font-medium text-purple-900 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  Standard-Aufgaben anlegen
                </span>
                <p className="text-xs text-purple-700 mt-1">
                  {STANDARD_TASKS.map(t => t.title).join(', ')}
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSaving || !newGuest.guest_name}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Erstellt...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Gast anlegen
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
