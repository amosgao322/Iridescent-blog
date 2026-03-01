'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CoverImageProps {
  src: string;
  alt: string;
  caption?: string;
}

export default function CoverImage({ src, alt, caption }: CoverImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 当模态框打开时，阻止 body 滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <div className="mb-8 w-full">
        <div 
          className="relative w-full bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" 
          style={{ minHeight: '200px', maxHeight: '600px' }}
          onClick={() => setIsOpen(true)}
        >
          <Image
            src={src}
            alt={alt}
            width={1200}
            height={900}
            className="w-full h-auto max-h-[600px] object-contain"
            priority
          />
        </div>
        {caption && (
          <p className="mt-2 text-sm text-gray-500 text-center">
            {caption}
          </p>
        )}
      </div>

      {/* 图片放大模态框 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
          onKeyDown={(e) => {
            // 按 ESC 键关闭
            if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 transition-colors"
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
          <div
            className="max-w-full max-h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[90vh] object-contain cursor-pointer"
              onClick={() => setIsOpen(false)}
              onLoad={(e) => {
                // 确保图片加载后可以正常显示
                (e.target as HTMLImageElement).style.display = 'block';
              }}
            />
          </div>
          {caption && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded">
              {caption}
            </div>
          )}
        </div>
      )}
    </>
  );
}

