'use client';

import Image from 'next/image';
import { ChevronLeft, ChevronRight, Calendar, User } from 'lucide-react';
import type { BlogPost, BlogPostImage } from './types';

interface BlogPreviewProps {
  currentPost: Partial<BlogPost>;
  postImages: BlogPostImage[];
  activeTab: 'edit' | 'preview';
  previewImageIndex: number;
  onChangePreviewImage: (index: number) => void;
}

export function BlogPreview({
  currentPost,
  postImages,
  activeTab,
  previewImageIndex,
  onChangePreviewImage,
}: BlogPreviewProps) {
  return (
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
                    onClick={() => onChangePreviewImage((previewImageIndex - 1 + postImages.length) % postImages.length)}
                    className="p-1 bg-white/80 rounded-full"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onChangePreviewImage((previewImageIndex + 1) % postImages.length)}
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
  );
}
