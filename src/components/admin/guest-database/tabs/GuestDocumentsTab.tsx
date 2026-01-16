'use client';

import { FileText, Camera, Upload, Download, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import type { GuestDocument } from '../types';

interface GuestDocumentsTabProps {
  documents: GuestDocument[];
  loading: boolean;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: number) => Promise<void>;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentIcon(fileType: string) {
  if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType.includes('image')) return <Camera className="w-4 h-4 text-blue-500" />;
  return <FileText className="w-4 h-4 text-gray-500" />;
}

function getDocumentTypeLabel(type: string | null): string | null {
  if (!type || type === 'other') return null;
  if (type === 'booking_pdf') return 'Buchung';
  if (type === 'screenshot') return 'Screenshot';
  return type;
}

export function GuestDocumentsTab({
  documents,
  loading,
  uploading,
  onUpload,
  onDelete,
}: GuestDocumentsTabProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
      e.target.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Dokumente ({documents.length})
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
        </div>
      ) : documents.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Keine Dokumente vorhanden</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {documents.map((doc) => {
            const typeLabel = getDocumentTypeLabel(doc.document_type);

            return (
              <div
                key={doc.id}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  {getDocumentIcon(doc.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {doc.original_filename}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(doc.created_at)}</span>
                      {doc.file_size && <span>• {formatFileSize(doc.file_size)}</span>}
                      {typeLabel && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                          {typeLabel}
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-gray-600 mt-1">{doc.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={`/api/admin/guest-documents/download?id=${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Herunterladen"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(doc.id);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Löschen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Form */}
      <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
        <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
          ) : (
            <Upload className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm text-gray-600">
            {uploading ? 'Wird hochgeladen...' : 'Dokument hochladen'}
          </span>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
