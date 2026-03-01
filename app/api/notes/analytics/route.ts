import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'content/analytics-v2.db');

function getDb(): Database.Database {
  if (!fs.existsSync(dbPath)) {
    return new Database(dbPath);
  }
  return new Database(dbPath);
}

export interface NoteStats {
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

export interface UserNoteView {
  userId: string;
  sessionId: string;
  noteId: string;
  viewTime: number;
  viewDuration?: number;
  imageClicks: string[];
  timestamp: number;
}

export interface UserInfo {
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

export interface NotesAnalyticsResponse {
  noteStats: NoteStats[];
  userViews: UserNoteView[];
  users: UserInfo[];
  totalNotes: number;
  totalViews: number;
  totalUniqueViewers: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId'); // 可选：查询特定随记
    const userId = searchParams.get('userId'); // 可选：查询特定用户
    const startDate = searchParams.get('startDate'); // 可选：开始时间戳
    const endDate = searchParams.get('endDate'); // 可选：结束时间戳

    const database = getDb();

    // 构建时间过滤条件
    let timeFilter = '';
    const timeParams: any[] = [];
    
    if (startDate) {
      timeFilter += ' AND e.timestamp >= ?';
      timeParams.push(parseInt(startDate));
    }
    
    if (endDate) {
      timeFilter += ' AND e.timestamp <= ?';
      timeParams.push(parseInt(endDate));
    }

    // 1. 获取每条随记的统计
    let noteStatsQuery = `
      SELECT 
        json_extract(e.eventData, '$.noteId') as noteId,
        COUNT(DISTINCT CASE WHEN e.eventType = 'note_view' THEN e.eventId END) as viewCount,
        COUNT(DISTINCT CASE WHEN e.eventType = 'note_view' THEN e.sessionId END) as uniqueViewers,
        SUM(CASE WHEN e.eventType = 'note_view_time' THEN json_extract(e.eventData, '$.viewDuration') ELSE 0 END) as totalViewDuration,
        AVG(CASE WHEN e.eventType = 'note_view_time' THEN json_extract(e.eventData, '$.viewDuration') ELSE NULL END) as avgViewDuration,
        COUNT(CASE WHEN e.eventType = 'note_image_click' THEN 1 END) as imageClickCount
      FROM events e
      WHERE (e.eventType = 'note_view' OR e.eventType = 'note_view_time' OR e.eventType = 'note_image_click')
        AND json_extract(e.eventData, '$.noteId') IS NOT NULL
    `;

    const noteStatsParams: any[] = [];
    if (noteId) {
      noteStatsQuery += ' AND json_extract(e.eventData, \'$.noteId\') = ?';
      noteStatsParams.push(noteId);
    }
    noteStatsQuery += timeFilter;
    noteStatsParams.push(...timeParams);
    noteStatsQuery += ' GROUP BY json_extract(e.eventData, \'$.noteId\') ORDER BY viewCount DESC';

    const noteStatsStmt = database.prepare(noteStatsQuery);
    const noteStatsResults = noteStatsStmt.all(...noteStatsParams) as any[];

    // 2. 获取每条随记的图片点击详情
    const noteStats: NoteStats[] = await Promise.all(
      noteStatsResults.map(async (row) => {
        const nId = row.noteId;
        
        // 查询该随记的图片点击详情
        let imageClickQuery = `
          SELECT 
            json_extract(e.eventData, '$.imageUrl') as imageUrl,
            COUNT(*) as clickCount
          FROM events e
          WHERE e.eventType = 'note_image_click'
            AND json_extract(e.eventData, '$.noteId') = ?
        `;
        
        const imageClickParams: any[] = [nId];
        if (timeFilter) {
          imageClickQuery += timeFilter;
          imageClickParams.push(...timeParams);
        }
        imageClickQuery += ' GROUP BY json_extract(e.eventData, \'$.imageUrl\') ORDER BY clickCount DESC';
        
        const imageClickStmt = database.prepare(imageClickQuery);
        const imageClicks = imageClickStmt.all(...imageClickParams) as any[];

        return {
          noteId: nId,
          viewCount: row.viewCount || 0,
          uniqueViewers: row.uniqueViewers || 0,
          totalViewDuration: row.totalViewDuration || 0,
          avgViewDuration: row.avgViewDuration || 0,
          imageClickCount: row.imageClickCount || 0,
          imageClicks: imageClicks.map(ic => ({
            imageUrl: ic.imageUrl,
            clickCount: ic.clickCount || 0,
          })),
        };
      })
    );

    // 3. 获取用户浏览记录
    let userViewsQuery = `
      SELECT 
        s.userId,
        e.sessionId,
        json_extract(e.eventData, '$.noteId') as noteId,
        e.timestamp as viewTime,
        (SELECT json_extract(e2.eventData, '$.viewDuration') 
         FROM events e2 
         WHERE e2.eventType = 'note_view_time' 
           AND e2.sessionId = e.sessionId 
           AND json_extract(e2.eventData, '$.noteId') = json_extract(e.eventData, '$.noteId')
         ORDER BY e2.timestamp DESC LIMIT 1) as viewDuration
      FROM events e
      JOIN sessions s ON e.sessionId = s.sessionId
      WHERE e.eventType = 'note_view'
        AND json_extract(e.eventData, '$.noteId') IS NOT NULL
    `;

    const userViewsParams: any[] = [];
    if (noteId) {
      userViewsQuery += ' AND json_extract(e.eventData, \'$.noteId\') = ?';
      userViewsParams.push(noteId);
    }
    if (userId) {
      userViewsQuery += ' AND s.userId = ?';
      userViewsParams.push(userId);
    }
    userViewsQuery += timeFilter;
    userViewsParams.push(...timeParams);
    userViewsQuery += ' ORDER BY e.timestamp DESC';

    const userViewsStmt = database.prepare(userViewsQuery);
    const userViewsResults = userViewsStmt.all(...userViewsParams) as any[];

    // 4. 为每个用户浏览记录添加图片点击信息
    const userViews: UserNoteView[] = await Promise.all(
      userViewsResults.map(async (row) => {
        // 查询该用户在该随记中点击的图片
        let imageClicksQuery = `
          SELECT json_extract(e.eventData, '$.imageUrl') as imageUrl
          FROM events e
          WHERE e.eventType = 'note_image_click'
            AND e.sessionId = ?
            AND json_extract(e.eventData, '$.noteId') = ?
        `;
        
        const imageClicksParams: any[] = [row.sessionId, row.noteId];
        if (timeFilter) {
          imageClicksQuery += timeFilter;
          imageClicksParams.push(...timeParams);
        }
        imageClicksQuery += ' ORDER BY e.timestamp';
        
        const imageClicksStmt = database.prepare(imageClicksQuery);
        const imageClicks = imageClicksStmt.all(...imageClicksParams) as any[];

        return {
          userId: row.userId || '',
          sessionId: row.sessionId,
          noteId: row.noteId,
          viewTime: row.viewTime,
          viewDuration: row.viewDuration || undefined,
          imageClicks: imageClicks.map(ic => ic.imageUrl).filter(Boolean),
          timestamp: row.viewTime,
        };
      })
    );

    // 5. 按用户分组浏览记录
    const userViewsByUser = userViews.reduce((acc, view) => {
      if (!acc[view.userId]) {
        acc[view.userId] = [];
      }
      acc[view.userId].push(view);
      return acc;
    }, {} as Record<string, UserNoteView[]>);

    // 6. 获取用户详细信息
    const userIds = Object.keys(userViewsByUser);
    const users: UserInfo[] = [];
    
    for (const userId of userIds) {
      // 从users表获取用户信息
      const userQuery = 'SELECT * FROM users WHERE userId = ?';
      const userStmt = database.prepare(userQuery);
      const user = userStmt.get(userId) as any;
      
      if (user) {
        users.push({
          userId: user.userId,
          ip: user.ip,
          browser: user.browser || undefined,
          browserVersion: user.browserVersion || undefined,
          os: user.os || undefined,
          osVersion: user.osVersion || undefined,
          deviceType: user.deviceType || undefined,
          device: user.device || undefined,
          country: user.country || undefined,
          region: user.region || undefined,
          city: user.city || undefined,
          isp: user.isp || undefined,
          firstVisitTime: user.firstVisitTime,
          lastVisitTime: user.lastVisitTime,
          visitCount: user.visitCount || 0,
          notesViewed: userViewsByUser[userId].sort((a, b) => b.viewTime - a.viewTime), // 按时间倒序
        });
      }
    }

    // 按最后访问时间倒序排列
    users.sort((a, b) => b.lastVisitTime - a.lastVisitTime);

    // 7. 计算总体统计
    const totalNotes = new Set(noteStats.map(n => n.noteId)).size;
    const totalViews = noteStats.reduce((sum, n) => sum + n.viewCount, 0);
    const totalUniqueViewers = users.length;

    const response: NotesAnalyticsResponse = {
      noteStats,
      userViews,
      users,
      totalNotes,
      totalViews,
      totalUniqueViewers,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching notes analytics:', error);
    return NextResponse.json(
      { error: '获取随记统计失败' },
      { status: 500 }
    );
  }
}

