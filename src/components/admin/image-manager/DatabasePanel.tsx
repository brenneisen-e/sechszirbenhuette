'use client';

import { Database, Download, FolderDown, Trash2, Loader2, HardDrive } from 'lucide-react';

interface DatabasePanelProps {
  showDbPanel: boolean;
  onToggle: () => void;
  isMigrating: boolean;
  isExportingR2: boolean;
  r2ExportProgress: number;
  r2ExportStatus: string;
  migrationResults: string[];
  onRunMigration: (action: string) => void;
  onExportR2: () => void;
}

export function DatabasePanel({
  showDbPanel,
  onToggle,
  isMigrating,
  isExportingR2,
  r2ExportProgress,
  r2ExportStatus,
  migrationResults,
  onRunMigration,
  onExportR2,
}: DatabasePanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
      <button onClick={onToggle} className="flex items-center gap-2 text-lg font-bold text-gray-900">
        <Database className="w-5 h-5" />
        Datenbank-Verwaltung
        <span className="text-sm font-normal text-gray-500">({showDbPanel ? 'ausblenden' : 'anzeigen'})</span>
      </button>

      {showDbPanel && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onRunMigration('create_images_table')}
              disabled={isMigrating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
              Tabelle erstellen
            </button>
            <button
              onClick={() => onRunMigration('migrate_from_github')}
              disabled={isMigrating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              GitHub-Import
            </button>
            <button
              onClick={onExportR2}
              disabled={isExportingR2}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isExportingR2 ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderDown className="w-4 h-4" />}
              {isExportingR2 ? `${r2ExportProgress}%` : 'R2 → GitHub Export'}
            </button>
            <button
              onClick={() => onRunMigration('delete_all_images')}
              disabled={isMigrating}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isMigrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Alle löschen
            </button>
          </div>
          {r2ExportStatus && (
            <div className="mt-3 text-sm text-purple-700 bg-purple-50 p-3 rounded-lg">
              <HardDrive className="w-4 h-4 inline-block mr-2" />
              {r2ExportStatus}
            </div>
          )}
          {migrationResults.length > 0 && (
            <div className="bg-gray-100 rounded-lg p-4 max-h-60 overflow-y-auto">
              {migrationResults.map((result, i) => (
                <p
                  key={i}
                  className={`text-sm font-mono ${result.startsWith('✓') ? 'text-green-600' : result.startsWith('❌') ? 'text-red-600' : 'text-gray-700'}`}
                >
                  {result}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
