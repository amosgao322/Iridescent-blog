import { NextRequest, NextResponse } from 'next/server';
import {
  getPageViewStats,
  getEngagementStats,
  getDailyStats,
  getMostVisitedUserIP,
  getLongestDurationUserIP,
} from '@/lib/analytics-v2';

import fs from 'fs';
import path from 'path';

const logPath = path.join(process.cwd(), '.cursor/debug.log');

// 日志辅助函数（服务器端使用文件系统）
function logDebug(location: string, message: string, data: any, hypothesisId: string) {
  try {
    const logEntry = {
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId,
    };
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(logPath, logLine, 'utf8');
  } catch (error) {
    // 忽略日志写入错误
  }
}

export async function GET(request: NextRequest) {
  // #region agent log
  logDebug('app/api/analytics-v2/stats/route.ts:8', 'GET request started', { url: request.url }, 'A');
  // #endregion
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const path = searchParams.get('path') || undefined;
    const date = searchParams.get('date') || undefined; // 可选的日期参数（YYYY-MM-DD格式）

    // #region agent log
    logDebug('app/api/analytics-v2/stats/route.ts:15', 'Parameters parsed', { days, path, date }, 'A');
    // #endregion

    // 计算日期范围
    // 每日访问趋势：始终使用最近N天（不受date参数影响）
    const dailyEndDate = Date.now();
    const dailyStartDate = dailyEndDate - (days * 24 * 60 * 60 * 1000);
    
    // 页面统计详情：如果指定了日期，只查询该日期的数据；否则使用今天
    let pageStatsEndDate = Date.now();
    let pageStatsStartDate = pageStatsEndDate - (days * 24 * 60 * 60 * 1000);
    
    if (date) {
      const selectedDate = new Date(date);
      const today = new Date();
      const isToday = selectedDate.toDateString() === today.toDateString();
      
      // #region agent log
      logDebug('app/api/analytics-v2/stats/route.ts:25', 'Date processing', { date, selectedDate: selectedDate.toISOString(), today: today.toISOString(), isToday }, 'D');
      // #endregion
      
      if (!isToday) {
        // 如果选择的不是今天，则只查询该日期的数据
        selectedDate.setHours(0, 0, 0, 0);
        pageStatsStartDate = selectedDate.getTime();
        selectedDate.setHours(23, 59, 59, 999);
        pageStatsEndDate = selectedDate.getTime();
      } else {
        // 如果选择的是今天，则只查询今天的数据
        selectedDate.setHours(0, 0, 0, 0);
        pageStatsStartDate = selectedDate.getTime();
        selectedDate.setHours(23, 59, 59, 999);
        pageStatsEndDate = selectedDate.getTime();
      }
    } else {
      // 如果没有指定日期，默认只查询今天的数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      pageStatsStartDate = today.getTime();
      today.setHours(23, 59, 59, 999);
      pageStatsEndDate = today.getTime();
    }

    // #region agent log
    logDebug('app/api/analytics-v2/stats/route.ts:36', 'Before calling getPageViewStats', { pageStatsStartDate, pageStatsEndDate, path }, 'B');
    // #endregion

    // 获取统计数据（页面统计详情使用指定日期的范围）
    const pageViewStats = getPageViewStats(pageStatsStartDate, pageStatsEndDate, path);
    
    // #region agent log
    logDebug('app/api/analytics-v2/stats/route.ts:39', 'After getPageViewStats', { count: pageViewStats.length }, 'B');
    // #endregion
    
    const engagementStats = getEngagementStats(pageStatsStartDate, pageStatsEndDate, path);
    
    // #region agent log
    logDebug('app/api/analytics-v2/stats/route.ts:42', 'After getEngagementStats', { count: engagementStats.length }, 'B');
    // #endregion
    
    // 每日访问趋势始终使用最近N天
    const dailyStats = getDailyStats(dailyStartDate, dailyEndDate);
    
    // #region agent log
    logDebug('app/api/analytics-v2/stats/route.ts:45', 'After getDailyStats', { count: dailyStats.length }, 'B');
    // #endregion

    // 合并统计数据
    const statsMap = new Map();
    
    pageViewStats.forEach(stat => {
      statsMap.set(stat.path, { ...stat });
    });

    engagementStats.forEach(stat => {
      const existing = statsMap.get(stat.path) || {};
      statsMap.set(stat.path, {
        ...existing,
        ...stat,
      });
    });

    const combinedStats = Array.from(statsMap.values());

    // 获取当日访问次数最多用户的IP和浏览总时长最长用户的IP
    const mostVisitedUser = getMostVisitedUserIP(pageStatsStartDate, pageStatsEndDate);
    const longestDurationUser = getLongestDurationUserIP(pageStatsStartDate, pageStatsEndDate);

    return NextResponse.json({
      pageViewStats: combinedStats,
      dailyStats,
      summary: {
        totalViews: combinedStats.reduce((sum, stat) => sum + (stat.views || 0), 0),
        totalUniqueVisitors: combinedStats.reduce((sum, stat) => sum + (stat.uniqueVisitors || 0), 0),
        mostVisitedUserIP: mostVisitedUser?.ip || '-',
        mostVisitedUserCount: mostVisitedUser?.visitCount || 0,
        longestDurationUserIP: longestDurationUser?.ip || '-',
        longestDurationUserTotal: longestDurationUser?.totalDuration || 0,
      },
    });
  } catch (error) {
    // #region agent log
    logDebug('app/api/analytics-v2/stats/route.ts:71', 'Error caught', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'C');
    // #endregion
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

