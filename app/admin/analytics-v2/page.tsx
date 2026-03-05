'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPathName } from '@/lib/path-names';

interface PageViewStat {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgDuration: number;
  avgScrollDepth: number;
  bounceRate: number;
  exitRate: number;
  avgEngagementScore?: number;
  imageClickCount?: number;
  linkClickCount?: number;
  scrollDepth25?: number;
  scrollDepth50?: number;
  scrollDepth75?: number;
  scrollDepth100?: number;
  title?: string | null;
  notePreview?: string; // 随记内容预览（前7个字符）
}

interface DailyStat {
  date: string;
  views: number;
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
}

interface AnalyticsV2Data {
  pageViewStats: PageViewStat[];
  dailyStats: DailyStat[];
  summary: {
    totalViews: number;
    totalUniqueVisitors: number;
    mostVisitedUserIP: string;
    mostVisitedUserCount: number;
    longestDurationUserIP: string;
    longestDurationUserTotal: number;
  };
}

interface UserProfile {
  userId: string;
  ip: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  deviceType: string;
  device?: string;
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  isp?: string;
  firstVisitTime: number;
  lastVisitTime: number;
  visitCount: number;
  isNewUser: boolean;
  totalSessions: number;
  totalPageViews: number;
  totalDuration: number;
  avgDuration: number;
}

interface UserPageVisit {
  path: string;
  title?: string;
  notePreview?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  scrollDepth: number;
  isExit: boolean;
  imageClickCount?: number;
}

export default function AnalyticsV2Page() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AnalyticsV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(15); // 默认15天
  const [pageViewStatsWithTitles, setPageViewStatsWithTitles] = useState<PageViewStat[]>([]);
  // 默认选中今天的日期
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  // 用户画像相关状态
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userVisits, setUserVisits] = useState<UserPageVisit[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchAnalytics();
      fetchUsers();
    } else {
      router.push('/admin');
    }
  }, [days, selectedDate, router]);

  // 当日期或天数改变时，如果已选择用户，重新获取用户详情
  useEffect(() => {
    if (selectedUser) {
      fetchUserDetails(selectedUser.userId);
    }
  }, [days, selectedDate]);

  // 选中用户且无地理位置时，请求 IP 归属并更新（与 users 页一致，主统计页也有用户画像）
  useEffect(() => {
    const p = selectedUser;
    if (!p?.userId || !p?.ip || p.ip === 'unknown') return;
    if (p.country || p.region || p.city || p.district) return;

    const ac = new AbortController();
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/analytics-v2/ip-location`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: p.ip, userId: p.userId }),
      signal: ac.signal,
    })
      .then((locRes) => {
        if (!locRes.ok) return null;
        return locRes.json();
      })
      .then((loc) => {
        if (loc && (loc.country || loc.region || loc.city || loc.district || loc.isp)) {
          setSelectedUser((prev) =>
            prev?.userId === p.userId ? { ...prev, ...loc } : prev
          );
        }
      })
      .catch(() => {});

    return () => ac.abort();
  }, [selectedUser?.userId, selectedUser?.ip, selectedUser?.country, selectedUser?.region, selectedUser?.city, selectedUser?.district]);

  useEffect(() => {
    if (!data?.pageViewStats) {
      setPageViewStatsWithTitles([]);
      return;
    }

    // 获取所有文章路径的标题和随记内容预览
    const fetchTitles = async () => {
      const statsWithTitles = await Promise.all(
        data.pageViewStats.map(async (stat) => {
          // 处理文章页面
          if (stat.path.startsWith('/post/')) {
            let slug = stat.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
            try {
              slug = decodeURIComponent(slug);
            } catch (e) {
              // 忽略解码错误
            }
            
            try {
              const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
              if (res.ok) {
                const data = await res.json();
                const post = data?.post;
                if (post?.title) {
                  return {
                    ...stat,
                    title: post.title,
                  };
                }
              }
            } catch (error) {
              console.error(`[AnalyticsV2] Failed to fetch title for ${slug}:`, error);
            }
          }
          // 处理随记页面
          else if (stat.path.startsWith('/notes/')) {
            const noteId = stat.path.replace('/notes/', '').split('?')[0].split('#')[0].trim();
            try {
              const noteRes = await fetch(`/api/notes/${noteId}`);
              if (noteRes.ok) {
                const noteData = await noteRes.json();
                const note = noteData?.note;
                if (note?.content) {
                  // 去除 markdown 格式和空白字符，获取前7个字符
                  const cleanContent = note.content
                    .replace(/[#*_`\[\]()]/g, '') // 去除 markdown 符号
                    .replace(/\s+/g, '') // 去除所有空白字符
                    .trim();
                  const preview = cleanContent.substring(0, 7);
                  if (preview) {
                    return {
                      ...stat,
                      notePreview: preview,
                    };
                  }
                }
              }
            } catch (error) {
              console.error(`[AnalyticsV2] Failed to fetch note content for ${noteId}:`, error);
            }
          }
          return stat;
        })
      );
      setPageViewStatsWithTitles(statsWithTitles);
    };

    fetchTitles();
  }, [data?.pageViewStats]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      // 对于页面统计详情，如果选择了具体日期，使用该日期；否则使用今天
      const dateForPageStats = selectedDate || new Date().toISOString().split('T')[0];
      // 对于每日访问趋势，始终使用最近N天（不限制日期，API会自动处理）
      const url = `/api/analytics-v2/stats?days=${days}&date=${dateForPageStats}`;
      const res = await fetch(url);
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

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const url = `/api/analytics-v2/users?days=${days}${selectedDate ? `&date=${selectedDate}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    try {
      const url = `/api/analytics-v2/users?userId=${userId}&days=${days}${selectedDate ? `&date=${selectedDate}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSelectedUser(data.profile);
        
        // 获取文章标题和随记内容预览
        const visitsWithTitles = await Promise.all(
          (data.pageVisits || []).map(async (visit: UserPageVisit) => {
            // 处理文章页面
            if (visit.path.startsWith('/post/')) {
              let slug = visit.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
              try {
                slug = decodeURIComponent(slug);
              } catch (e) {
                // 忽略解码错误
              }
              
              try {
                const postRes = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
                if (postRes.ok) {
                  const postData = await postRes.json();
                  const post = postData?.post;
                  if (post?.title) {
                    return {
                      ...visit,
                      title: post.title,
                    };
                  }
                }
              } catch (error) {
                console.error(`[AnalyticsV2] Failed to fetch title for ${slug}:`, error);
              }
            }
            // 处理随记页面
            else if (visit.path.startsWith('/notes/')) {
              const noteId = visit.path.replace('/notes/', '').split('?')[0].split('#')[0].trim();
              try {
                const noteRes = await fetch(`/api/notes/${noteId}`);
                if (noteRes.ok) {
                  const noteData = await noteRes.json();
                  const note = noteData?.note;
                  if (note?.content) {
                    // 去除 markdown 格式和空白字符，获取前7个字符
                    const cleanContent = note.content
                      .replace(/[#*_`\[\]()]/g, '') // 去除 markdown 符号
                      .replace(/\s+/g, '') // 去除所有空白字符
                      .trim();
                    const preview = cleanContent.substring(0, 7);
                    if (preview) {
                      return {
                        ...visit,
                        notePreview: preview,
                      };
                    }
                  }
                }
              } catch (error) {
                console.error(`[AnalyticsV2] Failed to fetch note content for ${noteId}:`, error);
              }
            }
            return visit;
          })
        );
        
        setUserVisits(visitsWithTitles);
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error);
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

  // 生成完整的最近N天的日期范围（用于每日访问趋势，始终显示最近N天）
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

  // 准备图表数据（每日访问趋势始终显示最近N天）
  const allDates = generateDateRange(days);
  const dailyStatsMap = new Map(data.dailyStats.map(stat => [stat.date, stat]));
  const chartData = allDates.map((date) => {
    const stat = dailyStatsMap.get(date);
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return null;
      }
      return {
        date: dateObj.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        dateKey: date,
        views: stat?.views || 0,
        uniqueVisitors: stat?.uniqueVisitors || 0,
        sessions: stat?.sessions || 0,
        bounceRate: stat?.bounceRate || 0,
        avgDuration: stat?.avgDuration || 0,
      };
    } catch {
      return null;
    }
  }).filter((item): item is NonNullable<typeof item> => item !== null);

  // 处理柱状图点击事件
  const handleBarClick = (dateKey: string) => {
    setSelectedDate(dateKey);
  };

  const maxViews = chartData.length > 0 ? Math.max(...chartData.map(d => d.views), 1) : 1;

  // 如果还没有加载标题，使用原始数据
  const displayStats = pageViewStatsWithTitles.length > 0 
    ? pageViewStatsWithTitles 
    : data.pageViewStats;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">访问统计 V2</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">更详细的用户行为分析</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black flex-1 sm:flex-none min-w-[140px]"
            title="选择日期查看该天的数据"
          />
          <select
            value={days}
            onChange={(e) => {
              setDays(Number(e.target.value));
              // 选择天数时，保持当前日期选择（用于页面统计详情）
            }}
            className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black flex-1 sm:flex-none min-w-[120px]"
          >
            <option value={7}>最近 7 天</option>
            <option value={15}>最近 15 天</option>
            <option value={30}>最近 30 天</option>
            <option value={60}>最近 60 天</option>
            <option value={90}>最近 90 天</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="px-3 sm:px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 transition-colors whitespace-nowrap"
          >
            刷新
          </button>
          <button
            onClick={() => router.push('/admin/analytics')}
            className="px-3 sm:px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            查看 V1 统计
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">总浏览量</h3>
          <p className="text-xl sm:text-3xl font-bold">{data.summary.totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">独立访客</h3>
          <p className="text-xl sm:text-3xl font-bold text-blue-600">{data.summary.totalUniqueVisitors.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">当日访问次数最多</h3>
          <p className="text-lg sm:text-xl font-bold text-purple-600 break-all">
            {data.summary.mostVisitedUserIP}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {data.summary.mostVisitedUserCount} 次访问
          </p>
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <h3 className="text-xs sm:text-sm font-medium text-gray-600 mb-2">当日浏览总时长最长</h3>
          <p className="text-lg sm:text-xl font-bold text-orange-600 break-all">
            {data.summary.longestDurationUserIP}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {data.summary.longestDurationUserTotal > 0
              ? `${Math.floor(data.summary.longestDurationUserTotal / 60)}分${data.summary.longestDurationUserTotal % 60}秒`
              : '-'}
          </p>
        </div>
      </div>

      {/* 每日访问量趋势图 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">每日访问量趋势</h2>
        <div className="flex items-end gap-1 h-64 overflow-x-auto pb-4">
          {chartData.length === 0 ? (
            <div className="w-full text-center text-gray-500 py-20">暂无数据</div>
          ) : (
            chartData.map((item, index) => (
              <div
                key={index}
                className="flex-1 min-w-[40px] flex flex-col items-center group relative"
              >
                <div className="w-full flex flex-col items-center justify-end h-full">
                  <div
                    className={`w-full transition-colors rounded-t min-h-[4px] cursor-pointer ${
                      selectedDate === item.dateKey
                        ? 'bg-blue-700 hover:bg-blue-800'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                    style={{ height: `${Math.max((item.views / maxViews) * 240, 4)}px` }}
                    title={`${item.dateKey}: ${item.views} 次访问（点击查看该天详情）`}
                    onClick={() => handleBarClick(item.dateKey)}
                  />
                </div>
                <div className="mt-2 text-xs text-center whitespace-nowrap transform -rotate-45 origin-top-left text-gray-600">
                  {item.date}
                </div>
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  <div>访问: {item.views}</div>
                  <div>访客: {item.uniqueVisitors}</div>
                  <div>会话: {item.sessions}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 页面统计表格 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">页面统计详情</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">页面</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">浏览量</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">独立访客</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">平均停留</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">滚动深度</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">跳出率</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">离开率</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">参与度</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">图片点击</th>
              </tr>
            </thead>
            <tbody>
              {displayStats.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-10">
                    暂无数据
                  </td>
                </tr>
              ) : (
                displayStats.map((stat, index) => {
                  // 对于文章页面，优先显示标题，如果没有标题则显示slug，最后才显示"文章详情"
                  // 对于随记页面，显示内容预览
                  let displayName: string;
                  let shouldShowPath = true; // 是否显示路径
                  if (stat.path.startsWith('/post/')) {
                    if (stat.title) {
                      displayName = stat.title;
                    } else {
                      // 尝试从路径中提取slug作为显示名称
                      const slug = stat.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
                      try {
                        displayName = decodeURIComponent(slug);
                      } catch {
                        displayName = slug || '文章详情';
                      }
                    }
                    // 文章页面始终显示路径
                    shouldShowPath = true;
                  } else if (stat.path.startsWith('/notes/')) {
                    // 随记页面：如果有内容预览，显示"随记：{前7个字符}"，否则显示"随记"
                    if (stat.notePreview) {
                      displayName = `随记：${stat.notePreview}`;
                    } else {
                      displayName = '随记';
                    }
                    // 随记页面不显示路径
                    shouldShowPath = false;
                  } else {
                    displayName = getPathName(stat.path);
                    // 如果路径有对应的中文名称（不是默认返回的路径本身），则不显示路径
                    shouldShowPath = displayName === stat.path;
                  }

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{displayName}</div>
                        {shouldShowPath && (
                          <div className="text-xs text-gray-500 mt-1">{stat.path}</div>
                        )}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">{stat.views}</td>
                      <td className="text-right py-3 px-4">{stat.uniqueVisitors}</td>
                      <td className="text-right py-3 px-4">
                        {stat.avgDuration > 0
                          ? `${Math.floor(stat.avgDuration / 60)}分${stat.avgDuration % 60}秒`
                          : '-'}
                      </td>
                      <td className="text-right py-3 px-4">{stat.avgScrollDepth}%</td>
                      <td className="text-right py-3 px-4">
                        <span className={stat.bounceRate > 50 ? 'text-red-600' : 'text-gray-700'}>
                          {stat.bounceRate?.toFixed(1) || '-'}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={stat.exitRate > 50 ? 'text-orange-600' : 'text-gray-700'}>
                          {stat.exitRate?.toFixed(1) || '-'}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={stat.avgEngagementScore && stat.avgEngagementScore > 5 ? 'text-green-600' : 'text-gray-700'}>
                          {stat.avgEngagementScore?.toFixed(2) || '-'}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4">
                        {stat.imageClickCount || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 滚动深度详情 */}
        {pageViewStatsWithTitles.some(stat => stat.scrollDepth25 !== undefined) && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">滚动深度分布</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">页面</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">25%</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">50%</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">75%</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">100%</th>
                  </tr>
                </thead>
                <tbody>
                  {displayStats
                    .filter(stat => stat.scrollDepth25 !== undefined)
                    .map((stat, index) => {
                      // 对于文章页面，优先显示标题，如果没有标题则显示slug，最后才显示"文章详情"
                      // 对于随记页面，显示内容预览
                      let displayName: string;
                      if (stat.path.startsWith('/post/')) {
                        if (stat.title) {
                          displayName = stat.title;
                        } else {
                          // 尝试从路径中提取slug作为显示名称
                          const slug = stat.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
                          try {
                            displayName = decodeURIComponent(slug);
                          } catch {
                            displayName = slug || '文章详情';
                          }
                        }
                      } else if (stat.path.startsWith('/notes/')) {
                        // 随记页面：如果有内容预览，显示"随记：{前7个字符}"，否则显示"随记"
                        if (stat.notePreview) {
                          displayName = `随记：${stat.notePreview}`;
                        } else {
                          displayName = '随记';
                        }
                      } else {
                        displayName = getPathName(stat.path);
                      }

                      return (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{displayName}</td>
                          <td className="text-right py-3 px-4">{stat.scrollDepth25 || 0}</td>
                          <td className="text-right py-3 px-4">{stat.scrollDepth50 || 0}</td>
                          <td className="text-right py-3 px-4">{stat.scrollDepth75 || 0}</td>
                          <td className="text-right py-3 px-4">{stat.scrollDepth100 || 0}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 用户画像 */}
      <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200 mt-6 sm:mt-8">
        <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 pb-3 border-b border-gray-200">用户画像</h2>
        
        {usersLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
            <p className="mt-2 text-gray-600 text-sm">加载中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-gray-500 py-10">暂无用户数据</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* 用户列表 */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold mb-4 pb-3 border-b border-gray-200">用户列表 ({users.length})</h3>
                <div className="space-y-3 max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-500px)] overflow-y-auto">
                  {users.map((user) => (
                    <div
                      key={user.userId}
                      onClick={() => fetchUserDetails(user.userId)}
                      className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedUser?.userId === user.userId
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-gray-900">{user.ip}</span>
                          {user.isNewUser && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                              新用户
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          访问 {user.visitCount} 次
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{user.browser}</span>
                          {user.browserVersion && <span className="text-gray-500">{user.browserVersion}</span>}
                          <span className="text-gray-400">·</span>
                          <span>{user.os}</span>
                        </div>
                        <div className="text-gray-500">
                          {[user.country, user.region, user.city, user.district].filter(Boolean).join(' · ') || '未知位置'}
                        </div>
                        <div className="text-gray-500">
                          {user.deviceType === 'mobile' ? '移动设备' : user.deviceType === 'desktop' ? '桌面设备' : user.deviceType === 'tablet' ? '平板设备' : '未知'}
                          {user.device && ` · ${user.device}`}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                        最后访问: <span className="font-medium">{new Date(user.lastVisitTime).toLocaleString('zh-CN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 用户详情 */}
            <div className="lg:col-span-2">
              {selectedUser ? (
                <>
                  {/* 用户画像 */}
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200 mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 pb-3 border-b border-gray-200">用户画像</h3>
                    
                    {/* 基本信息 */}
                    <div className="mb-4 sm:mb-6">
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">基本信息</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">IP地址</div>
                          <div className="font-medium text-sm">{selectedUser.ip}</div>
                        </div>
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">用户类型</div>
                          <div>
                            {selectedUser.isNewUser ? (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                                新用户（首次访问）
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                老用户（访问 {selectedUser.visitCount} 次）
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">浏览器</div>
                          <div className="font-medium text-sm">
                            {selectedUser.browser} {selectedUser.browserVersion || ''}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">操作系统</div>
                          <div className="font-medium text-sm">
                            {selectedUser.os} {selectedUser.osVersion || ''}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">设备类型</div>
                          <div className="font-medium text-sm">
                            {selectedUser.deviceType === 'mobile' ? '移动设备' : selectedUser.deviceType === 'desktop' ? '桌面设备' : selectedUser.deviceType === 'tablet' ? '平板设备' : '未知'}
                            {selectedUser.device && ` · ${selectedUser.device}`}
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">地理位置</div>
                          <div className="font-medium text-sm">
                            {[selectedUser.country, selectedUser.region, selectedUser.city, selectedUser.district]
                              .filter(Boolean)
                              .join(' · ') || '未知'}
                          </div>
                        </div>
                        {selectedUser.isp && (
                          <div className="bg-white p-3 rounded-md">
                            <div className="text-xs text-gray-500 mb-1">ISP</div>
                            <div className="font-medium text-sm">{selectedUser.isp}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 访问统计 */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-3">访问统计</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                          <div className="text-xs text-blue-600 mb-1">总访问次数</div>
                          <div className="text-base sm:text-lg font-bold text-blue-700">{selectedUser.visitCount}</div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-md border border-purple-100">
                          <div className="text-xs text-purple-600 mb-1">总会话数</div>
                          <div className="text-base sm:text-lg font-bold text-purple-700">{selectedUser.totalSessions}</div>
                        </div>
                        <div className="bg-green-50 p-3 rounded-md border border-green-100">
                          <div className="text-xs text-green-600 mb-1">总页面浏览</div>
                          <div className="text-base sm:text-lg font-bold text-green-700">{selectedUser.totalPageViews}</div>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-md border border-orange-100">
                          <div className="text-xs text-orange-600 mb-1">平均停留时长</div>
                          <div className="text-base sm:text-lg font-bold text-orange-700">
                            {selectedUser.avgDuration > 0
                              ? `${Math.floor(selectedUser.avgDuration / 60)}分${selectedUser.avgDuration % 60}秒`
                              : '-'}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">首次访问</div>
                          <div className="font-medium text-sm">{new Date(selectedUser.firstVisitTime).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}</div>
                        </div>
                        <div className="bg-white p-3 rounded-md">
                          <div className="text-xs text-gray-500 mb-1">最后访问</div>
                          <div className="font-medium text-sm">{new Date(selectedUser.lastVisitTime).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 访问历史 */}
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
                    <h3 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6 pb-3 border-b border-gray-200">访问历史</h3>
                    <div className="w-full overflow-x-auto">
                      <table className="w-full table-fixed min-w-[600px]">
                        <thead>
                          <tr className="border-b-2 border-gray-300 bg-white">
                            <th className="text-left py-3 px-2 font-semibold text-gray-700 text-xs w-[30%]">页面</th>
                            <th className="text-left py-3 px-2 font-semibold text-gray-700 text-xs w-[18%]">进入时间</th>
                            <th className="text-left py-3 px-2 font-semibold text-gray-700 text-xs w-[18%]">离开时间</th>
                            <th className="text-right py-3 px-2 font-semibold text-gray-700 text-xs w-[12%]">停留时长</th>
                            <th className="text-right py-3 px-2 font-semibold text-gray-700 text-xs w-[11%]">滚动深度</th>
                            <th className="text-right py-3 px-2 font-semibold text-gray-700 text-xs w-[11%]">图片点击</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userVisits.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="text-center text-gray-500 py-10">
                                暂无访问记录
                              </td>
                            </tr>
                          ) : (
                            userVisits.map((visit, index) => {
                              let displayName: string;
                              let shouldShowPath = true;
                              if (visit.path.startsWith('/post/')) {
                                if (visit.title) {
                                  displayName = visit.title;
                                } else {
                                  const slug = visit.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
                                  try {
                                    displayName = decodeURIComponent(slug);
                                  } catch {
                                    displayName = slug || '文章详情';
                                  }
                                }
                                shouldShowPath = true;
                              } else if (visit.path.startsWith('/notes/')) {
                                if (visit.notePreview) {
                                  displayName = `随记：${visit.notePreview}`;
                                } else {
                                  displayName = '随记';
                                }
                                shouldShowPath = false;
                              } else {
                                displayName = getPathName(visit.path);
                                shouldShowPath = displayName === visit.path;
                              }

                              const formatTimeShort = (timestamp: number) => {
                                return new Date(timestamp).toLocaleString('zh-CN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                });
                              };

                              const formatDuration = (seconds?: number) => {
                                if (!seconds || seconds === 0) return '-';
                                const mins = Math.floor(seconds / 60);
                                const secs = seconds % 60;
                                return `${mins}分${secs}秒`;
                              };

                              return (
                                <tr key={index} className="border-b border-gray-100 hover:bg-white transition-colors bg-white">
                                  <td className="py-2 px-2">
                                    <div className="font-medium text-xs truncate" title={displayName}>{displayName}</div>
                                    {shouldShowPath && (
                                      <div className="text-xs text-gray-400 mt-0.5 font-mono truncate" title={visit.path}>{visit.path}</div>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-xs text-gray-600">{formatTimeShort(visit.startTime)}</td>
                                  <td className="py-2 px-2 text-xs text-gray-600">
                                    {visit.endTime ? formatTimeShort(visit.endTime) : <span className="text-gray-400">-</span>}
                                  </td>
                                  <td className="text-right py-2 px-2 text-xs font-medium">{formatDuration(visit.duration)}</td>
                                  <td className="text-right py-2 px-2">
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                      {visit.scrollDepth}%
                                    </span>
                                  </td>
                                  <td className="text-right py-2 px-2">
                                    {visit.imageClickCount && visit.imageClickCount > 0 ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                        {visit.imageClickCount}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 text-center text-gray-500 py-20">
                  请从左侧选择一个用户查看详情
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

