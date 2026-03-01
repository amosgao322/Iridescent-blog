'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseUserAgent, formatUserAgent } from '@/lib/user-agent-parser';

interface UserVisit {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  userAgent?: string;
  duration: number;
  timestamp: number;
  startTime: number;
  endTime: number;
  date: string;
  visitCount: number; // 该用户访问该页面的总次数
}

interface PostDurationStat {
  slug: string;
  path: string;
  title: string;
  visitCount: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  totalDuration: number;
  userVisits: UserVisit[];
}

interface PostDurationData {
  posts: PostDurationStat[];
}

export default function PostDurationPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<PostDurationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      router.push('/admin');
    }
  }, [selectedDate, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics/post-duration?date=${selectedDate}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch post duration stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}秒`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}分钟`;
    }
    return `${minutes}分${remainingSeconds}秒`;
  };

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-black mb-4"
          >
            ← 返回
          </button>
          <h1 className="text-3xl font-bold">页面停留时间排行榜</h1>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {data.posts.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-500 text-lg">暂无数据</p>
          <p className="text-gray-400 text-sm mt-2">
            {selectedDate === new Date().toISOString().split('T')[0]
              ? '今天还没有文章停留时间数据'
              : `${selectedDate} 没有文章停留时间数据`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data.posts.map((post, index) => (
            <div
              key={post.path}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedPost(expandedPost === post.path ? null : post.path)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {index + 1}
                      </span>
                      <h2 className="text-xl font-semibold">{post.title}</h2>
                    </div>
                    <div className="ml-11 text-sm text-gray-500 mb-3">
                      <span className="font-mono">{post.path}</span>
                    </div>
                    <div className="ml-11 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">访问次数：</span>
                        <span className="font-semibold">{post.visitCount}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">平均停留：</span>
                        <span className="font-semibold text-blue-600">
                          {post.avgDuration > 0 ? formatDuration(post.avgDuration) : '暂无数据'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">最长停留：</span>
                        <span className="font-semibold text-green-600">
                          {post.maxDuration > 0 ? formatDuration(post.maxDuration) : '暂无数据'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">总停留时间：</span>
                        <span className="font-semibold text-purple-600">
                          {post.totalDuration > 0 ? formatDuration(post.totalDuration) : '暂无数据'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedPost === post.path ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 展开显示用户浏览详情 */}
              {expandedPost === post.path && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">用户浏览详情</h3>
                    <div className="text-sm text-gray-500">
                      共 {post.userVisits.length} 个用户访问
                      {post.userVisits.filter(v => v.duration === 0).length > 0 && (
                        <span className="ml-2 text-orange-600">
                          （{post.userVisits.filter(v => v.duration === 0).length} 个访问停留时间未记录）
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {post.userVisits.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">暂无用户浏览数据</p>
                    ) : (
                      post.userVisits.map((userVisit, userIndex) => {
                        const locationText = [
                          userVisit.country,
                          userVisit.region,
                          userVisit.city,
                        ]
                          .filter(Boolean)
                          .join(' · ') || '未知位置';

                        // 解析 User-Agent
                        const parsedUA = userVisit.userAgent 
                          ? parseUserAgent(userVisit.userAgent)
                          : null;
                        const formattedUA = parsedUA ? formatUserAgent(parsedUA) : null;

                        return (
                          <div
                            key={`${userVisit.ip}-${userVisit.timestamp}`}
                            className="bg-white p-4 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <span className="font-medium text-gray-900">
                                    {userVisit.ip}
                                  </span>
                                  <span className="text-sm text-gray-600">{locationText}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                    访问 {userVisit.visitCount} 次
                                  </span>
                                </div>
                                
                                {/* 用户环境信息 */}
                                {formattedUA && (
                                  <div className="mb-2">
                                    <div className="text-sm text-gray-700 font-medium mb-1">访问环境</div>
                                    <div className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                      {formattedUA}
                                    </div>
                                  </div>
                                )}

                                {/* 时间信息 */}
                                <div className="space-y-1 text-xs text-gray-500">
                                  <div>
                                    <span className="font-medium">开始时间：</span>
                                    {formatDateTime(userVisit.startTime)}
                                  </div>
                                  {/* 检查 endTime 是否存在，如果存在则显示，否则显示未记录 */}
                                  {userVisit.endTime && userVisit.endTime > userVisit.startTime ? (
                                    <div>
                                      <span className="font-medium">结束时间：</span>
                                      {formatDateTime(userVisit.endTime)}
                                      {userVisit.duration !== undefined && userVisit.duration > 0 && userVisit.duration < 3 && (
                                        <span className="text-xs ml-2 text-gray-400">(停留时间 {userVisit.duration} 秒，小于 3 秒阈值)</span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-gray-400">
                                      <span className="font-medium">结束时间：</span>
                                      未记录（停留时间未统计）
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-4">
                                {userVisit.duration > 0 ? (
                                  <>
                                    <div className="text-lg font-bold text-orange-600">
                                      {formatDuration(userVisit.duration)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">停留时间</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-sm text-gray-400">
                                      暂无数据
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">停留时间未记录</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

