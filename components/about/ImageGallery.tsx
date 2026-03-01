'use client';

import { useState } from 'react';
import { AboutImage } from '@/lib/about';
import ImageViewer from './ImageViewer';

interface ImageGalleryProps {
  images: AboutImage[];
  title?: string;
}

export default function ImageGallery({ images, title = '图片画廊' }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const handleImageClick = (index: number) => {
    setSelectedIndex(index);
  };

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;

  return (
    <>
      <div className="mt-16">
        <h2 className="text-3xl font-bold mb-8 text-center">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((image, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-lg bg-gray-100 aspect-square cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              onClick={() => handleImageClick(index)}
            >
              <img
                src={image.thumbnail || image.url}
                alt={image.title || `图片 ${index + 1}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              {/* 遮罩层 */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-center px-4">
                  {image.title && (
                    <h3 className="text-lg font-semibold mb-2">{image.title}</h3>
                  )}
                  {image.description && (
                    <p className="text-sm line-clamp-2">{image.description}</p>
                  )}
                  <div className="mt-3 text-xs opacity-75">点击查看大图</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 图片查看器 */}
      <ImageViewer
        image={selectedImage}
        onClose={() => setSelectedIndex(null)}
        onNext={handleNext}
        onPrev={handlePrev}
        hasNext={selectedIndex !== null && selectedIndex < images.length - 1}
        hasPrev={selectedIndex !== null && selectedIndex > 0}
      />
    </>
  );
}

