'use client';

import { Upload, X, Loader2 } from 'lucide-react';
import Image from 'next/image';

import { UploadFile } from '../image-manager';

interface UploadAreaProps {
  uploadFiles: UploadFile[];
  isDragging: boolean;
  isUploading: boolean;
  pendingCount: number;
  doneCount: number;
  errorCount: number;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onUploadAll: () => void;
  onRemoveFile: (id: string) => void;
  onUpdateFileStatus: (id: string, updates: Partial<UploadFile>) => void;
  onClearCompleted: () => void;
}

export function UploadArea({
  uploadFiles,
  isDragging,
  isUploading,
  pendingCount,
  doneCount,
  errorCount,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilesSelected,
  onUploadAll,
  onRemoveFile,
  onUpdateFileStatus,
  onClearCompleted,
}: UploadAreaProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Upload className="w-6 h-6" />
        Bilder hochladen
      </h2>

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50'
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Bilder hierher ziehen oder klicken zum Auswählen</p>
          <p className="text-sm text-gray-400 mt-2">Max. 15MB pro Bild</p>
        </label>
      </div>

      {uploadFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {pendingCount} ausstehend • {doneCount} fertig • {errorCount} Fehler
            </p>
            <div className="flex gap-2">
              {doneCount > 0 && (
                <button onClick={onClearCompleted} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                  Fertige entfernen
                </button>
              )}
              <button
                onClick={onUploadAll}
                disabled={isUploading || pendingCount === 0}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Alle hochladen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {uploadFiles.map((file) => (
              <div key={file.id} className="relative bg-gray-100 rounded-lg overflow-hidden">
                <div className="relative aspect-video">
                  <Image src={file.preview} alt="Preview" fill className="object-cover" />
                </div>
                <div className="p-2">
                  <input
                    type="text"
                    value={file.altText || ''}
                    onChange={(e) => onUpdateFileStatus(file.id, { altText: e.target.value })}
                    placeholder="Beschreibung..."
                    className="w-full text-xs px-2 py-1 border rounded"
                  />
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-xs ${file.status === 'done' ? 'text-green-600' : file.status === 'error' ? 'text-red-600' : 'text-gray-500'}`}
                    >
                      {file.status === 'analyzing'
                        ? 'Analysiert...'
                        : file.status === 'compressing'
                          ? 'Komprimiert...'
                          : file.status === 'uploading'
                            ? 'Lädt hoch...'
                            : file.status === 'done'
                              ? 'Fertig'
                              : file.status === 'error'
                                ? 'Fehler'
                                : 'Warten'}
                    </span>
                    <button onClick={() => onRemoveFile(file.id)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
