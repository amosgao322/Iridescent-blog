import { NextRequest, NextResponse } from 'next/server';
import { getAllVisits } from '@/lib/analytics';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { getAboutContent } from '@/lib/about';
import { getPathName } from '@/lib/path-names';

interface PostDurationStat {
  slug: string;
  path: string;
  title: string;
  visitCount: number;
  avgDuration: number; // 平均停留时间（秒）
  maxDuration: number; // 最长停留时间（秒）
  minDuration: number; // 最短停留时间（秒）
  totalDuration: number; // 总停留时间（秒）
  userVisits: Array<{
    ip: string;
    country: string | undefined;
    region: string | undefined;
    city: string | undefined;
    userAgent: string | undefined;
    duration: number;
    timestamp: number;
    startTime: number;
    endTime: number;
    date: string;
    visitCount: number; // 该用户访问该页面的总次数
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // 可选的日期过滤

    console.log(`[PostDuration] API called, date filter: ${date || 'none'}`);
    
    const visits = getAllVisits();
    const posts = getAllPosts();
    
    console.log(`[PostDuration] Total visits: ${visits.length}, Total posts: ${posts.length}`);
    
    // 调试：检查访问记录中是否有 lastActivityTime
    const visitsWithLastActivity = visits.filter(v => v.lastActivityTime);
    console.log(`[PostDuration] Visits with lastActivityTime: ${visitsWithLastActivity.length}`);
    if (visitsWithLastActivity.length > 0) {
      visitsWithLastActivity.slice(0, 3).forEach(v => {
        console.log(`[PostDuration] Sample visit with lastActivityTime: visitId=${v.id}, path=${v.path}, duration=${v.duration}, lastActivityTime=${new Date(v.lastActivityTime!).toISOString()}`);
      });
    }

    // 过滤访问记录（包含文章和关于页面）
    // 注意：先不过滤 duration，以便统计所有访问，即使停留时间还没记录
    const filteredVisits = date
      ? visits.filter(v => v.date === date && (v.path.startsWith('/post/') || v.path === '/about'))
      : visits.filter(v => v.path.startsWith('/post/') || v.path === '/about');

    // 按文章路径分组统计
    const postStatsMap: Record<string, {
      visits: typeof filteredVisits;
      slug: string;
      title: string;
    }> = {};

    filteredVisits.forEach(visit => {
      let slug = '';
      let title = '';

      // 处理关于页面
      if (visit.path === '/about') {
        slug = 'about';
        const aboutContent = getAboutContent();
        title = aboutContent.name || '关于';
      } 
      // 处理文章页面
      else if (visit.path.startsWith('/post/')) {
        // 提取slug（移除 /post/ 前缀，处理查询参数和锚点）
        slug = visit.path.replace('/post/', '').split('?')[0].split('#')[0].trim();
        
        // 尝试解码URL编码的slug
        try {
          slug = decodeURIComponent(slug);
        } catch (e) {
          // 如果解码失败，使用原始slug
        }

        // 获取文章信息
        const post = getPostBySlug(slug);
        title = post?.title || slug;
      } else {
        // 其他页面使用路径名称
        slug = visit.path;
        title = getPathName(visit.path);
      }

      if (!postStatsMap[visit.path]) {
        postStatsMap[visit.path] = {
          visits: [],
          slug,
          title,
        };
      }

      postStatsMap[visit.path].visits.push(visit);
    });

    // 转换为统计数组
    const postStats: PostDurationStat[] = Object.entries(postStatsMap).map(([path, data]) => {
      // 计算每个访问的实际停留时间（优先使用 endTime，其次使用 lastActivityTime）
      const visitsWithCalculatedDuration = data.visits.map(v => {
        let calculatedDuration = v.duration || 0;
        let calculatedEndTime = v.timestamp + (v.duration || 0) * 1000;
        
        // 优先使用 endTime 字段（即使 duration 很小，endTime 也可能已经被设置）
        if (v.endTime && v.endTime > v.timestamp) {
          calculatedEndTime = v.endTime;
          calculatedDuration = Math.round((v.endTime - v.timestamp) / 1000);
        } else if (v.lastActivityTime && v.lastActivityTime > v.timestamp) {
          // 其次使用 lastActivityTime
          const timeSinceLastActivity = Date.now() - v.lastActivityTime;
          if (timeSinceLastActivity > 5000) {
            // 超过5秒没有心跳，认为用户已离开，使用 lastActivityTime 计算
            calculatedEndTime = v.lastActivityTime;
            calculatedDuration = Math.round((v.lastActivityTime - v.timestamp) / 1000);
          } else {
            // 5秒内还有心跳，说明用户可能还在页面，使用 lastActivityTime 计算停留时间
            calculatedEndTime = v.lastActivityTime;
            calculatedDuration = Math.round((v.lastActivityTime - v.timestamp) / 1000);
          }
        } else if (v.duration && v.duration > 0) {
          // 最后使用 duration（即使 < 3 秒也使用，确保 endTime 能被计算出来）
          calculatedEndTime = v.timestamp + (v.duration * 1000);
          calculatedDuration = v.duration;
        }
        
        return {
          ...v,
          calculatedDuration, // 添加计算后的停留时间
          calculatedEndTime,
        };
      });
      
      // 分离有停留时间的访问，且停留时间 >= 3秒（使用计算后的停留时间）
      const visitsWithDuration = visitsWithCalculatedDuration.filter(v => 
        v.calculatedDuration >= 3
      );
      const durations = visitsWithDuration.map(v => v.calculatedDuration);
      
      // 即使没有停留时间数据，也显示访问统计
      // 但停留时间相关的统计只基于停留时间 >= 3秒的访问
      const avgDuration = durations.length > 0 
        ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
        : 0;
      const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
      const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);

      // 按用户（IP）分组，显示每个用户的浏览记录
      const userVisitsMap: Record<string, typeof data.visits> = {};
      data.visits.forEach(visit => {
        const key = visit.ip;
        if (!userVisitsMap[key]) {
          userVisitsMap[key] = [];
        }
        userVisitsMap[key].push(visit);
      });

      // 转换为用户访问数组（每个用户显示所有访问的总停留时间）
      const userVisits = Object.entries(userVisitsMap).map(([ip, visits]) => {
        // 为每个访问计算实际停留时间（优先使用 lastActivityTime）
        const visitsWithCalculatedDuration = visits.map(v => {
          let calculatedDuration = v.duration || 0;
          let calculatedEndTime = v.timestamp + (v.duration || 0) * 1000;
          
          // 优先使用 endTime 字段
          if (v.endTime && v.endTime > v.timestamp) {
            calculatedEndTime = v.endTime;
            calculatedDuration = Math.round((v.endTime - v.timestamp) / 1000);
          } else if (v.lastActivityTime && v.lastActivityTime > v.timestamp) {
            // 其次使用 lastActivityTime
            const timeSinceLastActivity = Date.now() - v.lastActivityTime;
            if (timeSinceLastActivity > 5000) {
              // 超过5秒没有心跳，认为用户已离开，使用 lastActivityTime 计算
              calculatedEndTime = v.lastActivityTime;
              calculatedDuration = Math.round((v.lastActivityTime - v.timestamp) / 1000);
            } else {
              // 5秒内还有心跳，说明用户可能还在页面，使用 lastActivityTime 计算停留时间
              calculatedEndTime = v.lastActivityTime;
              calculatedDuration = Math.round((v.lastActivityTime - v.timestamp) / 1000);
            }
          } else if (v.duration && v.duration > 0 && v.duration >= 3) {
            // 最后使用 duration
            calculatedEndTime = v.timestamp + (v.duration * 1000);
            calculatedDuration = v.duration;
          }
          
          return {
            ...v,
            calculatedDuration,
            calculatedEndTime,
          };
        });
        
        // 计算该用户所有访问的总停留时间（只统计 >= 3秒的访问）
        const validVisits = visitsWithCalculatedDuration.filter(v => 
          (v as any).calculatedDuration >= 3
        );
        const totalDuration = validVisits.reduce((sum, v) => {
          return sum + ((v as any).calculatedDuration || 0);
        }, 0);
        
        // 找到最早开始时间和最晚结束时间（用于显示）
        const earliestStartTime = visits.reduce((min, v) => 
          v.timestamp < min ? v.timestamp : min, visits[0].timestamp
        );
        const latestEndTime = visitsWithCalculatedDuration.reduce((max, v) => {
          const endTime = (v as any).calculatedEndTime || v.timestamp;
          return endTime > max ? endTime : max;
        }, visitsWithCalculatedDuration[0]?.timestamp || Date.now());
        
        // 选择最长的一次访问用于显示其他信息（如地理位置、User-Agent等）
        const longestVisit = visitsWithCalculatedDuration.reduce((max, v) => {
          const maxDuration = (max as any).calculatedDuration || 0;
          const vDuration = (v as any).calculatedDuration || 0;
          return vDuration > maxDuration ? v : max;
        });

        // 计算该用户的总访问次数
        const visitCount = visits.length;

        return {
          ip,
          country: longestVisit.country,
          region: longestVisit.region,
          city: longestVisit.city,
          userAgent: longestVisit.userAgent,
          duration: totalDuration, // 使用所有访问的总停留时间
          timestamp: earliestStartTime,
          startTime: earliestStartTime,
          endTime: latestEndTime,
          date: longestVisit.date,
          visitCount, // 该用户访问该页面的总次数
        };
      }).sort((a, b) => b.duration - a.duration);

      return {
        slug: data.slug,
        path,
        title: data.title,
        visitCount: data.visits.length,
        avgDuration,
        maxDuration,
        minDuration,
        totalDuration,
        userVisits,
      };
    }).filter((stat): stat is PostDurationStat => stat !== null);

    // 按平均停留时间排序（降序），没有停留时间的排在最后
    postStats.sort((a, b) => {
      // 如果两个都有停留时间，按平均停留时间排序
      if (a.avgDuration > 0 && b.avgDuration > 0) {
        return b.avgDuration - a.avgDuration;
      }
      // 如果只有一个有停留时间，有停留时间的排在前面
      if (a.avgDuration > 0 && b.avgDuration === 0) {
        return -1;
      }
      if (a.avgDuration === 0 && b.avgDuration > 0) {
        return 1;
      }
      // 如果都没有停留时间，按访问次数排序
      return b.visitCount - a.visitCount;
    });

    return NextResponse.json({ posts: postStats });
  } catch (error) {
    console.error('Error getting post duration stats:', error);
    return NextResponse.json(
      { error: 'Failed to get post duration stats' },
      { status: 500 }
    );
  }
}

