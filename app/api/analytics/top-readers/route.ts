import { NextRequest, NextResponse } from 'next/server';
import { getAllVisits } from '@/lib/analytics';
import { getAllPosts, getPostBySlug } from '@/lib/posts';
import { getAboutContent } from '@/lib/about';
import { getPathName } from '@/lib/path-names';

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

export async function GET(request: NextRequest) {
  try {
    const visits = getAllVisits();
    const posts = getAllPosts();
    const now = Date.now();
    
    // 计算时间范围
    const days7Ago = now - 7 * 24 * 60 * 60 * 1000;
    const days15Ago = now - 15 * 24 * 60 * 60 * 1000;
    const days30Ago = now - 30 * 24 * 60 * 60 * 1000;
    
    // 过滤文章和关于页面的访问记录
    const articleVisits = visits.filter(v => 
      v.path.startsWith('/post/') || v.path === '/about'
    );
    
    // 按路径分组
    const visitsByPath: Record<string, typeof articleVisits> = {};
    articleVisits.forEach(visit => {
      if (!visitsByPath[visit.path]) {
        visitsByPath[visit.path] = [];
      }
      visitsByPath[visit.path].push(visit);
    });
    
    // 处理每个时间范围
    const processTimeRange = (timeAgo: number): PostTopReaders[] => {
      const filteredVisits = articleVisits.filter(v => v.timestamp > timeAgo);
      
      return Object.entries(visitsByPath)
        .map(([path, pathVisits]) => {
          // 过滤当前时间范围内的访问
          const timeRangeVisits = pathVisits.filter(v => v.timestamp > timeAgo);
          
          if (timeRangeVisits.length === 0) {
            return null;
          }
        
        // 获取文章信息
        let slug = '';
        let title = '';
        
        if (path === '/about') {
          slug = 'about';
          const aboutContent = getAboutContent();
          title = aboutContent.name || '关于';
        } else if (path.startsWith('/post/')) {
          slug = path.replace('/post/', '').split('?')[0].split('#')[0].trim();
          try {
            slug = decodeURIComponent(slug);
          } catch (e) {
            // 如果解码失败，使用原始slug
          }
          const post = getPostBySlug(slug);
          title = post?.title || slug;
        } else {
          slug = path;
          title = getPathName(path);
        }
        
        // 按用户（IP）分组，计算每个用户的停留时间
        const userVisitsMap: Record<string, typeof timeRangeVisits> = {};
        timeRangeVisits.forEach(visit => {
          const key = visit.ip;
          if (!userVisitsMap[key]) {
            userVisitsMap[key] = [];
          }
          userVisitsMap[key].push(visit);
        });
        
        // 计算每个用户的停留时间（取最长的一次访问）
        const userDurations = Object.entries(userVisitsMap).map(([ip, userVisits]) => {
          // 计算每个访问的实际停留时间
          const visitsWithDuration = userVisits.map(v => {
            let calculatedDuration = v.duration || 0;
            let calculatedEndTime = v.timestamp + (v.duration || 0) * 1000;
            
            // 优先使用 endTime 字段
            if (v.endTime && v.endTime > v.timestamp) {
              calculatedEndTime = v.endTime;
              calculatedDuration = Math.round((v.endTime - v.timestamp) / 1000);
            } else if (v.lastActivityTime && v.lastActivityTime > v.timestamp) {
              // 其次使用 lastActivityTime
              calculatedEndTime = v.lastActivityTime;
              calculatedDuration = Math.round((v.lastActivityTime - v.timestamp) / 1000);
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
          
          // 找到最长的一次访问
          const longestVisit = visitsWithDuration.reduce((max, v) => {
            const maxDuration = (max as any).calculatedDuration || 0;
            const vDuration = (v as any).calculatedDuration || 0;
            return vDuration > maxDuration ? v : max;
          });
          
        return {
          ip,
          country: longestVisit.country || undefined,
          region: longestVisit.region || undefined,
          city: longestVisit.city || undefined,
          userAgent: longestVisit.userAgent || undefined,
          duration: (longestVisit as any).calculatedDuration || 0,
          startTime: longestVisit.timestamp,
          endTime: (longestVisit as any).calculatedEndTime || longestVisit.timestamp,
          timestamp: longestVisit.timestamp,
          date: longestVisit.date,
          visitCount: userVisits.length,
        } as TopReader;
        });
        
        // 按停留时间排序，取前三名
        const topReaders = userDurations
          .filter(u => u.duration >= 3) // 只统计停留时间 >= 3秒的访问
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 3);
        
          return {
            slug,
            path,
            title,
            topReaders,
          };
        })
        .filter((item): item is PostTopReaders => item !== null && item.topReaders.length > 0);
    };
    
    const result: TopReadersData = {
      days7: processTimeRange(days7Ago),
      days15: processTimeRange(days15Ago),
      days30: processTimeRange(days30Ago),
    };
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting top readers:', error);
    return NextResponse.json(
      { error: 'Failed to get top readers' },
      { status: 500 }
    );
  }
}

