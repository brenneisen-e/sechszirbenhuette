'use client';

import {
  Upload,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  RefreshCw,
  Tags,
  FolderDown,
  Cog,
} from 'lucide-react';
import { useMediaManager } from './media-manager/useMediaManager';
import { groupedCategories, CATEGORIES } from './media-manager/constants';
import MediaGrid from './media-manager/MediaGrid';
import CategoryEditModal from './media-manager/CategoryEditModal';
import HeroVideoQualityModal from './media-manager/HeroVideoQualityModal';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function MediaManager() {
  const {
    // State
    media,
    loading,
    error,
    success,
    selectedCategory,
    isUploading,
    uploadProgress,
    editingId,
    editValues,
    draggedItem,
    editingCategoriesId,
    editingCategories,
    isCleaningDuplicates,
    bulkAssignMode,
    bulkCategory,
    bulkSelectedIds,
    isSavingBulk,
    isImporting,
    importResults,
    conversionProgress,
    heroVideoFile,
    heroQualityModalOpen,
    // Setters
    setSelectedCategory,
    setEditValues,
    setEditingId,
    setEditingCategoriesId,
    setHeroQualityModalOpen,
    setHeroVideoFile,
    // Handlers
    loadMedia,
    runGitHubImport,
    handleFileUpload,
    handleDelete,
    handleEdit,
    handleSaveEdit,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleMoveUp,
    handleMoveDown,
    getMediaByCategory,
    handleEditCategories,
    toggleCategory,
    handleSaveCategories,
    handleRemoveDuplicates,
    toggleBulkMode,
    handleBulkCategoryChange,
    toggleBulkItem,
    selectAllBulk,
    deselectAllBulk,
    saveBulkAssignment,
    uploadHeroVideo,
    uploadHeroVideoAutoDetect,
  } = useMediaManager();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-logo-green" />
        <span className="ml-3 text-gray-600">Lade Bilderverwaltung...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Bilderverwaltung</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleBulkMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition ${
                bulkAssignMode
                  ? 'bg-logo-green text-white'
                  : 'text-logo-green hover:bg-logo-green/10'
              }`}
              title="Kategorie zuweisen"
            >
              <Tags className="w-4 h-4" />
              <span>{bulkAssignMode ? 'Beenden' : 'Kategorie zuweisen'}</span>
            </button>
            <button
              onClick={runGitHubImport}
              disabled={isImporting || bulkAssignMode}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              title="Bilder aus GitHub importieren"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FolderDown className="w-4 h-4" />
              )}
              <span className="text-sm">GitHub-Import</span>
            </button>
            <button
              onClick={handleRemoveDuplicates}
              disabled={isCleaningDuplicates || bulkAssignMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
              title="Duplikate entfernen"
            >
              {isCleaningDuplicates ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Duplikate entfernen</span>
            </button>
            <button
              onClick={loadMedia}
              className="p-2 text-gray-500 hover:text-logo-green transition"
              title="Aktualisieren"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bulk Category Assignment Mode */}
        {bulkAssignMode && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-blue-800 mb-1">Kategorie auswählen:</label>
                <select
                  value={bulkCategory}
                  onChange={(e) => handleBulkCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green bg-white"
                >
                  <option value="">Kategorie wählen...</option>
                  {Object.entries(groupedCategories).map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {bulkCategory && (
                <>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllBulk}
                      className="px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition"
                    >
                      Alle auswählen
                    </button>
                    <button
                      onClick={deselectAllBulk}
                      className="px-3 py-2 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition"
                    >
                      Alle abwählen
                    </button>
                  </div>
                  <div className="text-sm text-blue-700">
                    {bulkSelectedIds.size} von {media.length} ausgewählt
                  </div>
                  <button
                    onClick={saveBulkAssignment}
                    disabled={isSavingBulk}
                    className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
                  >
                    {isSavingBulk ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Speichern
                  </button>
                </>
              )}
            </div>
            {bulkCategory && (
              <p className="mt-2 text-sm text-blue-600">
                Klicken Sie auf die Bilder, um sie der Kategorie &quot;{CATEGORIES.find(c => c.value === bulkCategory)?.label}&quot; hinzuzufügen oder zu entfernen.
              </p>
            )}
          </div>
        )}

        {/* Import Results */}
        {importResults.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            <p className="font-medium mb-2">Import-Ergebnis:</p>
            <ul className="text-sm space-y-1">
              {importResults.map((result, i) => (
                <li key={i}>{result}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        {/* Upload Section */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
            >
              <option value="">Kategorie wählen...</option>
              {Object.entries(groupedCategories).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Dateien hochladen</label>
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg cursor-pointer hover:bg-logo-green/90 transition">
              <Upload className="w-5 h-5" />
              <span>Dateien auswählen</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUploading || !selectedCategory}
              />
            </label>
            {/* Info for hero video uploads */}
            {selectedCategory === 'hero' && (
              <p className="mt-2 text-xs text-gray-500">
                Nach dem Upload wählst du die Qualität (720p, 480p, 360p)
              </p>
            )}
          </div>

          {(isUploading || conversionProgress) && (
            <div className="flex items-center gap-2 text-gray-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              {conversionProgress ? (
                <div className="flex flex-col">
                  <span className="flex items-center gap-1">
                    <Cog className="w-4 h-4" />
                    {conversionProgress.message}
                  </span>
                  {conversionProgress.percent !== undefined && (
                    <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1">
                      <div
                        className="h-full bg-logo-green rounded-full transition-all"
                        style={{ width: `${conversionProgress.percent}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <span>Upload: {uploadProgress}%</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Media Grid by Category */}
      <MediaGrid
        media={media}
        draggedItem={draggedItem}
        bulkAssignMode={bulkAssignMode}
        bulkCategory={bulkCategory}
        bulkSelectedIds={bulkSelectedIds}
        editingId={editingId}
        editValues={editValues}
        getMediaByCategory={getMediaByCategory}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onToggleBulkItem={toggleBulkItem}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onEdit={handleEdit}
        onEditCategories={handleEditCategories}
        onDelete={handleDelete}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setEditingId(null)}
        onEditValuesChange={setEditValues}
      />

      {/* Category Edit Modal */}
      {editingCategoriesId && (
        <CategoryEditModal
          editingCategories={editingCategories}
          onToggleCategory={toggleCategory}
          onSave={handleSaveCategories}
          onClose={() => setEditingCategoriesId(null)}
        />
      )}

      {/* Hero Video Quality Selection Modal */}
      {heroQualityModalOpen && heroVideoFile && (
        <HeroVideoQualityModal
          heroVideoFile={heroVideoFile}
          onUploadQuality={uploadHeroVideo}
          onAutoDetect={uploadHeroVideoAutoDetect}
          onClose={() => {
            setHeroQualityModalOpen(false);
            setHeroVideoFile(null);
          }}
        />
      )}
    </div>
  );
}
