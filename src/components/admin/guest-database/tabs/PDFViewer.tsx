'use client';

import { X, FileText } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  filename: string;
  onClose: () => void;
}

export function PDFViewer({ url, filename, onClose }: PDFViewerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-gray-900">{filename}</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              In neuem Tab öffnen
            </a>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100">
          <iframe
            src={url}
            className="w-full h-full border-0"
            title={filename}
          />
        </div>
      </div>
    </div>
  );
}
