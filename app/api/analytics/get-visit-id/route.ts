import { NextRequest, NextResponse } from 'next/server';
import { getAllVisits } from '@/lib/analytics';

// 获取客户端 IP 地址（与 middleware.ts 中的逻辑一致）
function getClientIP(request: NextRequest): string {
  // 优先从 X-Real-IP 获取（Nginx 代理设置）
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // 从 X-Forwarded-For 获取（可能包含多个 IP，取第一个）
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim();
    return ip;
  }

  // 如果 headers 都没有，返回 unknown
  return 'unknown';
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    // 获取客户端 IP 地址（关键修复：同时匹配路径和 IP）
    const clientIP = getClientIP(request);
    console.log(`[GetVisitId] Looking for visitId: path=${path}, ip=${clientIP}`);

    // 获取所有访问记录
    const visits = getAllVisits();
    
    // 找到最近30分钟内相同路径和相同IP的访问记录（按时间倒序）
    // 关键修复：同时匹配路径和 IP，避免不同用户的访问记录被混淆
    const now = Date.now();
    const thirtyMinutesAgo = now - 30 * 60 * 1000;
    
    // 优先匹配：同时匹配路径和 IP（最准确）
    let recentVisits = visits
      .filter(v => 
        v.path === path && 
        v.ip === clientIP && // 关键：同时匹配 IP 地址
        v.timestamp > thirtyMinutesAgo
      )
      .sort((a, b) => b.timestamp - a.timestamp); // 最新的在前

    // 如果严格匹配没找到，尝试放宽条件：只匹配路径（备用方案）
    // 这可以处理以下情况：
    // 1. IP 地址获取不一致（比如中间件和 API 获取的 IP 略有不同）
    // 2. 访问记录创建延迟（地理位置查询导致延迟）
    // 3. 同一用户在同一路径的多次访问（虽然理论上应该去重，但可能时间窗口不同）
    if (recentVisits.length === 0) {
      console.log(`[GetVisitId] Strict match failed (path=${path}, ip=${clientIP}), trying path-only match`);
      
      // 放宽条件：只匹配路径，时间窗口延长到30分钟（与严格匹配一致）
      // 这样可以处理 IP 地址获取不一致的情况
      recentVisits = visits
        .filter(v => 
          v.path === path && 
          v.timestamp > thirtyMinutesAgo // 使用相同的时间窗口
        )
        .sort((a, b) => b.timestamp - a.timestamp); // 最新的在前
      
      if (recentVisits.length > 0) {
        console.log(`[GetVisitId] Path-only match found: ${recentVisits.length} visits, using most recent. Visit IP: ${recentVisits[0].ip}, Query IP: ${clientIP}`);
      } else {
        // 如果还是找不到，输出更详细的调试信息
        const pathMatches = visits.filter(v => v.path === path);
        const recentPathMatches = pathMatches.filter(v => v.timestamp > thirtyMinutesAgo);
        console.log(`[GetVisitId] Path-only match also failed. Total visits with path=${path}: ${pathMatches.length}, Recent (30min): ${recentPathMatches.length}`);
        if (recentPathMatches.length > 0) {
          console.log(`[GetVisitId] Recent path matches:`, recentPathMatches.slice(0, 5).map(v => ({
            ip: v.ip,
            timestamp: new Date(v.timestamp).toISOString(),
            timeDiff: `${now - v.timestamp}ms`
          })));
        }
      }
    }

    if (recentVisits.length > 0) {
      // 返回最近的访问记录ID（即使用户停留了很长时间，也能匹配到）
      const visitId = recentVisits[0].id;
      const matchType = clientIP === recentVisits[0].ip ? 'strict' : 'path-only';
      console.log(`[GetVisitId] Found visitId for path=${path}, ip=${clientIP} (match=${matchType}): ${visitId}, time diff: ${now - recentVisits[0].timestamp}ms, visitPath=${recentVisits[0].path}`);
      return NextResponse.json({
        visitId,
      });
    }

    // 如果没有找到，记录日志并返回空
    console.warn(`[GetVisitId] No visitId found for path=${path}, ip=${clientIP} within 30 minutes. Total visits: ${visits.length}`);
    
    // 输出最近的访问记录以便调试
    const recentAllVisits = visits
      .filter(v => v.timestamp > thirtyMinutesAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
    if (recentAllVisits.length > 0) {
      console.log(`[GetVisitId] Recent visits (last 10):`, recentAllVisits.map(v => ({ 
        visitId: v.id, 
        path: v.path, 
        ip: v.ip, 
        timestamp: new Date(v.timestamp).toISOString(),
        timeDiff: `${now - v.timestamp}ms`
      })));
    }
    
    return NextResponse.json({
      visitId: null,
    });
  } catch (error) {
    console.error('Error getting visit ID:', error);
    return NextResponse.json(
      { error: 'Failed to get visit ID' },
      { status: 500 }
    );
  }
}

