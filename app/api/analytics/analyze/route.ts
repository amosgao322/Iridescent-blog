import { NextRequest, NextResponse } from 'next/server';
import { getAllVisits } from '@/lib/analytics';
import { getPostBySlug } from '@/lib/posts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ip = searchParams.get('ip');

    if (!ip) {
      return NextResponse.json(
        { error: '请提供IP地址' },
        { status: 400 }
      );
    }

    const visits = getAllVisits();
    const ipVisits = visits.filter(v => v.ip === ip);

    if (ipVisits.length === 0) {
      return NextResponse.json({
        ip,
        totalVisits: 0,
        message: '未找到该IP的访问记录',
      });
    }

    // 按时间排序
    ipVisits.sort((a, b) => a.timestamp - b.timestamp);

    // 分析访问模式
    const firstVisit = ipVisits[0];
    const lastVisit = ipVisits[ipVisits.length - 1];
    const timeSpan = lastVisit.timestamp - firstVisit.timestamp; // 毫秒
    const timeSpanMinutes = Math.round(timeSpan / 1000 / 60);
    const timeSpanHours = (timeSpan / 1000 / 60 / 60).toFixed(2);

    // 计算访问频率
    const visitsPerMinute = ipVisits.length / Math.max(timeSpanMinutes, 1);
    const visitsPerHour = ipVisits.length / Math.max(parseFloat(timeSpanHours), 0.01);

    // 统计访问的路径（包含文章标题）
    const pathStats: Record<string, number> = {};
    ipVisits.forEach(visit => {
      pathStats[visit.path] = (pathStats[visit.path] || 0) + 1;
    });

    const pathArray = Object.entries(pathStats)
      .map(([path, count]) => {
        // 如果是文章详情页，获取文章标题
        let title: string | null = null;
        if (path.startsWith('/post/')) {
          let slug = path.replace('/post/', '').split('?')[0].split('#')[0].trim();
          try {
            slug = decodeURIComponent(slug);
          } catch (e) {
            // 如果解码失败，使用原始slug
          }
          const post = getPostBySlug(slug);
          title = post?.title || null;
        }
        return { path, count, title };
      })
      .sort((a, b) => b.count - a.count);

    // 检查是否有异常模式
    const suspiciousPatterns: string[] = [];
    
    // 检查访问频率
    if (visitsPerMinute > 10) {
      suspiciousPatterns.push(`访问频率过高：每分钟 ${visitsPerMinute.toFixed(2)} 次`);
    }
    
    // 检查是否有大量重复路径
    const maxPathCount = Math.max(...pathArray.map(p => p.count));
    if (maxPathCount > ipVisits.length * 0.8) {
      suspiciousPatterns.push(`大量重复访问同一路径：${pathArray[0].path} (${maxPathCount}次)`);
    }

    // 检查时间间隔
    const intervals: number[] = [];
    for (let i = 1; i < ipVisits.length; i++) {
      intervals.push(ipVisits[i].timestamp - ipVisits[i - 1].timestamp);
    }
    const avgInterval = intervals.length > 0 
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
      : 0;
    const minInterval = intervals.length > 0 ? Math.min(...intervals) : 0;

    if (minInterval < 1000) { // 小于1秒
      suspiciousPatterns.push(`访问间隔过短：最短间隔 ${minInterval}ms`);
    }

    // 检查User-Agent
    const userAgents = new Set(ipVisits.map(v => v.userAgent).filter(Boolean));
    const hasSuspiciousUA = Array.from(userAgents).some(ua => 
      !ua || 
      ua.includes('bot') || 
      ua.includes('crawler') || 
      ua.includes('spider') ||
      ua.length < 10
    );

    if (hasSuspiciousUA) {
      suspiciousPatterns.push('检测到可疑的User-Agent');
    }

    // 最近访问记录（最近10条）
    const recentVisits = ipVisits.slice(-10).map(v => {
      // 如果是文章详情页，获取文章标题
      let title: string | null = null;
      if (v.path.startsWith('/post/')) {
        let slug = v.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
        try {
          slug = decodeURIComponent(slug);
        } catch (e) {
          // 如果解码失败，使用原始slug
        }
        const post = getPostBySlug(slug);
        title = post?.title || null;
      }
      return {
        path: v.path,
        title,
        timestamp: v.timestamp,
        date: v.date,
        time: new Date(v.timestamp).toLocaleString('zh-CN'),
        userAgent: v.userAgent,
      };
    });

    return NextResponse.json({
      ip,
      totalVisits: ipVisits.length,
      timeSpan: {
        minutes: timeSpanMinutes,
        hours: timeSpanHours,
        start: new Date(firstVisit.timestamp).toLocaleString('zh-CN'),
        end: new Date(lastVisit.timestamp).toLocaleString('zh-CN'),
      },
      frequency: {
        visitsPerMinute: visitsPerMinute.toFixed(2),
        visitsPerHour: visitsPerHour.toFixed(2),
      },
      intervals: {
        average: Math.round(avgInterval),
        min: minInterval,
        averageSeconds: (avgInterval / 1000).toFixed(2),
        minSeconds: (minInterval / 1000).toFixed(2),
      },
      pathStats: pathArray,
      userAgents: Array.from(userAgents),
      location: {
        country: firstVisit.country,
        region: firstVisit.region,
        city: firstVisit.city,
      },
      suspiciousPatterns,
      isSuspicious: suspiciousPatterns.length > 0,
      recentVisits,
    });
  } catch (error) {
    console.error('Error analyzing IP:', error);
    return NextResponse.json(
      { error: '分析失败' },
      { status: 500 }
    );
  }
}

