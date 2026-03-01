'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RSSPage() {
  const [rssUrl, setRssUrl] = useState('');

  useEffect(() => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    setRssUrl(`${siteUrl}/feed`);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">RSS 订阅</h1>
        </div>

        <div className="space-y-6">
          {/* RSS链接 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">订阅地址</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={rssUrl}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rssUrl);
                  alert('RSS 地址已复制');
                }}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors whitespace-nowrap"
              >
                复制
              </button>
              <a
                href={rssUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors whitespace-nowrap text-center"
              >
                预览
              </a>
            </div>
          </section>

          {/* 使用说明 */}
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">使用方法</h2>
            <p className="text-gray-600 text-sm mb-4">
              将上面的 RSS 地址复制到你的 RSS 阅读器中订阅即可收到我最新的文章和随记。推荐使用 Feedly、Inoreader 等阅读器。
            </p>
          </section>
        </div>

        {/* 返回按钮 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

