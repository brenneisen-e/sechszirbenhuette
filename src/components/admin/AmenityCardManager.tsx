'use client';

import { useState, useEffect } from 'react';
import { Loader2, X, ImageIcon, Check } from 'lucide-react';
import Image from 'next/image';

interface MediaRecord {
  id: string;
  url: string;
  title?: string;
  alt_text?: string;
  category: string;
}

interface Assignment {
  id: number;
  card_key: string;
  media_id: string;
  url: string;
  title: string;
  alt_text: string;
}

const CARD_KEYS = [
  { key: 'living', label: 'Wohnbereich', suggestedCategory: 'wohnen' },
  { key: 'kitchen', label: 'Küche', suggestedCategory: 'kueche' },
  { key: 'rooms', label: 'Schlafzimmer', suggestedCategory: 'schlafen' },
  { key: 'sauna', label: 'Sauna & Wellness', suggestedCategory: 'bad' },
  { key: 'bathroom', label: 'Badezimmer', suggestedCategory: 'bad' },
  { key: 'outdoor', label: 'Außenbereich', suggestedCategory: 'aussen' },
  { key: 'equipment', label: 'Ausstattung', suggestedCategory: '' },
  { key: 'location', label: 'Lage', suggestedCategory: 'umgebung' },
];

export function AmenityCardManager() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [allMedia, setAllMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectingFor, setSelectingFor] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignRes, mediaRes] = await Promise.all([
        fetch('/api/admin/amenity-images'),
        fetch('/api/admin/media'),
      ]);
      const assignData = await assignRes.json() as { assignments?: Assignment[] };
      const mediaData = await mediaRes.json() as { media?: MediaRecord[] };
      setAssignments(assignData.assignments || []);
      setAllMedia((mediaData.media || []).filter((m: MediaRecord) => m.url && !m.url.includes('video')));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const assignImage = async (cardKey: string, mediaId: string) => {
    setSaving(cardKey);
    try {
      await fetch('/api/admin/amenity-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_key: cardKey, media_id: mediaId }),
      });
      await loadData();
      setSelectingFor(null);
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const removeImage = async (cardKey: string) => {
    setSaving(cardKey);
    try {
      await fetch(`/api/admin/amenity-images?card_key=${cardKey}`, { method: 'DELETE' });
      await loadData();
    } catch {
      // ignore
    } finally {
      setSaving(null);
    }
  };

  const getAssignment = (cardKey: string) => assignments.find((a) => a.card_key === cardKey);

  // Filter media by suggested category for the card being selected
  const getFilteredMedia = (cardKey: string) => {
    const card = CARD_KEYS.find((c) => c.key === cardKey);
    if (!card?.suggestedCategory) return allMedia;
    // Show suggested category first, then all others
    const suggested = allMedia.filter((m) => m.category === card.suggestedCategory);
    const others = allMedia.filter((m) => m.category !== card.suggestedCategory);
    return [...suggested, ...others];
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Lade Ausstattungs-Bilder...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-700">Ferienhaus-Karten Bilder</h3>
        <p className="text-xs text-gray-400">Bilder für die Ausstattungs-Karten auf der Startseite</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {CARD_KEYS.map((card) => {
          const assignment = getAssignment(card.key);
          const isSaving = saving === card.key;

          return (
            <div key={card.key} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Image preview */}
              <div className="aspect-[4/3] bg-gray-100 relative">
                {isSaving ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : assignment?.url ? (
                  <>
                    <Image
                      src={assignment.url}
                      alt={assignment.alt_text || card.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    <button
                      onClick={() => removeImage(card.key)}
                      className="absolute top-1 right-1 p-1 bg-white/80 rounded-full hover:bg-red-50 shadow-sm"
                      title="Bild entfernen"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Label and action */}
              <div className="p-2">
                <p className="text-xs font-medium text-gray-700 truncate">{card.label}</p>
                <button
                  onClick={() => setSelectingFor(card.key)}
                  className="mt-1 w-full text-[10px] px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                >
                  {assignment ? 'Ändern' : 'Bild wählen'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image selection modal */}
      {selectingFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Bild wählen: {CARD_KEYS.find((c) => c.key === selectingFor)?.label}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Klicke auf ein Bild um es zuzuweisen
                </p>
              </div>
              <button onClick={() => setSelectingFor(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {getFilteredMedia(selectingFor).map((m) => {
                  const isAssigned = assignments.some((a) => a.card_key === selectingFor && a.media_id === m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => assignImage(selectingFor, m.id)}
                      className={`relative aspect-[4/3] rounded-lg overflow-hidden border-2 transition ${
                        isAssigned ? 'border-green-500 ring-2 ring-green-200' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <Image
                        src={m.url}
                        alt={m.alt_text || m.title || ''}
                        fill
                        className="object-cover"
                        sizes="150px"
                      />
                      {isAssigned && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                        <p className="text-[9px] text-white truncate">{m.alt_text || m.title || m.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
