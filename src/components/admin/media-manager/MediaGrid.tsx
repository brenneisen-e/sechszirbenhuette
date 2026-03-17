'use client';

import {
  Image as ImageIcon,
  Video,
  GripVertical,
  Edit2,
  Tags,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';
import { getThumbnailUrl } from '@/lib/imageUtils';
import { MediaRecord } from './types';
import { CATEGORIES, GALLERY_CATEGORIES, groupedCategories } from './constants';

interface MediaGridProps {
  media: MediaRecord[];
  draggedItem: MediaRecord | null;
  bulkAssignMode: boolean;
  bulkCategory: string;
  bulkSelectedIds: Set<string>;
  editingId: string | null;
  editValues: { alt_text: string; title: string };
  getMediaByCategory: (category: string) => MediaRecord[];
  onDragStart: (item: MediaRecord) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (item: MediaRecord) => void;
  onToggleBulkItem: (id: string) => void;
  onMoveUp: (item: MediaRecord) => void;
  onMoveDown: (item: MediaRecord) => void;
  onEdit: (item: MediaRecord) => void;
  onEditCategories: (item: MediaRecord) => void;
  onDelete: (id: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  onEditValuesChange: (values: { alt_text: string; title: string }) => void;
}

export default function MediaGrid({
  media,
  draggedItem,
  bulkAssignMode,
  bulkCategory,
  bulkSelectedIds,
  editingId,
  editValues,
  getMediaByCategory,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleBulkItem,
  onMoveUp,
  onMoveDown,
  onEdit,
  onEditCategories,
  onDelete,
  onSaveEdit,
  onCancelEdit,
  onEditValuesChange,
}: MediaGridProps) {
  return (
    <div className="p-6 space-y-8">
      {Object.entries(groupedCategories).map(([group, cats]) => (
        <div key={group}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">{group}</h3>

          {cats.map(category => {
            const categoryMedia = getMediaByCategory(category.value);
            if (categoryMedia.length === 0) return null;

            return (
              <div key={category.value} className="mb-6">
                <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  {category.label}
                  <span className="text-sm text-gray-400">({categoryMedia.length})</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {categoryMedia.map(item => {
                    const isSelectedForBulk = bulkAssignMode && bulkCategory && bulkSelectedIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        draggable={!bulkAssignMode}
                        onDragStart={() => !bulkAssignMode && onDragStart(item)}
                        onDragOver={!bulkAssignMode ? onDragOver : undefined}
                        onDrop={() => !bulkAssignMode && onDrop(item)}
                        onClick={() => bulkAssignMode && bulkCategory && onToggleBulkItem(item.id)}
                        className={`group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition ${
                          bulkAssignMode && bulkCategory
                            ? isSelectedForBulk
                              ? 'border-logo-green ring-2 ring-logo-green ring-offset-2 cursor-pointer'
                              : 'border-gray-200 hover:border-gray-400 cursor-pointer opacity-60 hover:opacity-100'
                            : draggedItem?.id === item.id
                              ? 'border-logo-green opacity-50'
                              : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        {/* Bulk selection checkbox */}
                        {bulkAssignMode && bulkCategory && (
                          <div className="absolute top-2 left-2 z-20">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                              isSelectedForBulk ? 'bg-logo-green' : 'bg-white/90 border-2 border-gray-300'
                            }`}>
                              {isSelectedForBulk && <Check className="w-4 h-4 text-white" />}
                            </div>
                          </div>
                        )}

                        {/* Drag Handle - hidden in bulk mode */}
                        {!bulkAssignMode && (
                          <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition cursor-grab">
                            <GripVertical className="w-5 h-5 text-white drop-shadow" />
                          </div>
                        )}

                        {/* Media */}
                        {item.media_type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Video className="w-12 h-12 text-white" />
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={getThumbnailUrl(item.url)}
                            alt={item.alt_text || 'Bild'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}

                        {/* Move buttons - top right - hidden in bulk mode */}
                        {!bulkAssignMode && (
                          <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition flex flex-col gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); onMoveUp(item); }}
                              className="p-1 bg-white/90 rounded hover:bg-white transition"
                              title="Nach oben"
                            >
                              <ChevronUp className="w-4 h-4 text-gray-700" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onMoveDown(item); }}
                              className="p-1 bg-white/90 rounded hover:bg-white transition"
                              title="Nach unten"
                            >
                              <ChevronDown className="w-4 h-4 text-gray-700" />
                            </button>
                          </div>
                        )}

                        {/* Overlay with actions - hidden in bulk mode */}
                        {!bulkAssignMode && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            <button
                              onClick={() => onEdit(item)}
                              className="p-2 bg-white rounded-full hover:bg-gray-100 transition"
                              title="Bearbeiten"
                            >
                              <Edit2 className="w-4 h-4 text-gray-700" />
                            </button>
                            {/* Show category button only for gallery categories */}
                            {GALLERY_CATEGORIES.includes(item.category) && (
                              <button
                                onClick={() => onEditCategories(item)}
                                className="p-2 bg-white rounded-full hover:bg-blue-100 transition"
                                title="Kategorien"
                              >
                                <Tags className="w-4 h-4 text-blue-600" />
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(item.id)}
                              className="p-2 bg-white rounded-full hover:bg-red-100 transition"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        )}

                        {/* Edit Form */}
                        {editingId === item.id && (
                          <div className="absolute inset-0 bg-white p-2 flex flex-col gap-1">
                            <div>
                              <label className="text-[10px] font-medium text-gray-500">Titel</label>
                              <input
                                type="text"
                                value={editValues.title}
                                onChange={(e) => onEditValuesChange({ ...editValues, title: e.target.value })}
                                placeholder="Titel"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-medium text-gray-500">Alt-Text</label>
                              <input
                                type="text"
                                value={editValues.alt_text}
                                onChange={(e) => onEditValuesChange({ ...editValues, alt_text: e.target.value })}
                                placeholder="Alt-Text"
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex gap-1 mt-auto">
                              <button
                                onClick={() => onSaveEdit(item.id)}
                                className="flex-1 py-1 bg-logo-green text-white text-xs rounded hover:bg-logo-green/90"
                              >
                                <Check className="w-3 h-3 inline" />
                              </button>
                              <button
                                onClick={onCancelEdit}
                                className="flex-1 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                              >
                                <X className="w-3 h-3 inline" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Empty State */}
      {media.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Noch keine Medien vorhanden</p>
          <p className="text-sm">Wählen Sie eine Kategorie und laden Sie Dateien hoch</p>
        </div>
      )}
    </div>
  );
}
