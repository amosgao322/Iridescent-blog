'use client';

import { useEffect } from 'react';
import { AboutImage } from '@/lib/about';

interface ImageViewerProps {
  image: AboutImage | null;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export default function ImageViewer({
  image,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: ImageViewerProps) {
  useEffect(() => {
    if (image) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [image]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!image) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && hasPrev && onPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && hasNext && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose, onNext, onPrev, hasNext, hasPrev]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 z-20 transition-colors"
        aria-label="关闭"
      >
        <svg
          className="w-8 h-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* 上一张按钮 */}
      {hasPrev && onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-20 transition-colors bg-black bg-opacity-50 rounded-full p-2"
          aria-label="上一张"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      )}

      {/* 下一张按钮 */}
      {hasNext && onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 z-20 transition-colors bg-black bg-opacity-50 rounded-full p-2"
          aria-label="下一张"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      )}

      {/* 图片容器 */}
      <div
        className="max-w-7xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 图片 */}
        <div className="flex-1 flex items-center justify-center mb-4">
          <img
            src={image.url}
            alt={image.title || '图片'}
            className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          />
        </div>

        {/* 图片信息 */}
        {(image.title || image.description) && (
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-6 max-w-2xl w-full text-white">
            {image.title && (
              <h3 className="text-2xl font-bold mb-3">{image.title}</h3>
            )}
            {image.description && (
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                {image.description}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

