'use client';

import { useState, useRef } from 'react';
import { Loader2, Upload, FileText } from 'lucide-react';
import { PDFViewer } from './PDFViewer';
import type { GuestDocument } from '../types';

interface DocumentFromAdditionalCosts {
  r2_key: string;
  filename: string;
  type: string;
  uploaded_at?: string;
}

interface BookingDocumentsProps {
  document: DocumentFromAdditionalCosts | null;
  bookingDocuments: GuestDocument[];
  onUploadDocument?: (file: File) => Promise<void>;
}

export function BookingDocuments({ document, bookingDocuments, onUploadDocument }: BookingDocumentsProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<GuestDocument | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-500 uppercase">Dokumente</div>
        {onUploadDocument && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file && onUploadDocument) {
                  setIsUploading(true);
                  try {
                    await onUploadDocument(file);
                  } finally {
                    setIsUploading(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              PDF hinzufügen
            </button>
          </>
        )}
      </div>
      {/* Dokument aus additional_costs (FeWo Import) */}
      {document && (
        <button
          onClick={() => setShowPdfViewer(true)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm w-full text-left"
        >
          <FileText className="w-4 h-4" />
          {document.filename}
        </button>
      )}
      {/* Dokumente aus guest_documents Tabelle */}
      {bookingDocuments.map((doc) => (
        <button
          key={doc.id}
          onClick={() => setViewingDocument(doc)}
          className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors text-sm w-full text-left"
        >
          <FileText className="w-4 h-4" />
          {doc.original_filename}
        </button>
      ))}
      {!document && bookingDocuments.length === 0 && (
        <div className="text-xs text-gray-400 italic">Keine Dokumente vorhanden</div>
      )}

      {/* PDF Viewer Popup für additional_costs Dokument */}
      {showPdfViewer && document && (
        <PDFViewer
          url={`/api/admin/guest-documents/download?key=${encodeURIComponent(document.r2_key)}`}
          filename={document.filename}
          onClose={() => setShowPdfViewer(false)}
        />
      )}
      {/* PDF Viewer Popup für guest_documents */}
      {viewingDocument && (
        <PDFViewer
          url={`/api/admin/guest-documents/download?key=${encodeURIComponent(viewingDocument.r2_key)}`}
          filename={viewingDocument.original_filename}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
}
