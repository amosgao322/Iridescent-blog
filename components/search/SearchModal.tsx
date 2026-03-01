'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface SearchResult {
  slug: string;
  title: string;
  excerpt?: string;
  category: string;
  date: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索文章..."
              className="flex-1 outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">搜索中...</div>
          ) : results.length === 0 && query ? (
            <div className="p-8 text-center text-gray-500">未找到相关文章</div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((result) => (
                <Link
                  key={result.slug}
                  href={`/post/${result.slug}`}
                  onClick={onClose}
                  className="block p-4 hover:bg-gray-50 transition-colors"
                >
                  <h3 className="font-semibold text-lg mb-1">{result.title}</h3>
                  {result.excerpt && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {result.excerpt}
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
                    <span>{result.date}</span>
                    <span className="mx-2">·</span>
                    <span>{result.category}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              输入关键词开始搜索
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

