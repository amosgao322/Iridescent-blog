'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Movie, MovieStatus } from '@/lib/movies';

type ViewMode = 'grid' | 'list';
type ScoreFilter = '全部' | '60-' | '70-80' | '80-90' | '90+';

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<MovieStatus | '全部'>('全部');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('全部');
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const res = await fetch('/api/movies');
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies || []);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  // 筛选逻辑
  const filteredAndSortedMovies = useMemo(() => {
    let result = [...movies];

    // 按状态筛选
    if (statusFilter !== '全部') {
      result = result.filter(m => m.status === statusFilter);
    }

    // 按评分筛选
    if (scoreFilter === '60-') {
      result = result.filter(m => m.score < 60);
    } else if (scoreFilter === '70-80') {
      result = result.filter(m => m.score >= 70 && m.score < 80);
    } else if (scoreFilter === '80-90') {
      result = result.filter(m => m.score >= 80 && m.score < 90);
    } else if (scoreFilter === '90+') {
      result = result.filter(m => m.score >= 90);
    }

    // 默认按创建时间倒序排列（最新的在前）
    result.sort((a, b) => b.createdAt - a.createdAt);

    return result;
  }, [movies, statusFilter, scoreFilter]);

  const toggleReview = (id: string) => {
    const newExpanded = new Set(expandedReviews);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedReviews(newExpanded);
  };

  const getStatusColor = (status: MovieStatus) => {
    switch (status) {
      case '已看完':
        return 'bg-green-100 text-green-800 border-green-200';
      case '已二刷':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '待二刷':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case '进行中':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case '待观看':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-0 py-2 sm:py-4">
      {/* 工具栏 - 移动端优化，紧凑布局 */}
      <div className="mb-2 sm:mb-4">
        {/* 移动端：垂直紧凑布局，桌面端：水平布局 */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {/* 第一行：视图切换和排序 - 移动端紧凑 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 视图切换 */}
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2 py-1 text-sm ${
                  viewMode === 'grid'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2 py-1 text-sm ${
                  viewMode === 'list'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

            {/* 评分快捷筛选 */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs text-gray-600 whitespace-nowrap">评分:</span>
              <div className="flex gap-1">
                {(['全部', '60-', '70-80', '80-90', '90+'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setScoreFilter(filter)}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors whitespace-nowrap ${
                      scoreFilter === filter
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {filter === '全部' ? '全部' : filter === '60-' ? '<60' : filter === '70-80' ? '70~80' : filter === '80-90' ? '80~90' : '90+'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 第二行：状态筛选 - 移动端单独一行，紧凑 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">状态:</span>
            <div className="flex flex-wrap gap-1">
              {(['全部', '已看完', '已二刷', '待二刷', '进行中', '待观看'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-1.5 py-0.5 text-xs rounded border transition-colors whitespace-nowrap ${
                    statusFilter === status
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 结果统计 */}
      <div className="mb-2 sm:mb-3 text-xs text-gray-500">
        {filteredAndSortedMovies.length} 部
      </div>

      {/* 内容区域 */}
      {filteredAndSortedMovies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无符合条件的作品</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* 瀑布流布局 - 移动端优化 */
        <div 
          className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-2 sm:gap-3 md:gap-4"
          style={{ columnFill: 'balance' }}
        >
          {filteredAndSortedMovies.map((movie) => (
            movie.coverImage ? (
              /* 有封面：大卡片 */
              <div
                key={movie.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all mb-2 sm:mb-3 md:mb-4 break-inside-avoid relative"
              >
                <div className="relative aspect-[2/3] bg-gray-100">
                  <Image
                    src={movie.coverImage}
                    alt={movie.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {/* 评分和状态 - 固定在右上角 */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 flex-col">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${getScoreColor(movie.score)} bg-white/90 backdrop-blur-sm shadow-sm`}>
                      {movie.score}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium border ${getStatusColor(movie.status)} bg-white/90 backdrop-blur-sm shadow-sm`}>
                      {movie.status}
                    </span>
                  </div>
                </div>
                <div className="p-2 sm:p-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 leading-snug">
                      {movie.name}
                    </h3>
                    {movie.tag && movie.tag.split(/[,，]/).filter(t => t.trim()).map((tag, index) => (
                      <span key={index} className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* 无封面：小卡片 */
              <div
                key={movie.id}
                className="bg-white border border-gray-200 rounded-lg p-2 sm:p-3 hover:shadow-md transition-all mb-2 sm:mb-3 md:mb-4 break-inside-avoid relative"
              >
                {/* 评分和状态 - 固定在右侧垂直居中 */}
                <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1.5 flex-col">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold ${getScoreColor(movie.score)}`}>
                    {movie.score}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium border ${getStatusColor(movie.status)}`}>
                    {movie.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap pr-16 sm:pr-20">
                  <h3 className="font-medium text-xs sm:text-sm line-clamp-2 leading-snug">
                    {movie.name}
                  </h3>
                  {movie.tag && movie.tag.split(/[,，]/).filter(t => t.trim()).map((tag, index) => (
                    <span key={index} className="px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      ) : (
        /* 列表视图 */
        <div className="space-y-2">
          {filteredAndSortedMovies.map((movie) => (
            <div
              key={movie.id}
              className="bg-white border border-gray-200 rounded p-2.5 sm:p-3 hover:shadow-sm transition-shadow relative"
            >
              {/* 评分和状态 - 固定在右侧垂直居中 */}
              <div className="absolute top-1/2 right-2.5 sm:right-3 -translate-y-1/2 flex items-center gap-1.5 flex-col">
                <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${getScoreColor(movie.score)}`}>
                  {movie.score}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(movie.status)}`}>
                  {movie.status}
                </span>
              </div>
              <div className="flex items-start gap-2.5 pr-16 sm:pr-20">
                {/* 封面（列表视图，仅在有封面时显示） */}
                {movie.coverImage && (
                  <div className="relative w-16 h-24 sm:w-20 sm:h-28 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                    <Image
                      src={movie.coverImage}
                      alt={movie.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-sm sm:text-base font-semibold">
                      {movie.name}
                    </h3>
                    {movie.tag && movie.tag.split(/[,，]/).filter(t => t.trim()).map((tag, index) => (
                      <span key={index} className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                  {movie.review && (
                    <div>
                      <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-wrap">
                        {movie.review}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

