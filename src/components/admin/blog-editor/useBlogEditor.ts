import React, { useState, useEffect, useCallback } from 'react';
import type { BlogPost, BlogPostImage, MediaItem, EditorTab } from './types';

interface UseBlogEditorReturn {
  posts: BlogPost[];
  loading: boolean;
  saving: boolean;
  settingUpDb: boolean;
  error: string;
  success: string;
  activeTab: EditorTab;
  currentPost: Partial<BlogPost> | null;
  postImages: BlogPostImage[];
  availableMedia: MediaItem[];
  showMediaPicker: boolean;
  mediaPickerTarget: 'cover' | 'gallery' | number | null;
  previewImageIndex: number;
  setActiveTab: (tab: EditorTab) => void;
  setCurrentPost: React.Dispatch<React.SetStateAction<Partial<BlogPost> | null>>;
  setPostImages: React.Dispatch<React.SetStateAction<BlogPostImage[]>>;
  setShowMediaPicker: (show: boolean) => void;
  setMediaPickerTarget: (target: 'cover' | 'gallery' | number | null) => void;
  setPreviewImageIndex: React.Dispatch<React.SetStateAction<number>>;
  loadPosts: () => Promise<void>;
  loadMedia: () => Promise<void>;
  handleSetupBlogDb: () => Promise<void>;
  handleNewPost: () => void;
  handleEditPost: (post: BlogPost) => Promise<void>;
  handleSave: (publish?: boolean) => Promise<void>;
  handleDelete: (postId: string) => Promise<void>;
  addImageToGallery: (media: MediaItem) => void;
  removeImageFromGallery: (index: number) => void;
  updateImageInGallery: (index: number, updates: Partial<BlogPostImage>) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
}

export function useBlogEditor(): UseBlogEditorReturn {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingUpDb, setSettingUpDb] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<EditorTab>('list');
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost> | null>(null);
  const [postImages, setPostImages] = useState<BlogPostImage[]>([]);
  const [availableMedia, setAvailableMedia] = useState<MediaItem[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState<'cover' | 'gallery' | number | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  // Load posts
  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      // Add cache buster to avoid stale cached results
      const res = await fetch(`/api/blog?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json() as { posts?: BlogPost[]; error?: string };
      console.log('[BlogEditor] Loaded posts:', data);
      if (data.error) {
        setError(data.error);
        setPosts([]);
      } else {
        setPosts(data.posts || []);
      }
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
      const data = await res.json() as { media: (MediaItem & { media_type?: string; category?: string })[] };
      const HERO_CATS = new Set(['hero', 'hero-thumbnail', 'hero-1080p', 'hero-720p', 'hero-480p', 'hero-360p']);
      // Filter out videos and hero images
      const images = (data.media || []).filter(m =>
        m.media_type !== 'video' && !HERO_CATS.has(m.category || '')
      );
      setAvailableMedia(images);
    } catch (err) {
      console.error('Error loading media:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const [postsRes, mediaRes] = await Promise.all([
          fetch(`/api/blog?_t=${Date.now()}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }),
          fetch('/api/admin/media'),
        ]);
        if (cancelled) return;

        const postsData = await postsRes.json() as { posts?: BlogPost[]; error?: string };
        const mediaData = await mediaRes.json() as { media: (MediaItem & { media_type?: string; category?: string })[] };

        if (cancelled) return;

        if (postsData.error) {
          setError(postsData.error);
          setPosts([]);
        } else {
          setPosts(postsData.posts || []);
        }

        const HERO_CATS = new Set(['hero', 'hero-thumbnail', 'hero-1080p', 'hero-720p', 'hero-480p', 'hero-360p']);
        const images = (mediaData.media || []).filter(m =>
          m.media_type !== 'video' && !HERO_CATS.has(m.category || '')
        );
        setAvailableMedia(images);
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading blog data:', err);
          setError('Fehler beim Laden der Beiträge');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
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
    if (!currentPost?.title) {
      setError('Titel ist erforderlich');
      return;
    }
    if (currentPost.layout === 'standard' && !currentPost.content) {
      setError('Inhalt ist erforderlich');
      return;
    }
    if (currentPost.layout === 'carousel' && postImages.length === 0) {
      setError('Mindestens eine Karussell-Einheit ist erforderlich');
      return;
    }
    if (currentPost.layout === 'tabs') {
      try {
        const tabsData = JSON.parse(currentPost.content || '{}');
        if (!tabsData.tabs || tabsData.tabs.length === 0) {
          setError('Mindestens ein Tab ist erforderlich');
          return;
        }
      } catch {
        setError('Tab-Daten sind ungültig');
        return;
      }
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
      const res = await fetch('/api/admin/blog-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: postId }),
      });
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

  // Update image properties (for carousel slides)
  const updateImageInGallery = (index: number, updates: Partial<BlogPostImage>) => {
    setPostImages(prev => prev.map((img, i) => i === index ? { ...img, ...updates } : img));
  };

  // Reorder images (for carousel slides)
  const reorderImages = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= postImages.length) return;
    setPostImages(prev => {
      const updated = [...prev];
      const moved = updated.splice(fromIndex, 1)[0];
      if (!moved) return updated;
      updated.splice(toIndex, 0, moved);
      return updated.map((img, i) => ({ ...img, display_order: i }));
    });
  };

  return {
    posts,
    loading,
    saving,
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
    setPostImages,
    setShowMediaPicker,
    setMediaPickerTarget,
    setPreviewImageIndex,
    loadPosts,
    loadMedia,
    handleSetupBlogDb,
    handleNewPost,
    handleEditPost,
    handleSave,
    handleDelete,
    addImageToGallery,
    removeImageFromGallery,
    updateImageInGallery,
    reorderImages,
  };
}
