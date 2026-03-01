'use client';

import { useState, useEffect, useRef } from 'react';
import TableOfContents from './TableOfContents';

interface MobileTOCModalProps {
  content: string;
}

export default function MobileTOCModal({ content }: MobileTOCModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // 监听大纲项的点击，点击后关闭模态框
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const handleTocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // 检查是否点击了大纲链接
      if (target.closest('a[href^="#"]')) {
        // 延迟关闭，让滚动动画先开始
        setTimeout(() => {
          setIsOpen(false);
        }, 300);
      }
    };

    modalRef.current.addEventListener('click', handleTocClick);
    return () => {
      if (modalRef.current) {
        modalRef.current.removeEventListener('click', handleTocClick);
      }
    };
  }, [isOpen]);

  return (
    <>
      {/* 移动端大纲按钮 */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-20 sm:top-24 right-4 z-40 bg-white border border-gray-200 rounded-full p-3 shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="显示大纲"
      >
        <svg
          className="w-5 h-5 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* 模态框遮罩 */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
          onClick={() => setIsOpen(false)}
        >
          {/* 模态框内容 */}
          <div
            ref={modalRef}
            className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">目录</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="关闭"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <div className="w-full">
                <TableOfContents content={content} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

