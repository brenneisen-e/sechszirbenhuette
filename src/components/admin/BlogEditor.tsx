'use client';

import {
  Plus,
  X,
  Loader2,
  RefreshCw,
  Database,
  Upload,
  AlertCircle,
  Check,
} from 'lucide-react';
import {
  useBlogEditor,
  BlogPostList,
  BlogEditorForm,
  BlogPreview,
  MediaPickerModal,
} from './blog-editor';
import type { MediaItem } from './blog-editor';

export default function BlogEditor() {
  const {
    posts,
    loading,
    saving,
    migrating,
    settingUpDb,
    error,
    success,
    activeTab,
    currentPost,
    postImages,
    availableMedia,
    showMediaPicker,
    mediaPickerTarget,
    previewImageIndex,
    setActiveTab,
    setCurrentPost,
    setShowMediaPicker,
    setMediaPickerTarget,
    setPreviewImageIndex,
    loadPosts,
    handleSetupBlogDb,
    handleMigrateBlog,
    handleNewPost,
    handleEditPost,
    handleSave,
    handleDelete,
    addImageToGallery,
    removeImageFromGallery,
  } = useBlogEditor();

  const handleMediaSelect = (media: MediaItem) => {
    if (mediaPickerTarget === 'cover') {
      setCurrentPost(prev => ({
        ...prev,
        cover_image_url: media.url,
        cover_image_alt: media.alt_text,
      }));
      setShowMediaPicker(false);
    } else if (mediaPickerTarget === 'gallery') {
      addImageToGallery(media);
    }
  };

  const handleOpenMediaPicker = (target: 'cover' | 'gallery') => {
    setMediaPickerTarget(target);
    setShowMediaPicker(true);
  };

  const handleTogglePreview = () => {
    setActiveTab(activeTab === 'preview' ? 'edit' : 'preview');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-logo-green" />
        <span className="ml-3 text-gray-600">Lade Blog-Verwaltung...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Blog-Verwaltung</h2>
          <div className="flex items-center gap-2">
            {activeTab !== 'list' && (
              <button
                onClick={() => {
                  setActiveTab('list');
                  setCurrentPost(null);
                }}
                className="px-3 py-2 text-gray-600 hover:text-gray-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {activeTab === 'list' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPosts()}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  title="Beiträge neu laden"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleSetupBlogDb}
                  disabled={settingUpDb}
                  className="flex items-center gap-2 px-3 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                  title="Blog-Datenbank einrichten (D1 Tabellen erstellen)"
                >
                  {settingUpDb ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span className="hidden sm:inline">DB einrichten</span>
                </button>
                <button
                  onClick={handleMigrateBlog}
                  disabled={migrating}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                  title="Statische Blog-Artikel in Datenbank migrieren"
                >
                  {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span className="hidden sm:inline">Artikel importieren</span>
                </button>
                <button
                  onClick={handleNewPost}
                  className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition"
                >
                  <Plus className="w-5 h-5" />
                  Neuer Beitrag
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Post List */}
        {activeTab === 'list' && (
          <BlogPostList
            posts={posts}
            onEdit={handleEditPost}
            onDelete={handleDelete}
          />
        )}

        {/* Editor + Preview */}
        {(activeTab === 'edit' || activeTab === 'preview') && currentPost && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlogEditorForm
              currentPost={currentPost}
              postImages={postImages}
              saving={saving}
              activeTab={activeTab}
              onUpdatePost={(updates) => setCurrentPost(prev => ({ ...prev, ...updates }))}
              onRemoveImage={removeImageFromGallery}
              onOpenMediaPicker={handleOpenMediaPicker}
              onSave={handleSave}
              onTogglePreview={handleTogglePreview}
            />
            <BlogPreview
              currentPost={currentPost}
              postImages={postImages}
              activeTab={activeTab}
              previewImageIndex={previewImageIndex}
              onChangePreviewImage={setPreviewImageIndex}
            />
          </div>
        )}
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPickerModal
          availableMedia={availableMedia}
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
