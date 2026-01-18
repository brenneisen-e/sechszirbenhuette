'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Loader2,
  ImageIcon,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
  User,
  ExternalLink,
  AlertCircle,
  Check,
  Database,
} from 'lucide-react';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  layout: 'standard' | 'carousel';
  status: 'draft' | 'published';
  author: string;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogPostImage {
  id?: string;
  image_url: string;
  image_alt: string | null;
  caption: string | null;
  display_order: number;
}

interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  title: string;
}

type EditorTab = 'list' | 'edit' | 'preview';

export default function BlogEditor() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [settingUpDb, setSettingUpDb] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('list');
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const [postImages, setPostImages] = useState<BlogPostImage[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'cover' | 'gallery' | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog');
      const data = await res.json() as { posts: BlogPost[] };
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error loading posts:', err);
      setError('Fehler beim Laden der Beiträge');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load available media
  const loadMedia = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json() as { media: MediaItem[] };
      setAvailableMedia(data.media || []);
    } catch (err) {
      console.error('Error loading media:', err);
    }
  }, []);

  useEffect(() => {
    loadPosts();
    loadMedia();
  }, [loadPosts, loadMedia]);

  // Setup blog database tables
  const handleSetupBlogDb = async () => {
    setSettingUpDb(true);
    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate_blog_tables' }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success) {
        setSuccess(data.message || 'Blog-Datenbank eingerichtet!');
        await loadPosts();
      } else {
        setError(data.error || 'Einrichtung fehlgeschlagen');
      }
    } catch (err) {
      console.error('Error setting up blog db:', err);
      setError('Fehler bei der Datenbank-Einrichtung');
    } finally {
      setSettingUpDb(false);
    }
  };

  // Migrate static blog articles
  const handleMigrateBlog = async () => {
    setMigrating(true);
    try {
      const res = await fetch('/api/admin/migrate-blog', { method: 'POST' });
      const data = await res.json() as { success?: boolean; message?: string; error?: string };
      if (res.ok && data.success) {
        setSuccess(data.message || 'Blog-Artikel migriert!');
        await loadPosts();
      } else {
        setError(data.error || 'Migration fehlgeschlagen');
      }
    } catch (err) {
      console.error('Error migrating blog:', err);
      setError('Fehler bei der Migration');
    } finally {
      setMigrating(false);
    }
  };

  // Clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Create new post
  const handleNewPost = () => {
    setCurrentPost({
      title: '',
      subtitle: '',
      excerpt: '',
      content: '',
      cover_image_url: null,
      cover_image_alt: null,
      layout: 'standard',
      status: 'draft',
      author: 'Sechszirbenhütte',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
    });
    setPostImages([]);
    setActiveTab('edit');
  };

  // Edit existing post
  const handleEditPost = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/blog?slug=${post.slug}&images=true`);
      const data = await res.json() as { post: BlogPost; images: BlogPostImage[] };
      setCurrentPost(data.post);
      setPostImages(data.images || []);
      setActiveTab('edit');
    } catch (err) {
      console.error('Error loading post:', err);
      setError('Fehler beim Laden des Beitrags');
    }
  };

  // Save post
  const handleSave = async (publish = false) => {
    if (!currentPost?.title || !currentPost?.content) {
      setError('Titel und Inhalt sind erforderlich');
      return;
    }

    setSaving(true);
    try {
      const postData = {
        ...currentPost,
        status: publish ? 'published' : currentPost.status,
        images: postImages,
      };

      const method = currentPost.id ? 'PUT' : 'POST';
      const res = await fetch('/api/blog', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      const data = await res.json() as { success?: boolean; error?: string; id?: string; slug?: string };

      if (res.ok && data.success) {
        setSuccess(publish ? 'Beitrag veröffentlicht!' : 'Beitrag gespeichert!');
        if (!currentPost.id && data.id) {
          setCurrentPost(prev => ({ ...prev, id: data.id, slug: data.slug }));
        }
        await loadPosts();
      } else {
        setError(data.error || 'Fehler beim Speichern');
      }
    } catch (err) {
      console.error('Error saving post:', err);
      setError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Delete post
  const handleDelete = async (postId: string) => {
    if (!confirm('Beitrag wirklich löschen?')) return;

    try {
      const res = await fetch(`/api/blog?id=${postId}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Beitrag gelöscht');
        await loadPosts();
        if (currentPost?.id === postId) {
          setCurrentPost(null);
          setActiveTab('list');
        }
      } else {
        setError('Fehler beim Löschen');
      }
    } catch (err) {
      console.error('Error deleting post:', err);
      setError('Fehler beim Löschen');
    }
  };

  // Add image to gallery
  const addImageToGallery = (media: MediaItem) => {
    setPostImages(prev => [
      ...prev,
      {
        image_url: media.url,
        image_alt: media.alt_text,
        caption: null,
        display_order: prev.length,
      },
    ]);
    setShowMediaPicker(false);
  };

  // Remove image from gallery
  const removeImageFromGallery = (index: number) => {
    setPostImages(prev => prev.filter((_, i) => i !== index));
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">Noch keine Blog-Beiträge</p>
                <p className="text-sm">Erstellen Sie Ihren ersten Beitrag</p>
              </div>
            ) : (
              posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                >
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                    {post.cover_image_url ? (
                      <Image
                        src={post.cover_image_url}
                        alt={post.cover_image_alt || ''}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          post.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {post.status === 'published' ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-gray-500 truncate">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.published_at || post.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        {post.layout === 'carousel' ? (
                          <LayoutGrid className="w-3 h-3" />
                        ) : (
                          <List className="w-3 h-3" />
                        )}
                        {post.layout === 'carousel' ? 'Karussell' : 'Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {post.status === 'published' && (
                      <a
                        href={`/blog/${post.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-logo-green transition"
                        title="Ansehen"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleEditPost(post)}
                      className="p-2 text-gray-500 hover:text-logo-green transition"
                      title="Bearbeiten"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-2 text-gray-500 hover:text-red-600 transition"
                      title="Löschen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Editor */}
        {(activeTab === 'edit' || activeTab === 'preview') && currentPost && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Edit Form */}
            <div className={activeTab === 'preview' ? 'hidden lg:block' : ''}>
              <div className="space-y-6">
                {/* Layout Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPost(prev => ({ ...prev, layout: 'standard' }))}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                        currentPost.layout === 'standard'
                          ? 'border-logo-green bg-logo-green/10 text-logo-green'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <List className="w-5 h-5" />
                      Standard
                    </button>
                    <button
                      onClick={() => setCurrentPost(prev => ({ ...prev, layout: 'carousel' }))}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                        currentPost.layout === 'carousel'
                          ? 'border-logo-green bg-logo-green/10 text-logo-green'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <LayoutGrid className="w-5 h-5" />
                      Karussell
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                  <input
                    type="text"
                    value={currentPost.title || ''}
                    onChange={(e) => setCurrentPost(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                    placeholder="Beitragstitel"
                  />
                </div>

                {/* Subtitle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Untertitel</label>
                  <input
                    type="text"
                    value={currentPost.subtitle || ''}
                    onChange={(e) => setCurrentPost(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                    placeholder="Optionaler Untertitel"
                  />
                </div>

                {/* Excerpt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kurzbeschreibung</label>
                  <textarea
                    value={currentPost.excerpt || ''}
                    onChange={(e) => setCurrentPost(prev => ({ ...prev, excerpt: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                    placeholder="Kurze Beschreibung für die Übersicht"
                  />
                </div>

                {/* Cover Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Titelbild</label>
                  {currentPost.cover_image_url ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={currentPost.cover_image_url}
                        alt={currentPost.cover_image_alt || ''}
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => setCurrentPost(prev => ({ ...prev, cover_image_url: null, cover_image_alt: null }))}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setMediaPickerTarget('cover');
                        setShowMediaPicker(true);
                      }}
                      className="w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-logo-green hover:text-logo-green transition"
                    >
                      <Upload className="w-8 h-8 mb-2" />
                      <span>Bild auswählen</span>
                    </button>
                  )}
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inhalt * (HTML)</label>
                  <textarea
                    value={currentPost.content || ''}
                    onChange={(e) => setCurrentPost(prev => ({ ...prev, content: e.target.value }))}
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green font-mono text-sm"
                    placeholder="<p>Ihr Beitragstext...</p>"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unterstützt HTML-Tags wie &lt;p&gt;, &lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, etc.
                  </p>
                </div>

                {/* Gallery Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Galerie-Bilder ({postImages.length})
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {postImages.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={img.image_url}
                          alt={img.image_alt || ''}
                          fill
                          className="object-cover"
                        />
                        <button
                          onClick={() => removeImageFromGallery(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        setMediaPickerTarget('gallery');
                        setShowMediaPicker(true);
                      }}
                      className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:border-logo-green hover:text-logo-green transition"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* SEO Fields */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">SEO-Einstellungen</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meta-Titel</label>
                      <input
                        type="text"
                        value={currentPost.meta_title || ''}
                        onChange={(e) => setCurrentPost(prev => ({ ...prev, meta_title: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                        placeholder="Standard: Beitragstitel"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meta-Beschreibung</label>
                      <textarea
                        value={currentPost.meta_description || ''}
                        onChange={(e) => setCurrentPost(prev => ({ ...prev, meta_description: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-logo-green focus:border-logo-green"
                        placeholder="Beschreibung für Suchmaschinen"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Als Entwurf speichern
                  </button>
                  <button
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-logo-green text-white rounded-lg hover:bg-logo-green/90 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                    Veröffentlichen
                  </button>
                  <button
                    onClick={() => setActiveTab(activeTab === 'preview' ? 'edit' : 'preview')}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition lg:hidden"
                  >
                    {activeTab === 'preview' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {activeTab === 'preview' ? 'Bearbeiten' : 'Vorschau'}
                  </button>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className={`bg-gray-50 rounded-xl p-6 ${activeTab === 'edit' ? 'hidden lg:block' : ''}`}>
              <h3 className="text-sm font-medium text-gray-500 mb-4">Live-Vorschau</h3>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Cover */}
                {currentPost.cover_image_url && (
                  <div className="relative aspect-video">
                    <Image
                      src={currentPost.cover_image_url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-6">
                  {/* Title */}
                  <h1
                    className="text-2xl text-logo-green mb-2"
                    style={{ fontFamily: 'FeelingPassionate, cursive' }}
                  >
                    {currentPost.title || 'Beitragstitel'}
                  </h1>

                  {/* Subtitle */}
                  {currentPost.subtitle && (
                    <p className="text-lg text-logo-green/80 font-medium mb-3">
                      {currentPost.subtitle}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-gray-400 text-xs mb-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {currentPost.author || 'Sechszirbenhütte'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date().toLocaleDateString('de-DE')}
                    </span>
                  </div>

                  {/* Carousel Preview */}
                  {currentPost.layout === 'carousel' && postImages.length > 0 && (
                    <div className="relative mb-4">
                      <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                        <Image
                          src={postImages[previewImageIndex]?.image_url || ''}
                          alt=""
                          fill
                          className="object-cover"
                        />
                      </div>
                      {postImages.length > 1 && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2">
                          <button
                            onClick={() => setPreviewImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length)}
                            className="p-1 bg-white/80 rounded-full"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPreviewImageIndex((prev) => (prev + 1) % postImages.length)}
                            className="p-1 bg-white/80 rounded-full"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: currentPost.content || '<p class="text-gray-400">Ihr Inhalt erscheint hier...</p>' }}
                  />

                  {/* Standard Layout Images */}
                  {currentPost.layout === 'standard' && postImages.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {postImages.slice(0, 4).map((img, index) => (
                        <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                          <Image src={img.image_url} alt="" fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Bild auswählen</h3>
              <button onClick={() => setShowMediaPicker(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {availableMedia.filter(m => m.url).map((media) => (
                  <button
                    key={media.id}
                    onClick={() => {
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
                    }}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-logo-green transition"
                  >
                    <Image
                      src={media.url}
                      alt={media.alt_text || ''}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {availableMedia.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  Keine Bilder verfügbar. Laden Sie zuerst Bilder in der Bilderverwaltung hoch.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
