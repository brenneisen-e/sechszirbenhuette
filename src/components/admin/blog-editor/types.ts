export interface BlogPost {
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

export interface BlogPostImage {
  id?: string;
  image_url: string;
  image_alt: string | null;
  caption: string | null;
  display_order: number;
}

export interface MediaItem {
  id: string;
  url: string;
  alt_text: string;
  title: string;
}

export type EditorTab = 'list' | 'edit' | 'preview';
