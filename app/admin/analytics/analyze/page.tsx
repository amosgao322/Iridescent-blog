'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getPathName } from '@/lib/path-names';
import { parseUserAgent, formatUserAgent } from '@/lib/user-agent-parser';

interface AnalysisResult {
  ip: string;
  totalVisits: number;
  timeSpan: {
    minutes: number;
    hours: string;
    start: string;
    end: string;
  };
  frequency: {
    visitsPerMinute: string;
    visitsPerHour: string;
  };
  intervals: {
    average: number;
    min: number;
    averageSeconds: string;
    minSeconds: string;
  };
  pathStats: Array<{ path: string; count: number; title?: string | null }>;
  userAgents: string[];
  location: {
    country?: string;
    region?: string;
    city?: string;
  };
  suspiciousPatterns: string[];
  isSuspicious: boolean;
  recentVisits: Array<{
    path: string;
    title?: string | null;
    timestamp: number;
    date: string;
    time: string;
    userAgent?: string;
  }>;
}

function AnalyzeIPContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);

    // 从URL参数获取IP
    const ipParam = searchParams.get('ip');
    if (ipParam) {
      setIp(ipParam);
      analyzeIP(ipParam);
    }
  }, [router, searchParams]);

  const analyzeIP = async (targetIP: string) => {
    if (!targetIP) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/analyze?ip=${encodeURIComponent(targetIP)}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        alert('分析失败');
      }
    } catch (error) {
      console.error('Error analyzing IP:', error);
      alert('分析失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => {
    if (!ip.trim()) {
      alert('请输入IP地址');
      return;
    }
    analyzeIP(ip);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-black mb-4"
        >
          ← 返回
        </button>
        <h1 className="text-3xl font-bold mb-4">IP访问分析</h1>
        <div className="flex gap-4">
          <input
            type="text"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="输入IP地址，例如：220.202.230.196"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? '分析中...' : '分析'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">分析中...</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* 警告提示 */}
          {result.isSuspicious && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-800 mb-2">⚠️ 可疑访问模式</h3>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {result.suspiciousPatterns.map((pattern, index) => (
                  <li key={index}>{pattern}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 基本信息 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">基本信息</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">IP地址</div>
                <div className="font-semibold">{result.ip}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">总访问次数</div>
                <div className="font-semibold text-red-600">{result.totalVisits}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">地理位置</div>
                <div className="font-semibold">
                  {result.location.country || '未知'}
                  {result.location.region && ` · ${result.location.region}`}
                  {result.location.city && ` · ${result.location.city}`}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">访问时长</div>
                <div className="font-semibold">
                  {result.timeSpan.hours} 小时
                </div>
              </div>
            </div>
          </div>

          {/* 访问频率 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">访问频率</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">每分钟访问</div>
                <div className="font-semibold text-orange-600">{result.frequency.visitsPerMinute} 次/分钟</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">每小时访问</div>
                <div className="font-semibold text-orange-600">{result.frequency.visitsPerHour} 次/小时</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">平均间隔</div>
                <div className="font-semibold">{result.intervals.averageSeconds} 秒</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">最短间隔</div>
                <div className="font-semibold text-red-600">{result.intervals.minSeconds} 秒</div>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <div>开始时间：{result.timeSpan.start}</div>
              <div>结束时间：{result.timeSpan.end}</div>
            </div>
          </div>

          {/* 访问路径统计 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">访问路径统计</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.pathStats.map((stat, index) => {
                // 如果是文章详情页且有标题，优先显示标题
                const displayName = stat.path.startsWith('/post/') && stat.title
                  ? stat.title
                  : getPathName(stat.path);
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 border-b border-gray-100">
                    <div className="flex-1">
                      <div className="font-medium">{displayName}</div>
                      <div className="text-xs text-gray-500 font-mono">{stat.path}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{stat.count}</span>
                      <span className="text-sm text-gray-500 ml-1">次</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User-Agent */}
          {result.userAgents.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">访问环境</h2>
              <div className="space-y-3">
                {result.userAgents.map((ua, index) => {
                  const parsed = parseUserAgent(ua);
                  const formatted = formatUserAgent(parsed);
                  
                  return (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        {formatted}
                      </div>
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          查看原始 User-Agent
                        </summary>
                        <div className="mt-2 text-xs font-mono bg-white p-2 rounded border border-gray-200 break-all text-gray-600">
                          {parsed.raw}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 最近访问记录 */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">最近访问记录（最近10条）</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.recentVisits.map((visit, index) => {
                // 如果是文章详情页且有标题，优先显示标题
                const displayName = visit.path.startsWith('/post/') && visit.title
                  ? visit.title
                  : getPathName(visit.path);
                
                return (
                  <div key={index} className="p-3 border-b border-gray-100 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{displayName}</span>
                      <span className="text-gray-500">{visit.time}</span>
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{visit.path}</div>
                    {visit.userAgent && (
                      <div className="text-xs text-gray-400 mt-1">
                        {formatUserAgent(parseUserAgent(visit.userAgent))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnalyzeIPPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <AnalyzeIPContent />
    </Suspense>
  );
}

