'use client';

import Image from 'next/image';
import {
  Edit2,
  Trash2,
  ExternalLink,
  ImageIcon,
  Calendar,
  LayoutGrid,
  List,
  Layers,
} from 'lucide-react';
import type { BlogPost, MediaItem } from './types';

interface BlogPostListProps {
  posts: BlogPost[];
  onEdit: (post: BlogPost) => void;
  onDelete: (postId: string) => void;
  onMigrate?: () => void;
  migrating?: boolean;
  fallbackImages?: MediaItem[];
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export function BlogPostList({ posts, onEdit, onDelete, onMigrate, migrating, fallbackImages = [] }: BlogPostListProps) {
  return (
    <div className="space-y-4">
      {/* Migrate button */}
      {onMigrate && (
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-amber-800">Statische Artikel migrieren</p>
            <p className="text-xs text-amber-600">Die zwei Hauptartikel (Urlaubsziel + Ausflüge) als Blog-Posts anlegen</p>
          </div>
          <button
            onClick={onMigrate}
            disabled={migrating}
            className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium"
          >
            {migrating ? 'Migriere...' : 'Migrieren'}
          </button>
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Noch keine Blog-Beiträge</p>
          <p className="text-sm">Erstellen Sie Ihren ersten Beitrag</p>
        </div>
      )}

      {posts.map((post, postIndex) => {
        const thumbUrl = post.cover_image_url || fallbackImages[postIndex]?.url || null;
        return (
        <div
          key={post.id}
          className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
        >
          {/* Thumbnail */}
          <div className="w-20 h-20 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
            {thumbUrl ? (
              <Image
                src={thumbUrl}
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
                {post.layout === 'carousel' ? <LayoutGrid className="w-3 h-3" /> :
                 post.layout === 'tabs' ? <Layers className="w-3 h-3" /> :
                 <List className="w-3 h-3" />}
                {post.layout === 'carousel' ? 'Karussell' : post.layout === 'tabs' ? 'Tabs' : 'Standard'}
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
              onClick={() => onEdit(post)}
              className="p-2 text-gray-500 hover:text-logo-green transition"
              title="Bearbeiten"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(post.id)}
              className="p-2 text-gray-500 hover:text-red-600 transition"
              title="Löschen"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}
