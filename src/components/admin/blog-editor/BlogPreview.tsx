'use client';

import { useState } from 'react';
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
  const isCarousel = currentPost.layout === 'carousel';
  const isTabs = currentPost.layout === 'tabs';
  const [activePreviewTab, setActivePreviewTab] = useState(0);
  const [carouselOffset, setCarouselOffset] = useState(0);
  const visibleSlides = 2;
  const maxOffset = Math.max(0, postImages.length - visibleSlides);

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

          {/* Content / Intro text */}
          {currentPost.content && !isTabs && (
            <div
              className={`prose prose-sm max-w-none ${isCarousel ? 'mb-4' : ''}`}
              dangerouslySetInnerHTML={{
                __html: isCarousel
                  ? `<p>${currentPost.content}</p>`
                  : currentPost.content || '<p class="text-gray-400">Ihr Inhalt erscheint hier...</p>',
              }}
            />
          )}

          {/* === CAROUSEL PREVIEW === */}
          {isCarousel && postImages.length > 0 && (
            <div className="relative">
              {/* Navigation arrows */}
              {postImages.length > visibleSlides && (
                <>
                  <button
                    onClick={() => setCarouselOffset(Math.max(0, carouselOffset - 1))}
                    disabled={carouselOffset === 0}
                    className="absolute left-0 top-1/3 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-600 hover:bg-gray-50 -translate-x-1/2 disabled:opacity-30"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCarouselOffset(Math.min(maxOffset, carouselOffset + 1))}
                    disabled={carouselOffset >= maxOffset}
                    className="absolute right-0 top-1/3 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-600 hover:bg-gray-50 translate-x-1/2 disabled:opacity-30"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Cards container */}
              <div className="overflow-hidden">
                <div
                  className="flex gap-3 transition-transform duration-300"
                  style={{ transform: `translateX(-${carouselOffset * (100 / visibleSlides + 2)}%)` }}
                >
                  {postImages.map((slide, index) => (
                    <div
                      key={index}
                      className="shrink-0 rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm"
                      style={{ width: `calc(${100 / visibleSlides}% - ${(visibleSlides - 1) * 12 / visibleSlides}px)` }}
                    >
                      {/* Slide image */}
                      {slide.image_url && (
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={slide.image_url}
                            alt={slide.image_alt || ''}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-logo-green text-white flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        </div>
                      )}

                      {/* Slide text */}
                      <div className="p-3">
                        {slide.image_alt && (
                          <h4 className="text-sm font-bold text-gray-900 mb-1">
                            {slide.image_alt}
                          </h4>
                        )}
                        {slide.caption && (
                          <div className="text-xs text-gray-600 line-clamp-3 prose prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: slide.caption }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dots */}
              {postImages.length > visibleSlides && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {Array.from({ length: maxOffset + 1 }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselOffset(i)}
                      className={`w-2 h-2 rounded-full transition ${
                        i === carouselOffset ? 'bg-logo-green w-4' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

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

          {/* Tabs Layout Preview */}
          {isTabs && (() => {
            let tabsData: { intro?: string; tabs?: { title: string; slides: { title: string; description: string; tip?: string }[] }[] };
            try { tabsData = JSON.parse(currentPost.content || '{}'); } catch { tabsData = {}; }
            const tabs = tabsData.tabs || [];
            return (
              <>
                {tabsData.intro && <p className="text-xs text-gray-600 mb-3">{tabsData.intro}</p>}
                {tabs.length > 0 && (
                  <div>
                    <div className="flex gap-1 mb-3">
                      {tabs.map((tab, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActivePreviewTab(idx)}
                          className={`px-2 py-1 text-[10px] rounded-lg transition ${
                            activePreviewTab === idx ? 'bg-logo-green text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {tab.title}
                        </button>
                      ))}
                    </div>
                    {tabs[activePreviewTab] && (
                      <div className="space-y-2">
                        {tabs[activePreviewTab].slides.map((slide, idx) => (
                          <div key={idx} className="p-2 bg-gray-50 rounded-lg border border-gray-100">
                            <h5 className="text-xs font-bold text-gray-800">{slide.title}</h5>
                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{slide.description}</p>
                            {slide.tip && (
                              <p className="text-[10px] text-amber-600 mt-1">Tipp: {slide.tip}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
