'use client';

import Link from "next/link";
import { useState } from "react";
import SearchModal from "@/components/search/SearchModal";

export default function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-8 flex-1 min-w-0">
              <Link href="/" className="text-base sm:text-lg lg:text-xl font-bold text-black hover:text-gray-700 whitespace-nowrap">
                高槐玉的独立空间
              </Link>
              {/* 导航链接 - 移动端和桌面端都显示 */}
              <nav className="flex space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 xl:space-x-6 text-xs sm:text-sm lg:text-base ml-2 sm:ml-4 overflow-x-auto">
                <Link href="/posts" className="text-gray-600 hover:text-black whitespace-nowrap">
                  文章
                </Link>
                <Link href="/movies" className="text-gray-600 hover:text-black whitespace-nowrap">
                  光影
                </Link>
                <Link href="/notes" className="text-gray-600 hover:text-black whitespace-nowrap">
                  随记
                </Link>
                <Link href="/archive" className="text-gray-600 hover:text-black whitespace-nowrap">
                  归档
                </Link>
                <Link href="/friends" className="text-gray-600 hover:text-black whitespace-nowrap">
                  邻居
                </Link>
                <Link href="/about" className="text-gray-600 hover:text-black whitespace-nowrap" prefetch={false}>
                  关于
                </Link>
              </nav>
            </div>
            {/* 桌面端：显示所有图标 */}
            <div className="hidden sm:flex items-center space-x-2 sm:space-x-3 md:space-x-4 flex-shrink-0">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="text-gray-600 hover:text-black"
                aria-label="搜索"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <Link href="/rss" className="text-gray-600 hover:text-black" aria-label="RSS订阅">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z" />
                </svg>
              </Link>
              <Link href="/admin" className="text-gray-600 hover:text-black text-sm sm:text-base">
                管理
              </Link>
            </div>
            {/* 移动端：菜单按钮 */}
            <div className="relative sm:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-black p-1"
                aria-label="菜单"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              {/* 下拉菜单 */}
              {isMenuOpen && (
                <>
                  {/* 背景遮罩，点击关闭菜单 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                    <button
                      onClick={() => {
                        setIsSearchOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>搜索</span>
                    </button>
                    <Link
                      href="/rss"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001 3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966 11.022 11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046 19.152 8.594 19.183 19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z" />
                      </svg>
                      <span>RSS订阅</span>
                    </Link>
                    <Link
                      href="/admin"
                      onClick={() => setIsMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      管理
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

