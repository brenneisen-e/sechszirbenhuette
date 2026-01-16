'use client';

import { X, Trash2, CheckCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { DuplicateGroup } from './types';

interface DuplicatesModalProps {
  groups: DuplicateGroup[];
  selectedForDeletion: Set<string>;
  isDeleting: boolean;
  onToggleSelection: (imageId: string) => void;
  onSelectAllExceptFirst: () => void;
  onDeleteSelected: () => void;
  onClose: () => void;
}

export function DuplicatesModal({
  groups,
  selectedForDeletion,
  isDeleting,
  onToggleSelection,
  onSelectAllExceptFirst,
  onDeleteSelected,
  onClose,
}: DuplicatesModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Duplikate gefunden ({groups.length} Gruppen)</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={onSelectAllExceptFirst}
              className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
            >
              Alle außer erstes markieren
            </button>
            <button
              onClick={onDeleteSelected}
              disabled={selectedForDeletion.size === 0 || isDeleting}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {selectedForDeletion.size} löschen
            </button>
          </div>
          <div className="space-y-6">
            {groups.map((group, i) => (
              <div key={i} className="border rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-3">
                  Gruppe {i + 1} ({group.images.length} Bilder)
                </p>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {group.images.map((img) => (
                    <div
                      key={img.id}
                      className={`relative cursor-pointer rounded-lg overflow-hidden ${
                        selectedForDeletion.has(img.id) ? 'ring-2 ring-red-500' : ''
                      }`}
                      onClick={() => onToggleSelection(img.id)}
                    >
                      <div className="relative aspect-video">
                        <Image src={img.image_url} alt={img.alt_text} fill className="object-cover" />
                      </div>
                      {selectedForDeletion.has(img.id) && (
                        <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
