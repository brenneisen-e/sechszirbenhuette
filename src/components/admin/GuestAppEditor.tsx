'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Upload,
  X,
  Key,
  Copy,
  Check,
  Info,
  MapPin,
  Coffee,
  Utensils,
  Mountain,
  Car,
  Snowflake,
  Home,
  ShoppingCart,
  Flame,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

// Icon options for categories
const ICON_OPTIONS: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'info', label: 'Info', Icon: Info },
  { value: 'map-pin', label: 'Anfahrt', Icon: MapPin },
  { value: 'coffee', label: 'Kaffee', Icon: Coffee },
  { value: 'utensils', label: 'Essen', Icon: Utensils },
  { value: 'mountain', label: 'Wandern', Icon: Mountain },
  { value: 'car', label: 'Auto', Icon: Car },
  { value: 'snowflake', label: 'Ski', Icon: Snowflake },
  { value: 'home', label: 'Unterkunft', Icon: Home },
  { value: 'shopping-cart', label: 'Einkaufen', Icon: ShoppingCart },
  { value: 'flame', label: 'Ofen/Sauna', Icon: Flame },
  { value: 'wifi', label: 'WiFi', Icon: Wifi },
  { value: 'key', label: 'Check-In', Icon: Key },
];

function getIconComponent(iconName: string): LucideIcon {
  return ICON_OPTIONS.find(o => o.value === iconName)?.Icon || Info;
}

interface Category {
  id: number;
  title: string;
  icon: string;
  display_order: number;
  is_active: number;
  cards: Card[];
}

interface Card {
  id: number;
  category_id: number;
  title: string;
  content: string;
  image_url: string | null;
  image_alt: string | null;
  display_order: number;
  is_active: number;
}

interface Token {
  id: number;
  booking_id: number;
  access_code: string;
  guest_name: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: number;
  last_login: string | null;
  arrival_date?: string;
  departure_date?: string;
  booking_guest_name?: string;
}

interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  title: string;
}

type SubTab = 'content' | 'tokens';

export default function GuestAppEditor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('content');
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New category form
  const [newCatTitle, setNewCatTitle] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('info');

  // New token form
  const [newTokenBookingId, setNewTokenBookingId] = useState('');
  const [newTokenGuestName, setNewTokenGuestName] = useState('');

  // Bookings for token creation
  const [bookings, setBookings] = useState<{ id: number; guest_name: string; arrival_date: string }[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [catRes, mediaRes] = await Promise.all([
        fetch('/api/admin/guest-app'),
        fetch('/api/admin/media'),
      ]);
      const catData = await catRes.json() as { categories?: Category[] };
      const mediaData = await mediaRes.json() as { media?: (MediaItem & { media_type?: string; category?: string })[] };

      setCategories(catData.categories || []);

      const HERO_CATS = new Set(['hero', 'hero-thumbnail', 'hero-1080p', 'hero-720p', 'hero-480p', 'hero-360p']);
      setAvailableMedia(
        (mediaData.media || []).filter(m => m.media_type !== 'video' && !HERO_CATS.has(m.category || ''))
      );
    } catch {
      setError('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/guest-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_tokens' }),
      });
      const data = await res.json() as { tokens?: Token[] };
      setTokens(data.tokens || []);
    } catch {
      setError('Fehler beim Laden der Tokens');
    }
  }, []);

  const loadBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/bookings');
      const data = await res.json() as { bookings?: { id: number; guest_name: string; arrival_date: string }[] };
      setBookings(data.bookings || []);
    } catch {
      // not critical
    }
  }, []);

  useEffect(() => {
    loadData();
    loadTokens();
    loadBookings();
  }, [loadData, loadTokens, loadBookings]);

  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => { setError(''); setSuccess(''); }, 3000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  const apiCall = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/guest-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success?: boolean; error?: string; access_code?: string };
      if (!data.success) throw new Error(data.error || 'Fehler');
      return data;
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatTitle.trim()) return;
    try {
      await apiCall({ action: 'create_category', title: newCatTitle.trim(), icon: newCatIcon });
      setNewCatTitle('');
      setNewCatIcon('info');
      setSuccess('Kategorie erstellt');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Kategorie und alle Kacheln löschen?')) return;
    try {
      await apiCall({ action: 'delete_category', id });
      setSuccess('Kategorie gelöscht');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleUpdateCategory = async (id: number, updates: Partial<Category>) => {
    try {
      await apiCall({ action: 'update_category', id, ...updates });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleAddCard = async (categoryId: number) => {
    try {
      await apiCall({ action: 'create_card', category_id: categoryId, title: 'Neue Kachel' });
      setSuccess('Kachel erstellt');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleUpdateCard = async (id: number, updates: Partial<Card>) => {
    try {
      await apiCall({ action: 'update_card', id, ...updates });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleDeleteCard = async (id: number) => {
    if (!confirm('Kachel löschen?')) return;
    try {
      await apiCall({ action: 'delete_card', id });
      setSuccess('Kachel gelöscht');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenBookingId) return;
    try {
      const data = await apiCall({
        action: 'create_token',
        booking_id: parseInt(newTokenBookingId),
        guest_name: newTokenGuestName.trim() || undefined,
      });
      setSuccess(`Zugangscode erstellt: ${data.access_code}`);
      setNewTokenBookingId('');
      setNewTokenGuestName('');
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const handleDeleteToken = async (id: number) => {
    if (!confirm('Zugangscode löschen?')) return;
    try {
      await apiCall({ action: 'delete_token', id });
      setSuccess('Zugangscode gelöscht');
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-3 text-sm text-gray-500">Lade Gäste-App...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">Gäste-App Inhalte</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSubTab('content')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              subTab === 'content' ? 'bg-logo-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Inhalte
          </button>
          <button
            onClick={() => setSubTab('tokens')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              subTab === 'tokens' ? 'bg-logo-green text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Zugangscodes
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      {subTab === 'content' && (
        <div className="space-y-4">
          {/* Add Category */}
          <div className="flex gap-3 items-end p-4 bg-gray-50 rounded-xl">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Neue Kategorie</label>
              <input
                value={newCatTitle}
                onChange={(e) => setNewCatTitle(e.target.value)}
                placeholder="z.B. Rund um den Check-In"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-logo-green/20 focus:border-logo-green"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
              <select
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddCategory}
              disabled={saving || !newCatTitle.trim()}
              className="px-4 py-2 bg-logo-green text-white rounded-lg text-sm font-medium hover:bg-logo-green/90 disabled:opacity-50 flex items-center gap-2"
            >
              <Plus size={16} /> Hinzufügen
            </button>
          </div>

          {/* Categories */}
          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Info className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Noch keine Kategorien angelegt</p>
              <p className="text-sm">Erstellen Sie Kategorien wie &quot;Rund um den Check-In&quot; oder &quot;Rund um die Reise&quot;</p>
            </div>
          )}

          {categories.map((cat) => {
            const isExpanded = expandedCategory === cat.id;
            const CatIcon = getIconComponent(cat.icon);

            return (
              <div key={cat.id} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Category Header */}
                <div
                  className="flex items-center gap-3 p-4 bg-white hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                >
                  <GripVertical size={16} className="text-gray-300" />
                  <div className="w-10 h-10 rounded-lg bg-logo-green/10 flex items-center justify-center">
                    <CatIcon size={20} className="text-logo-green" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{cat.title}</h3>
                    <p className="text-xs text-gray-400">{cat.cards.length} Kachel{cat.cards.length !== 1 ? 'n' : ''}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleUpdateCategory(cat.id, { is_active: cat.is_active ? 0 : 1 }); }}
                    className="p-2 text-gray-400 hover:text-gray-600 transition"
                    title={cat.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    {cat.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>

                {/* Category Content (expanded) */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3">
                    {/* Edit category title/icon inline */}
                    <div className="flex gap-3 items-center mb-4">
                      <input
                        value={cat.title}
                        onChange={(e) => {
                          setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, title: e.target.value } : c));
                        }}
                        onBlur={(e) => handleUpdateCategory(cat.id, { title: e.target.value })}
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                      />
                      <select
                        value={cat.icon}
                        onChange={(e) => handleUpdateCategory(cat.id, { icon: e.target.value } as Partial<Category>)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                      >
                        {ICON_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Cards */}
                    {cat.cards.map((card) => {
                      const isEditing = editingCard === card.id;
                      return (
                        <div key={card.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                          {/* Card Header */}
                          <div
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition"
                            onClick={() => setEditingCard(isEditing ? null : card.id)}
                          >
                            <GripVertical size={14} className="text-gray-300" />
                            {card.image_url && (
                              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                                <img src={card.image_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 text-sm truncate">{card.title}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition"
                            >
                              <Trash2 size={14} />
                            </button>
                            {isEditing ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </div>

                          {/* Card Editor (expanded) */}
                          {isEditing && (
                            <div className="border-t border-gray-100 p-4 space-y-4">
                              {/* Image */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Bild</label>
                                {card.image_url ? (
                                  <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                                    <img src={card.image_url} alt={card.image_alt || ''} className="w-full h-full object-cover" />
                                    <button
                                      onClick={() => handleUpdateCard(card.id, { image_url: null, image_alt: null })}
                                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setShowMediaPicker(card.id)}
                                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-logo-green hover:text-logo-green transition"
                                  >
                                    <Upload size={24} />
                                    <span className="text-xs mt-1">Bild auswählen</span>
                                  </button>
                                )}
                              </div>

                              {/* Title */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Titel</label>
                                <input
                                  value={card.title}
                                  onChange={(e) => {
                                    setCategories(prev => prev.map(c => ({
                                      ...c,
                                      cards: c.cards.map(cd => cd.id === card.id ? { ...cd, title: e.target.value } : cd),
                                    })));
                                  }}
                                  onBlur={(e) => handleUpdateCard(card.id, { title: e.target.value })}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                />
                              </div>

                              {/* Content (HTML) */}
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Inhalt (HTML)</label>
                                <textarea
                                  value={card.content}
                                  onChange={(e) => {
                                    setCategories(prev => prev.map(c => ({
                                      ...c,
                                      cards: c.cards.map(cd => cd.id === card.id ? { ...cd, content: e.target.value } : cd),
                                    })));
                                  }}
                                  onBlur={(e) => handleUpdateCard(card.id, { content: e.target.value })}
                                  rows={8}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                                  placeholder="<p>Hier kommt der Inhalt hin...</p>"
                                />
                              </div>

                              {/* Save button */}
                              <button
                                onClick={() => {
                                  handleUpdateCard(card.id, { title: card.title, content: card.content });
                                  setSuccess('Kachel gespeichert');
                                }}
                                disabled={saving}
                                className="px-4 py-2 bg-logo-green text-white rounded-lg text-sm font-medium hover:bg-logo-green/90 disabled:opacity-50 flex items-center gap-2"
                              >
                                <Save size={14} /> Speichern
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Add Card */}
                    <button
                      onClick={() => handleAddCard(cat.id)}
                      disabled={saving}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-logo-green hover:text-logo-green transition flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus size={16} /> Neue Kachel hinzufügen
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subTab === 'tokens' && (
        <div className="space-y-4">
          {/* Create Token */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Neuen Zugangscode erstellen</h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Buchung</label>
                <select
                  value={newTokenBookingId}
                  onChange={(e) => setNewTokenBookingId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Buchung auswählen...</option>
                  {bookings.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.guest_name} — {b.arrival_date || 'Kein Datum'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Gastname (optional)</label>
                <input
                  value={newTokenGuestName}
                  onChange={(e) => setNewTokenGuestName(e.target.value)}
                  placeholder="Wird in der App angezeigt"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <button
                onClick={handleCreateToken}
                disabled={saving || !newTokenBookingId}
                className="px-4 py-2 bg-logo-green text-white rounded-lg text-sm font-medium hover:bg-logo-green/90 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
              >
                <Key size={16} /> Code erstellen
              </button>
            </div>
          </div>

          {/* Token List */}
          {tokens.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Noch keine Zugangscodes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tokens.map((token) => (
                <div key={token.id} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                  <div className={`w-3 h-3 rounded-full ${token.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">
                      {token.guest_name || token.booking_guest_name || 'Gast'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {token.arrival_date && `${token.arrival_date} — ${token.departure_date}`}
                      {token.last_login && ` · Letzter Login: ${new Date(token.last_login).toLocaleDateString('de-DE')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5">
                    <code className="text-sm font-bold tracking-widest text-logo-green">{token.access_code}</code>
                    <button
                      onClick={() => copyCode(token.access_code)}
                      className="p-1 text-gray-400 hover:text-logo-green transition"
                    >
                      {copiedCode === token.access_code ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleDeleteToken(token.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold">Bild auswählen</h3>
              <button onClick={() => setShowMediaPicker(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {availableMedia.map(media => (
                  <button
                    key={media.id}
                    onClick={() => {
                      handleUpdateCard(showMediaPicker, { image_url: media.url, image_alt: media.alt_text || media.title });
                      setShowMediaPicker(null);
                    }}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-logo-green transition"
                  >
                    <img src={media.url} alt={media.alt_text} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
