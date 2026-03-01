'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPathName } from '@/lib/path-names';

interface DailyStats {
  [date: string]: number;
}

interface LocationStat {
  ip: string;
  count: number;
  country?: string;
  region?: string;
  city?: string;
  paths?: Array<{ path: string; count: number }>;
}

interface PathStat {
  path: string;
  count: number;
  title?: string | null;
  avgDuration?: number; // 平均停留时间（秒）
}

interface AnalyticsData {
  dailyStats: DailyStats;
  locationStats: LocationStat[];
  pathStats: PathStat[];
  totalVisits: number;
  todayVisits: number;
  uniqueVisitors: number;
  averageDuration: number; // 平均停留时间（秒）
}

export default function AnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(15);
  const [updatingLocations, setUpdatingLocations] = useState(false);
  // 默认选中今天的日期
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchAnalytics();
    } else {
      router.push('/admin');
    }
  }, [days, selectedDate, router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/analytics?days=${days}&date=${selectedDate}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLocations = async () => {
    try {
      setUpdatingLocations(true);
      const res = await fetch('/api/analytics/update-locations', {
        method: 'POST',
      });
      if (res.ok) {
        const result = await res.json();
        alert(result.message || '地理位置更新完成');
        // 重新获取数据
        await fetchAnalytics();
      } else {
        alert('更新失败，请稍后重试');
      }
    } catch (error) {
      console.error('Failed to update locations:', error);
      alert('更新失败，请稍后重试');
    } finally {
      setUpdatingLocations(false);
    }
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

  // 生成完整的最近N天的日期范围
  const generateDateRange = (days: number) => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.push(dateStr);
    }
    return dates;
  };

  // 准备图表数据 - 确保显示完整的日期范围
  const allDates = generateDateRange(days);
  const chartData = allDates.map((date) => {
    const count = data.dailyStats[date] || 0;
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return null;
      }
      return {
        date: dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        dateKey: date, // 保留原始日期用于显示
        count: Number(count) || 0,
      };
    } catch {
      return null;
    }
  }).filter((item): item is { date: string; dateKey: string; count: number } => item !== null);

  const maxCount = chartData.length > 0 ? Math.max(...chartData.map(d => d.count), 1) : 1;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">访问统计 V1</h1>
          <p className="text-sm text-gray-600 mt-1">基础版统计</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/analytics-v2')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            title="查看V2版本统计（更详细的分析）"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            查看 V2 统计
          </button>
          <button
            onClick={() => router.push('/admin/analytics/post-duration')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            title="查看文章停留时间排行榜"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            文章停留时间排行
          </button>
          <button
            onClick={() => router.push('/admin/analytics/top-readers')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
            title="查看每篇文章浏览时长前三名用户"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            浏览时长前三名
          </button>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value={7}>最近 7 天</option>
            <option value={15}>最近 15 天</option>
            <option value={30}>最近 30 天</option>
            <option value={60}>最近 60 天</option>
            <option value={90}>最近 90 天</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            刷新
          </button>
          <button
            onClick={updateLocations}
            disabled={updatingLocations}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            title="为没有地理位置信息的IP补充位置信息"
          >
            {updatingLocations ? '更新中...' : '更新地理位置'}
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">总访问量</h3>
          <p className="text-3xl font-bold">{data.totalVisits.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">今日访问</h3>
          <p className="text-3xl font-bold text-blue-600">{data.todayVisits.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">独立访客</h3>
          <p className="text-3xl font-bold text-green-600">{data.uniqueVisitors.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">平均每日</h3>
          <p className="text-3xl font-bold text-purple-600">
            {Math.round(data.totalVisits / Math.max(days, 1)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-600 mb-2">平均停留时间</h3>
          <p className="text-3xl font-bold text-orange-600">
            {data.averageDuration > 0 
              ? `${Math.floor(data.averageDuration / 60)}分${data.averageDuration % 60}秒`
              : '暂无数据'}
          </p>
        </div>
      </div>

      {/* 每日访问量图表 */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-6">每日访问量趋势</h2>
        <div className="flex items-end gap-1 h-64 overflow-x-auto pb-4">
          {chartData.length === 0 ? (
            <div className="w-full text-center text-gray-500 py-20">暂无数据</div>
          ) : (
            chartData.map((item, index) => {
              const isSelected = item.dateKey === selectedDate;
              return (
                <div 
                  key={index} 
                  className="flex-1 min-w-[40px] flex flex-col items-center group relative cursor-pointer"
                  onClick={() => setSelectedDate(item.dateKey)}
                >
                  <div className="w-full flex flex-col items-center justify-end h-full">
                    <div
                      className={`w-full transition-colors rounded-t min-h-[4px] ${
                        isSelected 
                          ? 'bg-blue-700 ring-2 ring-blue-500 ring-offset-2' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                      style={{ height: `${Math.max((item.count / maxCount) * 240, 4)}px` }}
                      title={`${item.dateKey}: ${item.count} 次访问`}
                    />
                  </div>
                  <div className={`mt-2 text-xs text-center whitespace-nowrap transform -rotate-45 origin-top-left ${
                    isSelected ? 'text-blue-700 font-semibold' : 'text-gray-600'
                  }`}>
                    {item.date}
                  </div>
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {item.count} 次
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 访问来源地理位置 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">访问来源（按 IP）</h2>
            <span className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.locationStats.length === 0 ? (
              <div className="text-center text-gray-500 py-10">暂无数据</div>
            ) : (
              data.locationStats.map((stat, index) => {
                const locationText = [stat.country, stat.region, stat.city]
                  .filter(Boolean)
                  .join(' · ') || '未知位置';
                
                // 判断是否可疑（访问次数过多）
                const isSuspicious = stat.count > 100;
                
                return (
                  <div key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${isSuspicious ? 'bg-red-50' : ''}`}>
                    <div className="flex items-center justify-between p-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{stat.ip}</span>
                          {isSuspicious && (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">可疑</span>
                          )}
                          <span className="text-sm text-gray-600">
                            {locationText}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <span className={`font-semibold ${isSuspicious ? 'text-red-600' : ''}`}>{stat.count}</span>
                        <span className="text-sm text-gray-500 ml-1">次</span>
                        <button
                          onClick={() => router.push(`/admin/analytics/analyze?ip=${encodeURIComponent(stat.ip)}`)}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 border border-blue-200 rounded hover:bg-blue-50"
                        >
                          分析
                        </button>
                      </div>
                    </div>
                    {/* 显示该IP访问的页面 */}
                    {stat.paths && stat.paths.length > 0 && (
                      <div className="px-3 pb-3 pt-1">
                        <div className="text-xs text-gray-500 mb-1">访问页面：</div>
                        <div className="flex flex-wrap gap-2">
                          {stat.paths.slice(0, 5).map((pathItem, pathIndex) => (
                            <span
                              key={pathIndex}
                              className="text-xs bg-gray-100 px-2 py-1 rounded"
                              title={pathItem.path}
                            >
                              {getPathName(pathItem.path)} ({pathItem.count})
                            </span>
                          ))}
                          {stat.paths.length > 5 && (
                            <span className="text-xs text-gray-400">
                              +{stat.paths.length - 5} 个
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 热门页面 */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">热门页面</h2>
            <span className="text-sm text-gray-500">
              {new Date(selectedDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {data.pathStats.length === 0 ? (
              <div className="text-center text-gray-500 py-10">暂无数据</div>
            ) : (
              data.pathStats.map((stat, index) => {
                // 如果是文章详情页且有标题，使用标题；否则使用路径名称
                const displayName = stat.path.startsWith('/post/') && stat.title 
                  ? stat.title 
                  : getPathName(stat.path);
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="font-medium">{displayName}</div>
                      {stat.avgDuration !== undefined && stat.avgDuration > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          平均停留: {Math.floor(stat.avgDuration / 60)}分{stat.avgDuration % 60}秒
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <span className="font-semibold">{stat.count}</span>
                      <span className="text-sm text-gray-500 ml-1">次</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

