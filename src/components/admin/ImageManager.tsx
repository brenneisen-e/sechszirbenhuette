'use client';

import { ImageManagerProps, CATEGORIES } from './image-manager';
import { useImageManager } from './image-manager/useImageManager';
import { DatabasePanel } from './image-manager/DatabasePanel';
import { SeasonPanel } from './image-manager/SeasonPanel';
import { UploadArea } from './image-manager/UploadArea';
import { Gallery } from './image-manager/Gallery';
import { EditImageModal } from './image-manager/EditImageModal';
import { SeasonImageReplaceModal } from './image-manager/SeasonImageReplaceModal';
import { DuplicatesModal } from './image-manager/DuplicatesModal';

export function ImageManager({ adminPassword }: ImageManagerProps) {
  const {
    error,
    setError,
    images,
    loading,
    uploadFiles,
    isDragging,
    isUploading,
    isCheckingDuplicates,
    duplicateGroups,
    showDuplicates,
    setShowDuplicates,
    selectedForDeletion,
    selectedCategory,
    showHeroOnly,
    migrationResults,
    isMigrating,
    showDbPanel,
    setShowDbPanel,
    editingImage,
    editAltText,
    setEditAltText,
    editCategory,
    setEditCategory,
    editDisplayOrder,
    setEditDisplayOrder,
    isSaving,
    isDownloading,
    downloadProgress,
    showSeasonPanel,
    setShowSeasonPanel,
    summerImages,
    winterImages,
    replacingSeasonImage,
    setReplacingSeasonImage,
    isReplacingImage,
    isExportingR2,
    r2ExportProgress,
    r2ExportStatus,
    pendingCount,
    doneCount,
    errorCount,
    loadImages,
    handleCategoryFilter,
    handleHeroFilter,
    loadSeasonImages,
    handleSeasonImageReplace,
    downloadAllPhotos,
    exportR2ToGitHub,
    findDuplicatesInGallery,
    toggleDeletionSelection,
    selectAllDuplicatesExceptFirst,
    deleteSelectedDuplicates,
    handleFilesSelected,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    removeFile,
    updateFileStatus,
    uploadAllFiles,
    clearCompleted,
    handleDelete,
    toggleHero,
    openEditModal,
    closeEditModal,
    saveImageChanges,
    moveImageUp,
    moveImageDown,
    runMigration,
  } = useImageManager(adminPassword);

  return (
    <>
      <DatabasePanel
        showDbPanel={showDbPanel}
        onToggle={() => setShowDbPanel(!showDbPanel)}
        isMigrating={isMigrating}
        isExportingR2={isExportingR2}
        r2ExportProgress={r2ExportProgress}
        r2ExportStatus={r2ExportStatus}
        migrationResults={migrationResults}
        onRunMigration={runMigration}
        onExportR2={exportR2ToGitHub}
      />

      <SeasonPanel
        showSeasonPanel={showSeasonPanel}
        onToggle={() => {
          setShowSeasonPanel(!showSeasonPanel);
          if (!showSeasonPanel) loadSeasonImages();
        }}
        summerImages={summerImages}
        winterImages={winterImages}
        onSetReplacingSeasonImage={setReplacingSeasonImage}
      />

      <UploadArea
        uploadFiles={uploadFiles}
        isDragging={isDragging}
        isUploading={isUploading}
        pendingCount={pendingCount}
        doneCount={doneCount}
        errorCount={errorCount}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFilesSelected={handleFilesSelected}
        onUploadAll={uploadAllFiles}
        onRemoveFile={removeFile}
        onUpdateFileStatus={updateFileStatus}
        onClearCompleted={clearCompleted}
      />

      <Gallery
        images={images}
        loading={loading}
        error={error}
        selectedCategory={selectedCategory}
        showHeroOnly={showHeroOnly}
        isDownloading={isDownloading}
        downloadProgress={downloadProgress}
        isCheckingDuplicates={isCheckingDuplicates}
        onClearError={() => setError('')}
        onRefresh={() => loadImages()}
        onDownloadAll={downloadAllPhotos}
        onFindDuplicates={findDuplicatesInGallery}
        onCategoryFilter={handleCategoryFilter}
        onHeroFilter={handleHeroFilter}
        onToggleHero={toggleHero}
        onOpenEditModal={openEditModal}
        onMoveUp={moveImageUp}
        onMoveDown={moveImageDown}
        onDelete={handleDelete}
      />

      {/* Modals */}
      {showDuplicates && duplicateGroups.length > 0 && (
        <DuplicatesModal
          groups={duplicateGroups}
          selectedForDeletion={selectedForDeletion}
          isDeleting={isUploading}
          onToggleSelection={toggleDeletionSelection}
          onSelectAllExceptFirst={selectAllDuplicatesExceptFirst}
          onDeleteSelected={deleteSelectedDuplicates}
          onClose={() => setShowDuplicates(false)}
        />
      )}

      {replacingSeasonImage && (
        <SeasonImageReplaceModal
          replacement={replacingSeasonImage}
          isReplacing={isReplacingImage}
          onReplace={handleSeasonImageReplace}
          onClose={() => setReplacingSeasonImage(null)}
        />
      )}

      {editingImage && (
        <EditImageModal
          image={editingImage}
          categories={CATEGORIES}
          altText={editAltText}
          category={editCategory}
          displayOrder={editDisplayOrder}
          isSaving={isSaving}
          onAltTextChange={setEditAltText}
          onCategoryChange={setEditCategory}
          onDisplayOrderChange={setEditDisplayOrder}
          onSave={saveImageChanges}
          onClose={closeEditModal}
        />
      )}
    </>
  );
}
