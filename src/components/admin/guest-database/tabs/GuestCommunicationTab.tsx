'use client';

import { useState } from 'react';
import { MessageSquare, Phone, Mail, MessageCircle, StickyNote, Inbox, Send, Plus, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import type { Email } from '../types';

type CommunicationType = 'PHONE' | 'CHAT' | 'MAIL' | 'NOTE';

interface GuestCommunicationTabProps {
  emails: Email[];
  loading: boolean;
  onSelectEmail: (email: Email) => void;
  onCreateCommunication: (type: CommunicationType, subject: string, body: string) => Promise<void>;
  onDeleteCommunication: (emailId: number) => Promise<void>;
}

const COMM_TYPE_CONFIG: Record<CommunicationType, { label: string; placeholder: string }> = {
  PHONE: { label: 'Telefon', placeholder: 'Gesprächsnotiz...' },
  CHAT: { label: 'Chat', placeholder: 'Inhalt...' },
  MAIL: { label: 'E-Mail', placeholder: 'Inhalt...' },
  NOTE: { label: 'Notiz', placeholder: 'Notiz...' },
};

function getCommBadge(email: Email) {
  switch (email.folder) {
    case 'PHONE':
      return { bg: 'bg-teal-100 text-teal-700', icon: <Phone className="w-3 h-3" /> };
    case 'CHAT':
      return { bg: 'bg-green-100 text-green-700', icon: <MessageCircle className="w-3 h-3" /> };
    case 'MAIL':
      return { bg: 'bg-blue-100 text-blue-700', icon: <Mail className="w-3 h-3" /> };
    case 'NOTE':
      return { bg: 'bg-yellow-100 text-yellow-700', icon: <StickyNote className="w-3 h-3" /> };
    default:
      return email.is_incoming
        ? { bg: 'bg-gray-100 text-gray-600', icon: <Inbox className="w-3 h-3" /> }
        : { bg: 'bg-blue-100 text-blue-600', icon: <Send className="w-3 h-3" /> };
  }
}

export function GuestCommunicationTab({
  emails,
  loading,
  onSelectEmail,
  onCreateCommunication,
  onDeleteCommunication,
}: GuestCommunicationTabProps) {
  const [newCommType, setNewCommType] = useState<CommunicationType>('PHONE');
  const [newCommSubject, setNewCommSubject] = useState('');
  const [newCommBody, setNewCommBody] = useState('');
  const [savingComm, setSavingComm] = useState(false);

  const handleCreate = async () => {
    if (!newCommSubject.trim()) return;
    setSavingComm(true);
    try {
      await onCreateCommunication(newCommType, newCommSubject, newCommBody);
      setNewCommSubject('');
      setNewCommBody('');
    } finally {
      setSavingComm(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Kommunikation ({emails.length})
      </h4>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
        </div>
      ) : emails.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-4">Keine E-Mails</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {emails.map((email) => {
            const isManualComm = ['PHONE', 'CHAT', 'MAIL', 'NOTE'].includes(email.folder);
            const badge = getCommBadge(email);

            return (
              <div
                key={email.id}
                className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-shadow group relative ${
                  isManualComm
                    ? 'bg-teal-50 border-teal-200'
                    : email.is_incoming
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectEmail(email);
                  }}
                  className="flex-1"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${badge.bg}`}>
                      {badge.icon}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(email.date_sent)}</span>
                    {/* Delete button - only for manual communications */}
                    {isManualComm && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCommunication(email.id);
                        }}
                        className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-100 rounded transition-opacity"
                        title="Löschen"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {email.subject || '(Kein Betreff)'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Communication Form */}
      <div className="mt-3 pt-3 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 mb-2">
          <select
            value={newCommType}
            onChange={(e) => setNewCommType(e.target.value as CommunicationType)}
            className="px-2 py-1 text-xs border border-gray-200 rounded"
          >
            {Object.entries(COMM_TYPE_CONFIG).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newCommSubject}
            onChange={(e) => setNewCommSubject(e.target.value)}
            placeholder="Betreff..."
            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-teal-500"
          />
          <button
            onClick={handleCreate}
            disabled={!newCommSubject.trim() || savingComm}
            className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
          >
            {savingComm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
        {/* Body/Content field for all types */}
        <textarea
          value={newCommBody}
          onChange={(e) => setNewCommBody(e.target.value)}
          placeholder={COMM_TYPE_CONFIG[newCommType].placeholder}
          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-teal-500 resize-none"
          rows={2}
        />
      </div>
    </div>
  );
}
