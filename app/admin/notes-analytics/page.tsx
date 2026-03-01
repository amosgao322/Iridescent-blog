'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Note {
  id: string;
  content: string;
  date: string;
  createdAt: number;
  images?: string[];
  videos?: string[];
}

interface NoteStats {
  noteId: string;
  viewCount: number;
  uniqueViewers: number;
  totalViewDuration: number;
  avgViewDuration: number;
  imageClickCount: number;
  imageClicks: Array<{
    imageUrl: string;
    clickCount: number;
  }>;
}

interface UserNoteView {
  userId: string;
  sessionId: string;
  noteId: string;
  viewTime: number;
  viewDuration?: number;
  imageClicks: string[];
  timestamp: number;
}

interface UserInfo {
  userId: string;
  ip: string;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  deviceType?: string;
  device?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  firstVisitTime: number;
  lastVisitTime: number;
  visitCount: number;
  notesViewed: UserNoteView[];
}

interface NotesAnalyticsData {
  noteStats: NoteStats[];
  userViews: UserNoteView[];
  users: UserInfo[];
  totalNotes: number;
  totalViews: number;
  totalUniqueViewers: number;
}

export default function NotesAnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<NotesAnalyticsData | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const router = useRouter();

  // 获取随记信息
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch('/api/notes');
        if (res.ok) {
          const data = await res.json();
          setNotes(data.notes || []);
        }
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      }
    };
    fetchNotes();
  }, []);

  // 根据ID获取随记信息
  const getNoteInfo = (noteId: string): Note | undefined => {
    return notes.find(n => n.id === noteId);
  };

  // 获取文字预览
  const getTextPreview = (content: string, maxLength: number = 100): string => {
    if (!content) return '';
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return '';
    const firstLine = lines[0];
    if (firstLine.length <= maxLength) return firstLine;
    return firstLine.substring(0, maxLength) + '...';
  };

  // 格式化日期显示
  const formatNoteDate = (dateStr: string, createdAt: number): string => {
    try {
      const date = new Date(createdAt);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${year}年${month}月${day}日`;
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchAnalytics();
    } else {
      router.push('/admin');
    }
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      let url = '/api/notes/analytics';
      const params = new URLSearchParams();
      if (selectedNoteId) params.append('noteId', selectedNoteId);
      if (selectedUserId) params.append('userId', selectedUserId);
      if (params.toString()) url += '?' + params.toString();
      
      const res = await fetch(url);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch notes analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [selectedNoteId, selectedUserId, isAuthenticated]);

  const toggleNoteExpansion = (noteId: string) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const toggleUserExpansion = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
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

  // 获取设备类型显示文本
  const getDeviceTypeText = (deviceType?: string): string => {
    if (!deviceType) return '未知设备';
    const map: Record<string, string> = {
      'desktop': '🖥️ 桌面',
      'mobile': '📱 手机',
      'tablet': '📱 平板',
      'unknown': '❓ 未知',
    };
    return map[deviceType] || deviceType;
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">随记统计</h1>
        <button
          onClick={() => {
            setSelectedNoteId(null);
            setSelectedUserId(null);
          }}
          className="text-gray-600 hover:text-black"
        >
          清除筛选
        </button>
      </div>

      {/* 总体统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm text-gray-600 mb-2">总随记数</h3>
          <p className="text-3xl font-bold">{data.totalNotes}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm text-gray-600 mb-2">总浏览次数</h3>
          <p className="text-3xl font-bold">{data.totalViews}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-sm text-gray-600 mb-2">独立访客</h3>
          <p className="text-3xl font-bold">{data.totalUniqueViewers}</p>
        </div>
      </div>

      {/* 随记统计列表 - 可折叠 */}
      <details className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <summary className="text-xl font-semibold mb-4 cursor-pointer">随记访问统计</summary>
        {data.noteStats.length === 0 ? (
          <p className="text-gray-500">暂无统计数据</p>
        ) : (
          <div className="space-y-4">
            {data.noteStats.map((stat) => {
              const noteInfo = getNoteInfo(stat.noteId);
              return (
                <div key={stat.noteId} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {noteInfo ? (
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">
                                {formatNoteDate(noteInfo.date, noteInfo.createdAt)}
                              </h3>
                              <Link
                                href={`/notes/${stat.noteId}`}
                                target="_blank"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                查看随记
                              </Link>
                              <button
                                onClick={() => setSelectedNoteId(stat.noteId)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                查看统计
                              </button>
                            </div>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {getTextPreview(noteInfo.content)}
                            </p>
                            {noteInfo.images && noteInfo.images.length > 0 && (
                              <span className="text-xs text-gray-500">
                                📷 {noteInfo.images.length} 张图片
                              </span>
                            )}
                            {noteInfo.videos && noteInfo.videos.length > 0 && (
                              <span className="text-xs text-gray-500 ml-2">
                                🎥 {noteInfo.videos.length} 个视频
                              </span>
                            )}
                          </div>
                        ) : (
                          <div>
                            <h3 className="font-semibold">随记 ID: {stat.noteId}</h3>
                            <p className="text-xs text-gray-500">（随记信息加载中...）</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-600">浏览次数: </span>
                          <span className="font-semibold">{stat.viewCount}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">独立访客: </span>
                          <span className="font-semibold">{stat.uniqueViewers}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">平均时长: </span>
                          <span className="font-semibold">
                            {formatDuration(stat.avgViewDuration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">总时长: </span>
                          <span className="font-semibold">
                            {formatDuration(stat.totalViewDuration)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">图片点击: </span>
                          <span className="font-semibold">{stat.imageClickCount}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleNoteExpansion(stat.noteId)}
                      className="ml-4 text-gray-600 hover:text-black"
                    >
                      {expandedNotes.has(stat.noteId) ? '收起' : '展开'}
                    </button>
                  </div>
                  
                  {expandedNotes.has(stat.noteId) && (
                    <div className="mt-4 pl-4 border-l-2 border-gray-200">
                      {stat.imageClicks.length > 0 && (
                        <>
                          <h4 className="font-semibold mb-2 text-sm">图片点击详情:</h4>
                          <div className="space-y-1 mb-3">
                            {stat.imageClicks.map((click, idx) => (
                              <div key={idx} className="text-sm text-gray-600">
                                <span className="font-mono text-xs break-all">{click.imageUrl}</span>
                                <span className="ml-2">({click.clickCount}次)</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                      <div className="text-xs text-gray-500">
                        ID: {stat.noteId}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </details>

      {/* 用户浏览记录 - 以用户为中心展示 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">访客记录</h2>
        {!data.users || data.users.length === 0 ? (
          <p className="text-gray-500">暂无访客记录</p>
        ) : (
          <div className="space-y-6">
            {data.users.map((user) => {
              const isExpanded = expandedUsers.has(user.userId);
              return (
                <div key={user.userId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* 用户基础信息卡片 */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* 用户标识和基本信息 */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {user.ip ? user.ip.split('.').pop()?.slice(-2) || '?' : '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">
                              {user.city ? `${user.city}` : user.region ? `${user.region}` : '未知地区'}
                              {user.country && user.country !== 'CN' && ` (${user.country})`}
                            </h3>
                            <button
                              onClick={() => setSelectedUserId(user.userId)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              筛选此用户
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                            <div>
                              <span className="text-gray-500">IP: </span>
                              <span className="font-mono">{user.ip}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">浏览器: </span>
                              <span>{user.browser || '未知'}{user.browserVersion ? ` ${user.browserVersion}` : ''}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">系统: </span>
                              <span>{user.os || '未知'}{user.osVersion ? ` ${user.osVersion}` : ''}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">设备: </span>
                              <span>{getDeviceTypeText(user.deviceType)}{user.device ? ` (${user.device})` : ''}</span>
                            </div>
                          </div>
                          {user.isp && (
                            <div className="text-xs text-gray-500 mt-1">
                              ISP: {user.isp}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 访问统计 */}
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>访问次数: <span className="font-semibold text-gray-800">{user.visitCount}</span></span>
                        <span>浏览随记: <span className="font-semibold text-gray-800">{user.notesViewed.length}</span> 条</span>
                        <span>首次访问: <span className="font-semibold text-gray-800">{formatDate(user.firstVisitTime)}</span></span>
                        <span>最后访问: <span className="font-semibold text-gray-800">{formatDate(user.lastVisitTime)}</span></span>
                      </div>

                      {/* 浏览的随记列表 */}
                      {isExpanded && user.notesViewed.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-semibold mb-3 text-sm">浏览的随记 ({user.notesViewed.length} 条):</h4>
                          <div className="space-y-3">
                            {user.notesViewed.map((view, idx) => {
                              const noteInfo = getNoteInfo(view.noteId);
                              return (
                                <div key={idx} className="bg-gray-50 rounded p-3 border-l-4 border-blue-400">
                                  <div className="flex items-center gap-2 mb-2">
                                    {noteInfo ? (
                                      <>
                                        <span className="font-semibold text-sm">
                                          {formatNoteDate(noteInfo.date, noteInfo.createdAt)}
                                        </span>
                                        <Link
                                          href={`/notes/${view.noteId}`}
                                          target="_blank"
                                          className="text-blue-600 hover:text-blue-800 text-xs"
                                        >
                                          查看随记
                                        </Link>
                                      </>
                                    ) : (
                                      <span className="font-semibold text-sm">随记: {view.noteId}</span>
                                    )}
                                    <button
                                      onClick={() => setSelectedNoteId(view.noteId)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                    >
                                      查看统计
                                    </button>
                                  </div>
                                  {noteInfo && (
                                    <p className="text-gray-600 text-xs mb-2 line-clamp-2">
                                      {getTextPreview(noteInfo.content, 80)}
                                    </p>
                                  )}
                                  <div className="text-xs text-gray-500 space-y-1">
                                    <div>浏览时间: {formatDate(view.viewTime)}</div>
                                    {view.viewDuration && (
                                      <div>查看时长: {formatDuration(view.viewDuration)}</div>
                                    )}
                                    {view.imageClicks.length > 0 && (
                                      <div>
                                        点击了 {view.imageClicks.length} 张图片
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleUserExpansion(user.userId)}
                      className="ml-4 text-gray-600 hover:text-black text-sm whitespace-nowrap"
                    >
                      {isExpanded ? '收起' : '展开'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

