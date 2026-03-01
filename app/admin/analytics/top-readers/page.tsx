'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseUserAgent, formatUserAgent } from '@/lib/user-agent-parser';

interface TopReader {
  ip: string;
  country?: string;
  region?: string;
  city?: string;
  userAgent?: string;
  duration: number; // 停留时间（秒）
  startTime: number;
  endTime: number;
  timestamp: number;
  date: string;
  visitCount: number; // 该用户访问该页面的总次数
}

interface PostTopReaders {
  slug: string;
  path: string;
  title: string;
  topReaders: TopReader[]; // 前三名用户
}

interface TopReadersData {
  days7: PostTopReaders[];
  days15: PostTopReaders[];
  days30: PostTopReaders[];
}

export default function TopReadersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<TopReadersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'days7' | 'days15' | 'days30'>('days7');
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      router.push('/admin');
    }
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/top-readers');
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch top readers:', error);
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

  const getLocationString = (reader: TopReader): string => {
    const parts = [];
    if (reader.country) parts.push(reader.country);
    if (reader.region) parts.push(reader.region);
    if (reader.city) parts.push(reader.city);
    return parts.length > 0 ? parts.join(' ') : '未知位置';
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  const currentData = data[selectedTimeRange];
  const timeRangeLabels = {
    days7: '过去7天',
    days15: '过去15天',
    days30: '过去30天',
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">文章浏览时长前三名用户</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/analytics')}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            返回统计
          </button>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as 'days7' | 'days15' | 'days30')}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="days7">过去7天</option>
            <option value="days15">过去15天</option>
            <option value="days30">过去30天</option>
          </select>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {currentData.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {timeRangeLabels[selectedTimeRange]}内暂无数据
        </div>
      ) : (
        <div className="space-y-6">
          {currentData.map((post) => (
            <div
              key={post.path}
              className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">{post.title}</h2>
                <span className="text-sm text-gray-500">{post.path}</span>
              </div>

              {post.topReaders.length === 0 ? (
                <div className="text-gray-500 text-center py-4">
                  暂无有效浏览记录（停留时间 &gt;= 3秒）
                </div>
              ) : (
                <div className="space-y-4">
                  {post.topReaders.map((reader, index) => (
                    <div
                      key={`${reader.ip}-${reader.timestamp}`}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm">
                            {index + 1}
                          </span>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {reader.ip}
                            </div>
                            <div className="text-sm text-gray-600">
                              {getLocationString(reader)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-600">
                            {formatDuration(reader.duration)}
                          </div>
                          <div className="text-xs text-gray-500">
                            停留时长
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <div className="text-gray-500">访问次数</div>
                          <div className="font-semibold">{reader.visitCount}次</div>
                        </div>
                        <div>
                          <div className="text-gray-500">开始时间</div>
                          <div className="font-semibold">{formatDateTime(reader.startTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">结束时间</div>
                          <div className="font-semibold">{formatDateTime(reader.endTime)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">访问环境</div>
                          <div className="font-semibold">
                            {reader.userAgent ? formatUserAgent(parseUserAgent(reader.userAgent)) : '未知'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

