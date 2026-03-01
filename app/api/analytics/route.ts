import { NextRequest, NextResponse } from 'next/server';
import {
  getDailyStats,
  getLocationStats,
  getPathStats,
  getTotalVisits,
  getTodayVisits,
  getUniqueVisitors,
  getAverageDuration,
} from '@/lib/analytics';
import { getPostBySlug } from '@/lib/posts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '15');
    const date = searchParams.get('date') || undefined; // 可选的日期参数

    const dailyStats = getDailyStats(days);
    const locationStats = getLocationStats(date);
    const pathStats = getPathStats(20, date);
    const totalVisits = getTotalVisits();
    const todayVisits = getTodayVisits();
    const uniqueVisitors = getUniqueVisitors();

    // 为路径统计添加文章标题（如果是文章详情页）
    const pathStatsWithTitles = pathStats.map((stat) => {
      if (stat.path.startsWith('/post/')) {
        // 提取 slug，移除 /post/ 前缀，并处理可能的查询参数和锚点
        let slug = stat.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
        
        // 尝试解码 URL 编码的 slug（可能包含中文字符）
        try {
          // 先尝试整体解码
          slug = decodeURIComponent(slug);
        } catch (e) {
          // 如果整体解码失败，尝试分段解码（处理部分编码的情况）
          try {
            slug = slug.split('-').map(part => {
              try {
                return decodeURIComponent(part);
              } catch {
                return part;
              }
            }).join('-');
          } catch {
            // 如果都失败，使用原始 slug
          }
        }
        
        // 使用 getPostBySlug 获取文章信息
        const post = getPostBySlug(slug);
        
        return {
          ...stat,
          title: post?.title || null,
        };
      }
      return stat;
    });

    // 转换地理位置统计为数组格式，便于前端展示
    const locationArray = Object.entries(locationStats)
      .map(([ip, data]) => ({
        ip,
        count: data.count,
        country: data.country,
        region: data.region,
        city: data.city,
        paths: data.paths || [], // 每个IP访问的页面列表
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100); // 只返回前 100 个

    const averageDuration = getAverageDuration(date);

    return NextResponse.json({
      dailyStats,
      locationStats: locationArray,
      pathStats: pathStatsWithTitles,
      totalVisits,
      todayVisits,
      uniqueVisitors,
      averageDuration,
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

