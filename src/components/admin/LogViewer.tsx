'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ScrollText,
  Trash2,
} from 'lucide-react';

interface LogEntry {
  id: number;
  level: string;
  source: string;
  action: string | null;
  message: string;
  details: string | null;
  created_at: string;
}

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterLevel, setFilterLevel] = useState<string>('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (filterSource) params.set('source', filterSource);
      if (filterLevel) params.set('level', filterLevel);
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = (await res.json()) as { logs?: LogEntry[] };
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [filterSource, filterLevel]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const clearLogs = async () => {
    if (!confirm('Alle Logs löschen?')) return;
    await fetch('/api/admin/logs', { method: 'DELETE' });
    loadLogs();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('de-AT', {
      timeZone: 'Europe/Vienna',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const levelColor = (level: string) => {
    if (level === 'error') return 'bg-red-100 text-red-700';
    if (level === 'warn') return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  const sourceColor = (source: string) => {
    if (source === 'email') return 'bg-purple-100 text-purple-700';
    if (source === 'guest') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">App-Logs</h3>
          <span className="text-xs text-gray-400">({logs.length})</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="">Alle Quellen</option>
            <option value="guest">Guest</option>
            <option value="email">Email</option>
          </select>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1"
          >
            <option value="">Alle Level</option>
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
          </select>
          <button
            onClick={loadLogs}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            title="Aktualisieren"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={clearLogs}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded"
            title="Alle Logs löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {logs.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Keine Logs vorhanden. Logs werden bei Gästeapp-Aktionen (Bestellungen, E-Mails)
          geschrieben.
        </div>
      )}

      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
          >
            <button
              onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left"
            >
              {(() => {
                if (!log.details) return <span className="w-3.5 flex-shrink-0" />;
                if (expandedId === log.id)
                  return <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
                return <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />;
              })()}
              {log.level === 'error' && (
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              )}
              <span className="text-xs text-gray-400 flex-shrink-0 font-mono">
                {formatTime(log.created_at)}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${levelColor(log.level)}`}
              >
                {log.level.toUpperCase()}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${sourceColor(log.source)}`}
              >
                {log.source}
              </span>
              {log.action && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 font-medium flex-shrink-0">
                  {log.action}
                </span>
              )}
              <span className="text-sm text-gray-700 truncate">{log.message}</span>
            </button>
            {expandedId === log.id && log.details && (
              <div className="px-3 pb-2 ml-8">
                <pre className="text-xs bg-gray-50 rounded p-2 overflow-x-auto text-gray-600 whitespace-pre-wrap">
                  {log.details}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
