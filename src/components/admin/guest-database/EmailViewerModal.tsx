'use client';

import { X, Mail } from 'lucide-react';
import type { Email } from './types';

interface EmailViewerModalProps {
  email: Email;
  onClose: () => void;
}

export function EmailViewerModal({ email, onClose }: EmailViewerModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-600" />
            <span className={`text-xs px-2 py-1 rounded ${
              email.is_incoming ? 'bg-gray-200 text-gray-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {email.is_incoming ? 'Eingehende E-Mail' : 'Gesendete E-Mail'}
            </span>
            <span className="text-xs text-gray-500">{email.folder}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Details */}
        <div className="p-4 border-b space-y-2 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {email.subject || '(Kein Betreff)'}
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              <span className="text-gray-400">Von:</span>{' '}
              <span className="font-medium">{email.from_address || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">An:</span>{' '}
              <span className="font-medium">{email.to_address || '-'}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            <span className="text-gray-400">Datum:</span>{' '}
            {email.date_sent
              ? new Date(email.date_sent).toLocaleString('de-DE', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
              : '-'}
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {email.body_html ? (
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : email.body_text ? (
            <div className="whitespace-pre-wrap text-gray-700 text-sm leading-relaxed font-mono">
              {email.body_text}
            </div>
          ) : (
            <p className="text-gray-500 italic">Kein Inhalt verfügbar</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
