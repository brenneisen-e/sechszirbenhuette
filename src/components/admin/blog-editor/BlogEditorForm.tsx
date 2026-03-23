'use client';

import { useState } from 'react';
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
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { BlogPost, BlogPostImage } from './types';
import { RichTextEditor } from './RichTextEditor';

interface BlogEditorFormProps {
  currentPost: Partial<BlogPost>;
  postImages: BlogPostImage[];
  saving: boolean;
  activeTab: 'edit' | 'preview';
  availableMedia?: { id: string; url: string; alt_text: string; title: string }[];
  onUpdatePost: (updates: Partial<BlogPost>) => void;
  onRemoveImage: (index: number) => void;
  onUpdateImage: (index: number, updates: Partial<BlogPostImage>) => void;
  onReorderImages: (fromIndex: number, toIndex: number) => void;
  onOpenMediaPicker: (target: 'cover' | 'gallery' | number) => void;
  onSave: (publish?: boolean) => void;
  onTogglePreview: () => void;
  onMediaUploaded?: () => void;
}

export function BlogEditorForm({
  currentPost,
  postImages,
  saving,
  activeTab,
  availableMedia,
  onUpdatePost,
  onRemoveImage,
  onUpdateImage,
  onReorderImages,
  onOpenMediaPicker,
  onSave,
  onTogglePreview,
  onMediaUploaded,
}: BlogEditorFormProps) {
  const isCarousel = currentPost.layout === 'carousel';
  const [expandedSlide, setExpandedSlide] = useState<number | null>(0);

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPost.cover_image_url}
                alt={currentPost.cover_image_alt || ''}
                className="w-full h-full object-cover"
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

        {/* === STANDARD LAYOUT === */}
        {!isCarousel && (
          <>
            {/* Content - Rich Text Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt *</label>
              <RichTextEditor
                value={currentPost.content || ''}
                onChange={(html) => onUpdatePost({ content: html })}
                availableMedia={availableMedia}
                onMediaUploaded={onMediaUploaded}
              />
            </div>

            {/* Gallery Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Galerie-Bilder ({postImages.length})
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {postImages.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.image_url}
                      alt={img.image_alt || ''}
                      className="w-full h-full object-cover"
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
          </>
        )}

        {/* === CAROUSEL LAYOUT === */}
        {isCarousel && (
          <>
            {/* Intro Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Einleitungstext</label>
              <textarea
                value={currentPost.content || ''}
                onChange={(e) => onUpdatePost({ content: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                placeholder="Einleitender Text, der über dem Karussell angezeigt wird..."
              />
            </div>

            {/* Carousel Slides */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Karussell-Einheiten ({postImages.length})
                </label>
                <button
                  onClick={() => {
                    onOpenMediaPicker('gallery');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Einheit hinzufügen
                </button>
              </div>

              {postImages.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-400">
                  <LayoutGrid className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Noch keine Karussell-Einheiten</p>
                  <p className="text-xs mt-1">Klicke &quot;Einheit hinzufügen&quot; um zu beginnen</p>
                </div>
              )}

              <div className="space-y-3">
                {postImages.map((slide, index) => {
                  const isExpanded = expandedSlide === index;
                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-xl overflow-hidden bg-white"
                    >
                      {/* Slide Header - always visible */}
                      <div
                        className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition"
                        onClick={() => setExpandedSlide(isExpanded ? null : index)}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />

                        {/* Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                          {slide.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={slide.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Upload className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-700">
                            Slide {index + 1}
                          </span>
                          {slide.caption && (
                            <p className="text-xs text-gray-400 truncate">
                              {slide.caption.split('\n')[0]}
                            </p>
                          )}
                        </div>

                        {/* Reorder & Delete buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onReorderImages(index, index - 1); }}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Nach oben"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onReorderImages(index, index + 1); }}
                            disabled={index === postImages.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            title="Nach unten"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onRemoveImage(index); }}
                            className="p-1 text-red-400 hover:text-red-600"
                            title="Entfernen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Slide Content - expanded */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 border-t border-gray-200">
                          {/* Slide Image */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Bild</label>
                            {slide.image_url ? (
                              <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={slide.image_url}
                                  alt={slide.image_alt || ''}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => onOpenMediaPicker(index)}
                                  className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-white/90 text-gray-700 rounded-lg hover:bg-white shadow transition"
                                >
                                  Ändern
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => onOpenMediaPicker(index)}
                                className="w-full aspect-[4/3] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-logo-green hover:text-logo-green transition"
                              >
                                <Upload className="w-6 h-6 mb-1" />
                                <span className="text-xs">Bild auswählen</span>
                              </button>
                            )}
                          </div>

                          {/* Slide Title */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Titel</label>
                            <input
                              type="text"
                              value={slide.image_alt || ''}
                              onChange={(e) => onUpdateImage(index, { image_alt: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                              placeholder="Titel der Karussell-Einheit"
                            />
                          </div>

                          {/* Slide Description */}
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Beschreibung</label>
                            <textarea
                              value={slide.caption || ''}
                              onChange={(e) => onUpdateImage(index, { caption: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                              placeholder="Beschreibungstext für diese Einheit..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

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
