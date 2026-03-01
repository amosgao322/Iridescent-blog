import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { parseUserAgent, ParsedUserAgent } from './user-agent-parser';

const dbPath = path.join(process.cwd(), 'content/analytics-v2.db');
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

// 确保目录存在
function ensureDbExists() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// 获取数据库连接
let db: Database.Database | null = null;

function getDb(): Database.Database {
  // #region agent log
  logDebug('lib/analytics-v2.ts:19', 'getDb called', { dbExists: !!db, dbPath }, 'A');
  // #endregion
  if (db) {
    return db;
  }
  
  try {
    ensureDbExists();
    // #region agent log
    logDebug('lib/analytics-v2.ts:26', 'Before creating database', { dbPath, fileExists: fs.existsSync(dbPath) }, 'A');
    // #endregion
    db = new Database(dbPath);
    
    // #region agent log
    logDebug('lib/analytics-v2.ts:29', 'Database created, initializing tables', {}, 'A');
    // #endregion
    
    // 初始化表结构
    initTables(db);
    
    // #region agent log
    logDebug('lib/analytics-v2.ts:32', 'Tables initialized', {}, 'A');
    // #endregion
    
    return db;
  } catch (error) {
    // #region agent log
    logDebug('lib/analytics-v2.ts:35', 'Database creation error', { error: error instanceof Error ? error.message : String(error) }, 'A');
    // #endregion
    throw error;
  }
}

// 爬虫检测函数
function isBot(userAgent?: string): boolean {
  if (!userAgent) return true;
  
  // 检查长度（正常浏览器UA通常较长）
  if (userAgent.length < 20) return true;
  
  const botPatterns = [
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    /feed/i, /rss/i, /reader/i, /aggregator/i,
    /curl/i, /wget/i, /python/i, /java/i,
    /googlebot/i, /bingbot/i, /slurp/i,
    /duckduckbot/i, /baiduspider/i, /yandexbot/i,
    /facebookexternalhit/i, /twitterbot/i,
    /rogerbot/i, /linkedinbot/i, /embedly/i,
    /quora/i, /pinterest/i, /slackbot/i,
    /whatsapp/i, /flipboard/i, /tumblr/i,
    /bitly/i, /skype/i, /nuzzel/i,
    /discordbot/i, /qwantify/i, /pinterestbot/i,
    /bitrix/i, /xing-contenttabreceiver/i,
    /chrome-lighthouse/i, /applebot/i,
    /semrushbot/i, /ahrefsbot/i, /dotbot/i,
    /headless/i, /phantom/i, /selenium/i,
    /webdriver/i, /puppeteer/i, /playwright/i,
    /scrapy/i, /requests/i, /http/i,
    /okhttp/i, /apache/i, /nginx/i,
  ];
  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // 检查是否缺少正常浏览器的特征
  const hasBrowserFeatures = 
    /mozilla/i.test(userAgent) && 
    (/chrome/i.test(userAgent) || /firefox/i.test(userAgent) || /safari/i.test(userAgent) || /edge/i.test(userAgent));
  
  if (!hasBrowserFeatures && userAgent.length > 50) {
    if (!/mobile/i.test(userAgent) && !/android/i.test(userAgent) && !/iphone/i.test(userAgent)) {
      return true;
    }
  }
  
  return false;
}

// 生成用户ID（基于IP和UserAgent的简单指纹）
function generateUserId(ip: string, userAgent: string): string {
  // 使用IP和UserAgent的前100个字符生成简单指纹
  const fingerprint = `${ip}-${userAgent.substring(0, 100)}`;
  // 简单的hash（实际项目中可以使用更复杂的hash算法）
  return Buffer.from(fingerprint).toString('base64').substring(0, 32);
}

// 用户相关操作
export interface UserData {
  userId: string;
  ip: string;
  userAgent?: string;
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
}

export function getOrCreateUser(data: {
  ip: string;
  userAgent?: string;
  country?: string;
  region?: string;
  city?: string;
  district?: string;
  isp?: string;
}): string {
  const database = getDb();
  
  // 如果UserAgent为空或检测到是爬虫，返回空字符串（不记录）
  if (!data.userAgent || isBot(data.userAgent)) {
    return '';
  }
  
  // 解析UserAgent
  const parsedUA = parseUserAgent(data.userAgent || '');
  
  // 生成用户ID
  const userId = generateUserId(data.ip, data.userAgent || '');
  
  // 检查用户是否已存在
  const existingUser = database.prepare('SELECT * FROM users WHERE userId = ?').get(userId) as any;
  
  if (existingUser) {
    // 更新用户信息
    const now = Date.now();
    database.prepare(`
      UPDATE users 
      SET lastVisitTime = ?,
          visitCount = visitCount + 1,
          country = COALESCE(?, country),
          region = COALESCE(?, region),
          city = COALESCE(?, city),
          district = COALESCE(?, district),
          isp = COALESCE(?, isp)
      WHERE userId = ?
    `).run(
      now,
      data.country || null,
      data.region || null,
      data.city || null,
      data.district || null,
      data.isp || null,
      userId
    );
    return userId;
  } else {
    // 创建新用户
    const now = Date.now();
    database.prepare(`
      INSERT INTO users (
        userId, ip, userAgent, browser, browserVersion, os, osVersion, 
        deviceType, device, country, region, city, district, isp, 
        firstVisitTime, lastVisitTime, visitCount, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      data.ip,
      data.userAgent || null,
      parsedUA.browser || null,
      parsedUA.browserVersion || null,
      parsedUA.os || null,
      parsedUA.osVersion || null,
      parsedUA.deviceType || null,
      parsedUA.device || null,
      data.country || null,
      data.region || null,
      data.city || null,
      null,
      data.isp || null,
      now,
      now,
      1,
      now
    );
    return userId;
  }
}

/**
 * 根据 userId 更新用户地理位置（用于 IP 查询接口回写）
 */
export function updateUserLocation(
  userId: string,
  location: { country?: string; region?: string; city?: string; district?: string; isp?: string }
): void {
  const database = getDb();
  const { country, region, city, district, isp } = location;
  database.prepare(`
    UPDATE users
    SET country = COALESCE(?, country),
        region = COALESCE(?, region),
        city = COALESCE(?, city),
        district = COALESCE(?, district),
        isp = COALESCE(?, isp)
    WHERE userId = ?
  `).run(country || null, region || null, city || null, district || null, isp || null, userId);
}

// 初始化数据库表
function initTables(database: Database.Database) {
  // users表：用户画像（基于IP+UserAgent指纹）
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      userId TEXT PRIMARY KEY,
      ip TEXT NOT NULL,
      userAgent TEXT,
      browser TEXT,
      browserVersion TEXT,
      os TEXT,
      osVersion TEXT,
      deviceType TEXT,
      device TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      district TEXT,
      isp TEXT,
      firstVisitTime INTEGER NOT NULL,
      lastVisitTime INTEGER NOT NULL,
      visitCount INTEGER DEFAULT 1,
      createdAt INTEGER NOT NULL
    )
  `);
  try {
    database.exec('ALTER TABLE users ADD COLUMN district TEXT');
  } catch {
    // 列已存在（旧表升级）
  }

  // sessions表：会话记录
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sessionId TEXT PRIMARY KEY,
      userId TEXT,
      startTime INTEGER NOT NULL,
      endTime INTEGER,
      duration INTEGER,
      isBounce INTEGER DEFAULT 0,
      pageCount INTEGER DEFAULT 1,
      referer TEXT,
      userAgent TEXT,
      ip TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      browser TEXT,
      browserVersion TEXT,
      os TEXT,
      osVersion TEXT,
      deviceType TEXT,
      device TEXT,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(userId)
    )
  `);

  // page_views表：页面访问记录
  database.exec(`
    CREATE TABLE IF NOT EXISTS page_views (
      pageViewId TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      userId TEXT,
      path TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      endTime INTEGER,
      referer TEXT,
      userAgent TEXT,
      duration INTEGER,
      scrollDepth INTEGER DEFAULT 0,
      isExit INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(sessionId),
      FOREIGN KEY (userId) REFERENCES users(userId)
    )
  `);

  // events表：用户行为事件
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      eventId TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      pageViewId TEXT,
      eventType TEXT NOT NULL,
      eventData TEXT,
      timestamp INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(sessionId),
      FOREIGN KEY (pageViewId) REFERENCES page_views(pageViewId)
    )
  `);

  // engagement_signals表：参与度信号
  database.exec(`
    CREATE TABLE IF NOT EXISTS engagement_signals (
      signalId TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      pageViewId TEXT,
      signalType TEXT NOT NULL,
      value REAL,
      timestamp INTEGER NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(sessionId),
      FOREIGN KEY (pageViewId) REFERENCES page_views(pageViewId)
    )
  `);

  // 创建索引以提高查询性能
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_ip ON users(ip);
    CREATE INDEX IF NOT EXISTS idx_users_lastVisitTime ON users(lastVisitTime);
    CREATE INDEX IF NOT EXISTS idx_sessions_startTime ON sessions(startTime);
    CREATE INDEX IF NOT EXISTS idx_sessions_userId ON sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_page_views_sessionId ON page_views(sessionId);
    CREATE INDEX IF NOT EXISTS idx_page_views_userId ON page_views(userId);
    CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
    CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_sessionId ON events(sessionId);
    CREATE INDEX IF NOT EXISTS idx_events_eventType ON events(eventType);
    CREATE INDEX IF NOT EXISTS idx_engagement_signals_sessionId ON engagement_signals(sessionId);
    CREATE INDEX IF NOT EXISTS idx_engagement_signals_signalType ON engagement_signals(signalType);
  `);
}

// 会话相关操作
export interface SessionData {
  sessionId: string;
  startTime: number;
  referer?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
}

export function createSession(data: SessionData): string | null {
  const database = getDb();
  
  // 如果UserAgent为空或检测到是爬虫，不创建会话
  if (!data.userAgent || !data.ip || isBot(data.userAgent)) {
    return null;
  }
  
  // 获取或创建用户
  const userId = getOrCreateUser({
    ip: data.ip,
    userAgent: data.userAgent,
    country: data.country,
    region: data.region,
    city: data.city,
    isp: data.isp,
  });
  
  if (!userId) {
    return null; // 爬虫，不记录
  }
  
  // 解析UserAgent获取浏览器和设备信息
  const parsedUA = parseUserAgent(data.userAgent);
  
  const stmt = database.prepare(`
    INSERT INTO sessions (
      sessionId, userId, startTime, referer, userAgent, ip, 
      country, region, city, browser, browserVersion, os, osVersion, 
      deviceType, device, createdAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.sessionId,
    userId,
    data.startTime,
    data.referer || null,
    data.userAgent || null,
    data.ip || null,
    data.country || null,
    data.region || null,
    data.city || null,
    parsedUA.browser || null,
    parsedUA.browserVersion || null,
    parsedUA.os || null,
    parsedUA.osVersion || null,
    parsedUA.deviceType || null,
    parsedUA.device || null,
    Date.now()
  );
  
  return userId;
}

export function updateSession(sessionId: string, data: {
  endTime?: number;
  duration?: number;
  isBounce?: boolean;
  pageCount?: number;
}): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE sessions
    SET endTime = COALESCE(?, endTime),
        duration = COALESCE(?, duration),
        isBounce = COALESCE(?, isBounce),
        pageCount = COALESCE(?, pageCount)
    WHERE sessionId = ?
  `);
  stmt.run(
    data.endTime || null,
    data.duration || null,
    data.isBounce ? 1 : null,
    data.pageCount || null,
    sessionId
  );
}

// 页面访问相关操作
export interface PageViewData {
  pageViewId: string;
  sessionId: string;
  path: string;
  timestamp: number;
  referer?: string;
  userAgent?: string;
}

export function createPageView(data: PageViewData): void {
  const database = getDb();
  
  // 从会话中获取userId
  const session = database.prepare('SELECT userId FROM sessions WHERE sessionId = ?').get(data.sessionId) as any;
  const userId = session?.userId || null;
  
  const stmt = database.prepare(`
    INSERT INTO page_views (pageViewId, sessionId, userId, path, timestamp, referer, userAgent, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.pageViewId,
    data.sessionId,
    userId,
    data.path,
    data.timestamp,
    data.referer || null,
    data.userAgent || null,
    Date.now()
  );
}

export function updatePageView(pageViewId: string, data: {
  duration?: number;
  scrollDepth?: number;
  isExit?: boolean;
  endTime?: number;
}): void {
  const database = getDb();
  const stmt = database.prepare(`
    UPDATE page_views
    SET duration = COALESCE(?, duration),
        scrollDepth = COALESCE(?, scrollDepth),
        isExit = COALESCE(?, isExit),
        endTime = COALESCE(?, endTime)
    WHERE pageViewId = ?
  `);
  stmt.run(
    data.duration || null,
    data.scrollDepth || null,
    data.isExit ? 1 : null,
    data.endTime || null,
    pageViewId
  );
}

// 事件相关操作
export interface EventData {
  eventId: string;
  sessionId: string;
  pageViewId?: string;
  eventType: string;
  eventData?: any;
  timestamp: number;
}

export function createEvent(data: EventData): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO events (eventId, sessionId, pageViewId, eventType, eventData, timestamp, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.eventId,
    data.sessionId,
    data.pageViewId || null,
    data.eventType,
    data.eventData ? JSON.stringify(data.eventData) : null,
    data.timestamp,
    Date.now()
  );
}

// 参与度信号相关操作
export interface EngagementSignalData {
  signalId: string;
  sessionId: string;
  pageViewId?: string;
  signalType: string;
  value?: number;
  timestamp: number;
}

export function createEngagementSignal(data: EngagementSignalData): void {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT INTO engagement_signals (signalId, sessionId, pageViewId, signalType, value, timestamp, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    data.signalId,
    data.sessionId,
    data.pageViewId || null,
    data.signalType,
    data.value || null,
    data.timestamp,
    Date.now()
  );
}

// 统计查询函数
export interface PageViewStats {
  path: string;
  views: number;
  uniqueVisitors: number;
  avgDuration: number;
  avgScrollDepth: number;
  bounceRate: number;
  exitRate: number;
}

export function getPageViewStats(startDate?: number, endDate?: number, path?: string): PageViewStats[] {
  // #region agent log
  logDebug('lib/analytics-v2.ts:535', 'getPageViewStats called', { startDate, endDate, path }, 'B');
  // #endregion
  try {
    const database = getDb();
    
    // #region agent log
    logDebug('lib/analytics-v2.ts:540', 'Database obtained, building query', {}, 'B');
    // #endregion
    
    let query = `
    SELECT 
      pv.path,
      COUNT(DISTINCT pv.pageViewId) as views,
      COUNT(DISTINCT pv.sessionId) as uniqueVisitors,
      AVG(pv.duration) as avgDuration,
      AVG(pv.scrollDepth) as avgScrollDepth,
      CASE 
        WHEN COUNT(DISTINCT pv.sessionId) > 0 
        THEN SUM(CASE WHEN s.isBounce = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT pv.sessionId)
        ELSE 0
      END as bounceRate,
      CASE 
        WHEN COUNT(DISTINCT pv.pageViewId) > 0 
        THEN SUM(CASE WHEN pv.isExit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT pv.pageViewId)
        ELSE 0
      END as exitRate
    FROM page_views pv
    LEFT JOIN sessions s ON pv.sessionId = s.sessionId
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (startDate) {
    query += ' AND pv.timestamp >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND pv.timestamp <= ?';
    params.push(endDate);
  }
  
  if (path) {
    query += ' AND pv.path = ?';
    params.push(path);
  }
  
  // 排除首页和列表页
  query += " AND pv.path != '/'";
  query += " AND pv.path != '/posts'";
  query += " AND pv.path != '/notes'";
  
  query += ' GROUP BY pv.path ORDER BY views DESC';
  
  // #region agent log
  logDebug('lib/analytics-v2.ts:588', 'Before executing query', { query: query.substring(0, 200), paramCount: params.length }, 'B');
  // #endregion
  
  const stmt = database.prepare(query);
  const results = stmt.all(...params) as any[];
  
  // #region agent log
  logDebug('lib/analytics-v2.ts:592', 'Query executed successfully', { resultCount: results.length }, 'B');
  // #endregion
  
  return results.map(row => ({
    path: row.path,
    views: row.views,
    uniqueVisitors: row.uniqueVisitors,
    avgDuration: Math.round(row.avgDuration || 0),
    avgScrollDepth: Math.round(row.avgScrollDepth || 0),
    bounceRate: Math.round((row.bounceRate || 0) * 100) / 100,
    exitRate: Math.round((row.exitRate || 0) * 100) / 100,
  }));
  } catch (error) {
    // #region agent log
    logDebug('lib/analytics-v2.ts:602', 'getPageViewStats error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined }, 'B');
    // #endregion
    throw error;
  }
}

export interface EngagementStats {
  path: string;
  avgEngagementScore: number;
  imageClickCount: number;
  linkClickCount: number;
  scrollDepth25: number;
  scrollDepth50: number;
  scrollDepth75: number;
  scrollDepth100: number;
}

export function getEngagementStats(startDate?: number, endDate?: number, path?: string): EngagementStats[] {
  const database = getDb();
  
  // 获取滚动深度统计
  let scrollQuery = `
    SELECT 
      pv.path,
      SUM(CASE WHEN pv.scrollDepth >= 25 THEN 1 ELSE 0 END) as scrollDepth25,
      SUM(CASE WHEN pv.scrollDepth >= 50 THEN 1 ELSE 0 END) as scrollDepth50,
      SUM(CASE WHEN pv.scrollDepth >= 75 THEN 1 ELSE 0 END) as scrollDepth75,
      SUM(CASE WHEN pv.scrollDepth >= 100 THEN 1 ELSE 0 END) as scrollDepth100
    FROM page_views pv
    WHERE 1=1
  `;
  
  const scrollParams: any[] = [];
  
  if (startDate) {
    scrollQuery += ' AND pv.timestamp >= ?';
    scrollParams.push(startDate);
  }
  
  if (endDate) {
    scrollQuery += ' AND pv.timestamp <= ?';
    scrollParams.push(endDate);
  }
  
  if (path) {
    scrollQuery += ' AND pv.path = ?';
    scrollParams.push(path);
  }
  
  // 排除首页和列表页
  scrollQuery += " AND pv.path != '/'";
  scrollQuery += " AND pv.path != '/posts'";
  scrollQuery += " AND pv.path != '/notes'";
  
  scrollQuery += ' GROUP BY pv.path';
  
  const scrollStmt = database.prepare(scrollQuery);
  const scrollResults = scrollStmt.all(...scrollParams) as any[];
  
  // 获取事件统计
  let eventQuery = `
    SELECT 
      pv.path,
      SUM(CASE WHEN e.eventType = 'image_click' THEN 1 ELSE 0 END) as imageClickCount,
      SUM(CASE WHEN e.eventType = 'link_click' THEN 1 ELSE 0 END) as linkClickCount
    FROM events e
    JOIN page_views pv ON e.pageViewId = pv.pageViewId
    WHERE 1=1
  `;
  
  const eventParams: any[] = [];
  
  if (startDate) {
    eventQuery += ' AND e.timestamp >= ?';
    eventParams.push(startDate);
  }
  
  if (endDate) {
    eventQuery += ' AND e.timestamp <= ?';
    eventParams.push(endDate);
  }
  
  if (path) {
    eventQuery += ' AND pv.path = ?';
    eventParams.push(path);
  }
  
  // 排除首页和列表页
  eventQuery += " AND pv.path != '/'";
  eventQuery += " AND pv.path != '/posts'";
  eventQuery += " AND pv.path != '/notes'";
  
  eventQuery += ' GROUP BY pv.path';
  
  const eventStmt = database.prepare(eventQuery);
  const eventResults = eventStmt.all(...eventParams) as any[];
  
  // 合并结果
  const pathMap = new Map<string, EngagementStats>();
  
  scrollResults.forEach(row => {
    pathMap.set(row.path, {
      path: row.path,
      avgEngagementScore: 0,
      imageClickCount: 0,
      linkClickCount: 0,
      scrollDepth25: row.scrollDepth25 || 0,
      scrollDepth50: row.scrollDepth50 || 0,
      scrollDepth75: row.scrollDepth75 || 0,
      scrollDepth100: row.scrollDepth100 || 0,
    });
  });
  
  eventResults.forEach(row => {
    const existing = pathMap.get(row.path) || {
      path: row.path,
      avgEngagementScore: 0,
      imageClickCount: 0,
      linkClickCount: 0,
      scrollDepth25: 0,
      scrollDepth50: 0,
      scrollDepth75: 0,
      scrollDepth100: 0,
    };
    existing.imageClickCount = row.imageClickCount || 0;
    existing.linkClickCount = row.linkClickCount || 0;
    pathMap.set(row.path, existing);
  });
  
  // 计算参与度分数（综合指标）
  const results = Array.from(pathMap.values()).map(stat => {
    // 参与度分数 = 滚动深度分数 + 事件分数
    // 滚动深度分数：基于达到各里程碑的用户数（加权平均）
    const totalScrollUsers = stat.scrollDepth25 || 1;
    const scrollScore = (
      (stat.scrollDepth25 * 0.25) +
      (stat.scrollDepth50 * 0.5) +
      (stat.scrollDepth75 * 0.75) +
      (stat.scrollDepth100 * 1.0)
    ) / totalScrollUsers;
    
    // 事件分数：图片点击权重更高（2倍），链接点击权重为1
    const totalEvents = stat.imageClickCount + stat.linkClickCount;
    const eventScore = totalEvents > 0 
      ? (stat.imageClickCount * 2 + stat.linkClickCount) / totalEvents
      : 0;
    
    // 综合分数：滚动深度占60%，事件占40%
    stat.avgEngagementScore = Math.round((scrollScore * 0.6 + eventScore * 0.4) * 100) / 100;
    return stat;
  });
  
  return results;
}

export interface DailyStats {
  date: string;
  views: number;
  uniqueVisitors: number;
  sessions: number;
  bounceRate: number;
  avgDuration: number;
}

export function getDailyStats(startDate?: number, endDate?: number): DailyStats[] {
  const database = getDb();
  
  let query = `
    SELECT 
      strftime('%Y-%m-%d', datetime(pv.timestamp / 1000, 'unixepoch')) as date,
      COUNT(DISTINCT pv.pageViewId) as views,
      COUNT(DISTINCT pv.sessionId) as uniqueVisitors,
      COUNT(DISTINCT s.sessionId) as sessions,
      CASE 
        WHEN COUNT(DISTINCT s.sessionId) > 0 
        THEN SUM(CASE WHEN s.isBounce = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(DISTINCT s.sessionId)
        ELSE 0
      END as bounceRate,
      AVG(pv.duration) as avgDuration
    FROM page_views pv
    LEFT JOIN sessions s ON pv.sessionId = s.sessionId
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  if (startDate) {
    query += ' AND pv.timestamp >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND pv.timestamp <= ?';
    params.push(endDate);
  }
  
  // 排除首页和列表页
  query += " AND pv.path != '/'";
  query += " AND pv.path != '/posts'";
  query += " AND pv.path != '/notes'";
  
  query += ' GROUP BY date ORDER BY date DESC';
  
  const stmt = database.prepare(query);
  const results = stmt.all(...params) as any[];
  
  return results.map(row => ({
    date: row.date,
    views: row.views,
    uniqueVisitors: row.uniqueVisitors,
    sessions: row.sessions,
    bounceRate: Math.round((row.bounceRate || 0) * 100) / 100,
    avgDuration: Math.round(row.avgDuration || 0),
  }));
}

// 用户画像查询
export interface UserProfile {
  userId: string;
  ip: string;
  browser: string;
  browserVersion?: string;
  os: string;
  osVersion?: string;
  deviceType: string;
  device?: string;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  district?: string | null;
  isp?: string | null;
  firstVisitTime: number;
  lastVisitTime: number;
  visitCount: number;
  isNewUser: boolean;
}

export function getUserProfile(userId: string): UserProfile | null {
  const database = getDb();
  const user = database.prepare('SELECT * FROM users WHERE userId = ?').get(userId) as any;
  
  if (!user) return null;
  
  return {
    userId: user.userId,
    ip: user.ip,
    browser: user.browser || '未知',
    browserVersion: user.browserVersion || undefined,
    os: user.os || '未知',
    osVersion: user.osVersion || undefined,
    deviceType: user.deviceType || 'unknown',
    device: user.device || undefined,
    country: user.country ?? null,
    region: user.region ?? null,
    city: user.city ?? null,
    district: user.district ?? null,
    isp: user.isp ?? null,
    firstVisitTime: user.firstVisitTime,
    lastVisitTime: user.lastVisitTime,
    visitCount: user.visitCount,
    isNewUser: user.visitCount === 1,
  };
}

// 获取用户访问历史（按文章）
export interface UserPageVisit {
  path: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  scrollDepth: number;
  isExit: boolean;
  imageClickCount?: number; // 图片点击数量
}

export function getUserPageVisits(userId: string, startDate?: number, endDate?: number): UserPageVisit[] {
  const database = getDb();
  
  let query = `
    SELECT 
      pv.path,
      pv.pageViewId,
      pv.timestamp as startTime,
      pv.endTime,
      pv.duration,
      pv.scrollDepth,
      pv.isExit,
      COUNT(DISTINCT CASE WHEN e.eventType = 'image_click' THEN e.eventId END) as imageClickCount
    FROM page_views pv
    LEFT JOIN events e ON e.pageViewId = pv.pageViewId
    WHERE pv.userId = ?
  `;
  
  const params: any[] = [userId];
  
  // 排除首页和列表页
  query += " AND pv.path != '/'";
  query += " AND pv.path != '/posts'";
  query += " AND pv.path != '/notes'";
  
  if (startDate) {
    query += ' AND pv.timestamp >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND pv.timestamp <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY pv.pageViewId ORDER BY pv.timestamp DESC';
  
  const stmt = database.prepare(query);
  const results = stmt.all(...params) as any[];
  
  return results.map(row => ({
    path: row.path,
    startTime: row.startTime,
    endTime: row.endTime || undefined,
    duration: row.duration || undefined,
    scrollDepth: row.scrollDepth || 0,
    isExit: row.isExit === 1,
    imageClickCount: row.imageClickCount || 0,
  }));
}

// 获取所有用户列表（带统计信息）
export interface UserWithStats extends UserProfile {
  totalSessions: number;
  totalPageViews: number;
  totalDuration: number;
  avgDuration: number;
}

export function getAllUsersWithStats(startDate?: number, endDate?: number): UserWithStats[] {
  const database = getDb();
  
  // 先获取所有用户
  let userQuery = 'SELECT * FROM users WHERE 1=1';
  const userParams: any[] = [];
  
  if (startDate || endDate) {
    if (startDate) {
      userQuery += ' AND lastVisitTime >= ?';
      userParams.push(startDate);
    }
    if (endDate) {
      userQuery += ' AND lastVisitTime <= ?';
      userParams.push(endDate);
    }
  }
  
  userQuery += ' ORDER BY lastVisitTime DESC';
  
  const users = database.prepare(userQuery).all(...userParams) as any[];
  
  // 为每个用户获取统计信息
  const usersWithStats: UserWithStats[] = [];
  
  for (const user of users) {
    let sessionQuery = 'SELECT COUNT(*) as count FROM sessions WHERE userId = ?';
    let sessionParams: any[] = [user.userId];
    
    if (startDate) {
      sessionQuery += ' AND startTime >= ?';
      sessionParams.push(startDate);
    }
    if (endDate) {
      sessionQuery += ' AND startTime <= ?';
      sessionParams.push(endDate);
    }
    
    const sessionCount = (database.prepare(sessionQuery).get(...sessionParams) as any)?.count || 0;
    
    // 排除首页和列表页，只统计有效页面访问
    let pageViewQuery = 'SELECT COUNT(*) as count, SUM(duration) as totalDuration, AVG(duration) as avgDuration FROM page_views WHERE userId = ?';
    let pageViewParams: any[] = [user.userId];
    
    // 排除首页和列表页
    pageViewQuery += " AND path != '/'";
    pageViewQuery += " AND path != '/posts'";
    pageViewQuery += " AND path != '/notes'";
    
    if (startDate) {
      pageViewQuery += ' AND timestamp >= ?';
      pageViewParams.push(startDate);
    }
    if (endDate) {
      pageViewQuery += ' AND timestamp <= ?';
      pageViewParams.push(endDate);
    }
    
    const pageViewStats = database.prepare(pageViewQuery).get(...pageViewParams) as any;
    const validPageViews = pageViewStats?.count || 0;
    
    // 如果用户在过滤掉不用统计的页面后没有访问记录，跳过该用户
    if (validPageViews === 0) {
      continue;
    }
    
    usersWithStats.push({
      userId: user.userId,
      ip: user.ip,
      browser: user.browser || '未知',
      browserVersion: user.browserVersion || undefined,
      os: user.os || '未知',
      osVersion: user.osVersion || undefined,
      deviceType: user.deviceType || 'unknown',
      device: user.device || undefined,
      country: user.country ?? null,
      region: user.region ?? null,
      city: user.city ?? null,
      district: user.district ?? null,
      isp: user.isp ?? null,
      firstVisitTime: user.firstVisitTime,
      lastVisitTime: user.lastVisitTime,
      visitCount: user.visitCount,
      isNewUser: user.visitCount === 1,
      totalSessions: sessionCount,
      totalPageViews: validPageViews,
      totalDuration: Math.round(pageViewStats?.totalDuration || 0),
      avgDuration: Math.round(pageViewStats?.avgDuration || 0),
    });
  }
  
  return usersWithStats;
}

// 获取当日访问次数最多用户的IP
export function getMostVisitedUserIP(startDate?: number, endDate?: number): { ip: string; visitCount: number } | null {
  const database = getDb();
  
  let query = `
    SELECT 
      u.ip,
      COUNT(DISTINCT pv.pageViewId) as visitCount
    FROM page_views pv
    JOIN users u ON pv.userId = u.userId
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  // 排除首页和列表页
  query += " AND pv.path != '/'";
  query += " AND pv.path != '/posts'";
  query += " AND pv.path != '/notes'";
  
  if (startDate) {
    query += ' AND pv.timestamp >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND pv.timestamp <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY u.ip ORDER BY visitCount DESC LIMIT 1';
  
  const result = database.prepare(query).get(...params) as any;
  
  if (result && result.ip) {
    return {
      ip: result.ip,
      visitCount: result.visitCount || 0,
    };
  }
  
  return null;
}

// 获取当日浏览总时长最长用户的IP
export function getLongestDurationUserIP(startDate?: number, endDate?: number): { ip: string; totalDuration: number } | null {
  const database = getDb();
  
  let query = `
    SELECT 
      u.ip,
      SUM(COALESCE(pv.duration, 0)) as totalDuration
    FROM page_views pv
    JOIN users u ON pv.userId = u.userId
    WHERE 1=1
  `;
  
  const params: any[] = [];
  
  // 排除首页和列表页
  query += " AND pv.path != '/'";
  query += " AND pv.path != '/posts'";
  query += " AND pv.path != '/notes'";
  
  if (startDate) {
    query += ' AND pv.timestamp >= ?';
    params.push(startDate);
  }
  
  if (endDate) {
    query += ' AND pv.timestamp <= ?';
    params.push(endDate);
  }
  
  query += ' GROUP BY u.ip ORDER BY totalDuration DESC LIMIT 1';
  
  const result = database.prepare(query).get(...params) as any;
  
  if (result && result.ip) {
    return {
      ip: result.ip,
      totalDuration: Math.round(result.totalDuration || 0),
    };
  }
  
  return null;
}

// 关闭数据库连接（用于清理）
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

