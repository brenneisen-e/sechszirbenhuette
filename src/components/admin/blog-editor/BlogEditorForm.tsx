'use client';

import Image from 'next/image';
import {
  Save,
  Eye,
  EyeOff,
  Loader2,
  Upload,
  X,
  Plus,
  List,
  LayoutGrid,
} from 'lucide-react';
import type { BlogPost, BlogPostImage } from './types';

interface BlogEditorFormProps {
  currentPost: Partial<BlogPost>;
  postImages: BlogPostImage[];
  saving: boolean;
  activeTab: 'edit' | 'preview';
  onUpdatePost: (updates: Partial<BlogPost>) => void;
  onRemoveImage: (index: number) => void;
  onOpenMediaPicker: (target: 'cover' | 'gallery') => void;
  onSave: (publish?: boolean) => void;
  onTogglePreview: () => void;
}

export function BlogEditorForm({
  currentPost,
  postImages,
  saving,
  activeTab,
  onUpdatePost,
  onRemoveImage,
  onOpenMediaPicker,
  onSave,
  onTogglePreview,
}: BlogEditorFormProps) {
  return (
    <div className={activeTab === 'preview' ? 'hidden lg:block' : ''}>
      <div className="space-y-6">
        {/* Layout Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdatePost({ layout: 'standard' })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                currentPost.layout === 'standard'
                  ? 'border-logo-green bg-logo-green/10 text-logo-green'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <List className="w-5 h-5" />
              Standard
            </button>
            <button
              onClick={() => onUpdatePost({ layout: 'carousel' })}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                currentPost.layout === 'carousel'
                  ? 'border-logo-green bg-logo-green/10 text-logo-green'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
              Karussell
            </button>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
          <input
            type="text"
            value={currentPost.title || ''}
            onChange={(e) => onUpdatePost({ title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
            placeholder="Beitragstitel"
          />
        </div>

        {/* Subtitle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Untertitel</label>
          <input
            type="text"
            value={currentPost.subtitle || ''}
            onChange={(e) => onUpdatePost({ subtitle: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
            placeholder="Optionaler Untertitel"
          />
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kurzbeschreibung</label>
          <textarea
            value={currentPost.excerpt || ''}
            onChange={(e) => onUpdatePost({ excerpt: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
            placeholder="Kurze Beschreibung für die Übersicht"
          />
        </div>

        {/* Cover Image */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titelbild</label>
          {currentPost.cover_image_url ? (
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={currentPost.cover_image_url}
                alt={currentPost.cover_image_alt || ''}
                fill
                className="object-cover"
              />
              <button
                onClick={() => onUpdatePost({ cover_image_url: null, cover_image_alt: null })}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenMediaPicker('cover')}
              className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-logo-green hover:text-logo-green transition"
            >
              <Upload className="w-8 h-8 mb-2" />
              <span>Bild auswählen</span>
            </button>
          )}
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt * (HTML)</label>
          <textarea
            value={currentPost.content || ''}
            onChange={(e) => onUpdatePost({ content: e.target.value })}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green font-mono text-sm"
            placeholder="<p>Ihr Beitragstext...</p>"
          />
          <p className="text-xs text-gray-500 mt-1">
            Unterstützt HTML-Tags wie &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc.
          </p>
        </div>

        {/* Gallery Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Galerie-Bilder ({postImages.length})
          </label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {postImages.map((img, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                <Image
                  src={img.image_url}
                  alt={img.image_alt || ''}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => onRemoveImage(index)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              onClick={() => onOpenMediaPicker('gallery')}
              className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-logo-green hover:text-logo-green transition"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* SEO Fields */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">SEO-Einstellungen</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Meta-Titel</label>
              <input
                type="text"
                value={currentPost.meta_title || ''}
                onChange={(e) => onUpdatePost({ meta_title: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                placeholder="Standard: Beitragstitel"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Meta-Beschreibung</label>
              <textarea
                value={currentPost.meta_description || ''}
                onChange={(e) => onUpdatePost({ meta_description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                placeholder="Beschreibung für Suchmaschinen"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => onSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Als Entwurf speichern
          </button>
          <button
            onClick={() => onSave(true)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Veröffentlichen
          </button>
          <button
            onClick={onTogglePreview}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition lg:hidden"
          >
            {activeTab === 'preview' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {activeTab === 'preview' ? 'Bearbeiten' : 'Vorschau'}
          </button>
        </div>
      </div>
    </div>
  );
}
