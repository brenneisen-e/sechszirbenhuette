'use client';

import { useState, useEffect, useMemo } from 'react';
import { Loader2, X, ImageIcon, Check } from 'lucide-react';
import Image from 'next/image';

const CATEGORY_LABELS: Record<string, string> = {
  aussen: 'Außen',
  wohnen: 'Wohnzimmer',
  schlafen: 'Schlafzimmer',
  kueche: 'Küche',
  bad: 'Bad & Sauna',
  umgebung: 'Umgebung',
  sommer: 'Sommer',
  winter: 'Winter',
  gastgeber: 'Gastgeber',
  galerie: 'Galerie',
  blog: 'Blog',
  innen: 'Innen',
};

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
      const HERO_CATS = new Set(['hero', 'hero-thumbnail', 'hero-1080p', 'hero-720p', 'hero-480p', 'hero-360p']);
      setAllMedia((mediaData.media || []).filter((m: MediaRecord) =>
        m.url && !m.url.includes('video') && !HERO_CATS.has(m.category || '')
      ));
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

  // Group media by category for picker modal
  const groupedMedia = useMemo(() => {
    const grp: Record<string, MediaRecord[]> = {};
    for (const m of allMedia) {
      const cat = m.category || 'sonstige';
      if (!grp[cat]) grp[cat] = [];
      grp[cat].push(m);
    }
    return grp;
  }, [allMedia]);

  // Get ordered categories: suggested first, then rest alphabetically
  const getOrderedCategories = (cardKey: string) => {
    const card = CARD_KEYS.find((c) => c.key === cardKey);
    const suggested = card?.suggestedCategory || '';
    const cats = Object.keys(groupedMedia).sort((a, b) =>
      (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b)
    );
    if (suggested && groupedMedia[suggested]) {
      return [suggested, ...cats.filter(c => c !== suggested)];
    }
    return cats;
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
              <div className="space-y-5">
                {getOrderedCategories(selectingFor).map((cat) => {
                  const items = groupedMedia[cat] || [];
                  if (items.length === 0) return null;
                  const card = CARD_KEYS.find((c) => c.key === selectingFor);
                  const isSuggested = card?.suggestedCategory === cat;
                  return (
                    <div key={cat}>
                      <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${
                        isSuggested ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {CATEGORY_LABELS[cat] || cat} ({items.length})
                        {isSuggested && <span className="ml-1 normal-case text-green-500">— empfohlen</span>}
                      </h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {items.map((m) => {
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
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
