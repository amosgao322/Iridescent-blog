import fs from 'fs';
import path from 'path';

const analyticsFilePath = path.join(process.cwd(), 'content/analytics.json');

export interface VisitLog {
  id: string;
  ip: string;
  path: string;
  userAgent?: string;
  referer?: string;
  timestamp: number;
  date: string; // YYYY-MM-DD
  country?: string;
  region?: string;
  city?: string;
  isp?: string;
  duration?: number; // 页面停留时间（秒）
  lastActivityTime?: number; // 最后活动时间（心跳机制，用于计算最终停留时间）
  endTime?: number; // 结束时间戳（简化方案：直接记录结束时间）
}

interface AnalyticsData {
  visits: VisitLog[];
}

// 确保文件存在
function ensureFileExists() {
  const dir = path.dirname(analyticsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(analyticsFilePath)) {
    fs.writeFileSync(analyticsFilePath, JSON.stringify({ visits: [] }, null, 2), 'utf8');
  }
}

// 获取所有访问记录
export function getAllVisits(): VisitLog[] {
  ensureFileExists();
  
  if (!fs.existsSync(analyticsFilePath)) {
    return [];
  }

  try {
    const fileContents = fs.readFileSync(analyticsFilePath, 'utf8');
    const data = JSON.parse(fileContents) as AnalyticsData;
    return data.visits || [];
  } catch (error) {
    console.error('Error reading analytics file:', error);
    return [];
  }
}

// 检查是否是本地IP
function isLocalIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  return (
    ip.startsWith('127.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.') ||
    ip === '::1' ||
    ip.startsWith('::ffff:127.') ||
    ip.startsWith('::ffff:192.168.') ||
    ip.startsWith('::ffff:10.') ||
    ip.startsWith('::ffff:172.')
  );
}

// 检查是否是爬虫或机器人
function isBot(userAgent?: string): boolean {
  if (!userAgent) return true; // 没有User-Agent很可疑
  
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
  
  // 检查是否包含bot关键词
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    return true;
  }
  
  // 检查是否缺少正常浏览器的特征
  const hasBrowserFeatures = 
    /mozilla/i.test(userAgent) && 
    (/chrome/i.test(userAgent) || /firefox/i.test(userAgent) || /safari/i.test(userAgent) || /edge/i.test(userAgent));
  
  // 如果看起来像浏览器但没有正常的浏览器特征，可能是伪装
  if (!hasBrowserFeatures && userAgent.length > 50) {
    // 但允许一些特殊情况（如移动浏览器）
    if (!/mobile/i.test(userAgent) && !/android/i.test(userAgent) && !/iphone/i.test(userAgent)) {
      return true;
    }
  }
  
  return false;
}

// 检查是否是可疑的扫描路径
function isSuspiciousPath(path: string): boolean {
  const suspiciousPaths = [
    '/admin', '/wp-admin', '/wp-login', '/phpmyadmin',
    '/.env', '/.git', '/.svn', '/.htaccess',
    '/config', '/database', '/backup', '/test',
    '/api/v1', '/api/v2', '/api/admin',
    '/login', '/signin', '/register', '/signup',
    '/phpinfo', '/info.php', '/test.php',
    '/.well-known', '/robots.txt', '/sitemap.xml',
  ];
  
  return suspiciousPaths.some(suspicious => path.toLowerCase().includes(suspicious));
}

// 检查访问模式是否可疑（基于历史记录）
function isSuspiciousPattern(visit: Omit<VisitLog, 'id' | 'timestamp' | 'date'>): boolean {
  const visits = getAllVisits();
  const now = Date.now();
  
  // 检查最近1小时内同一IP的访问次数
  const oneHourAgo = now - 60 * 60 * 1000;
  const recentVisitsFromIP = visits.filter(v => 
    v.ip === visit.ip && 
    v.timestamp > oneHourAgo
  );
  
  // 如果1小时内访问超过50次，很可能是爬虫
  if (recentVisitsFromIP.length > 50) {
    return true;
  }
  
  // 检查访问路径的多样性（正常用户通常访问几个页面，爬虫会访问很多）
  const uniquePaths = new Set(recentVisitsFromIP.map(v => v.path));
  if (recentVisitsFromIP.length > 20 && uniquePaths.size > 15) {
    return true;
  }
  
  // 检查是否访问了可疑路径
  if (isSuspiciousPath(visit.path)) {
    return true;
  }
  
  return false;
}

// 添加访问记录（带去重逻辑）
export function addVisit(visit: Omit<VisitLog, 'id' | 'timestamp' | 'date'>): string {
  ensureFileExists();
  
  // 排除本地IP（开发环境）
  // 临时注释：允许本地IP测试
  // if (isLocalIP(visit.ip)) {
  //   return '';
  // }
  
  // 排除统计页面本身的访问（避免循环记录）
  if (visit.path === '/admin/analytics' || visit.path.startsWith('/admin/analytics/')) {
    return '';
  }
  
  // 排除 RSS 订阅路径（RSS 订阅器会定期自动抓取）
  if (visit.path === '/rss' || visit.path === '/rss.xml' || visit.path.startsWith('/rss/')) {
    return '';
  }
  
  // 排除爬虫和机器人
  if (isBot(visit.userAgent)) {
    return '';
  }
  
  // 排除可疑的扫描路径
  if (isSuspiciousPath(visit.path)) {
    return '';
  }
  
  // 排除可疑的访问模式
  if (isSuspiciousPattern(visit)) {
    return '';
  }
  
  // 排除开发环境（通过环境变量）
  // 临时注释：允许开发环境测试统计功能
  // if (process.env.NODE_ENV === 'development') {
  //   return '';
  // }
  
  const visits = getAllVisits();
  const timestamp = Date.now();
  const date = new Date().toISOString().split('T')[0];
  
  // 增强去重逻辑：同一IP在5分钟内访问同一路径只记录一次（从30秒延长到5分钟）
  const dedupeWindow = 5 * 60 * 1000; // 5分钟
  const recentVisit = visits.find(v => 
    v.ip === visit.ip &&
    v.path === visit.path &&
    (timestamp - v.timestamp) < dedupeWindow
  );
  
  if (recentVisit) {
    // 如果5分钟内已有相同访问，不重复记录
    return recentVisit.id;
  }
  
  const id = timestamp.toString() + '-' + Math.random().toString(36).substr(2, 9);
  
  const newVisit: VisitLog = {
    id,
    ...visit,
    timestamp,
    date,
  };

  visits.push(newVisit);
  
  // 只保留最近 90 天的数据，避免文件过大
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const filteredVisits = visits.filter(v => v.timestamp > ninetyDaysAgo);
  
  const data: AnalyticsData = { visits: filteredVisits };
  fs.writeFileSync(analyticsFilePath, JSON.stringify(data, null, 2), 'utf8');

  return id;
}

// 获取每日访问统计
export function getDailyStats(days: number = 30): Record<string, number> {
  const visits = getAllVisits();
  const stats: Record<string, number> = {};
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  visits
    .filter(v => new Date(v.date) >= cutoffDate)
    .forEach(visit => {
      stats[visit.date] = (stats[visit.date] || 0) + 1;
    });
  
  return stats;
}

// 获取地理位置统计（包含每个IP访问的页面）
export function getLocationStats(date?: string): Record<string, { 
  count: number; 
  country?: string; 
  region?: string; 
  city?: string;
  paths: Array<{ path: string; count: number }>;
}> {
  const visits = getAllVisits();
  const filteredVisits = date ? visits.filter(v => v.date === date) : visits;
  const stats: Record<string, { 
    count: number; 
    country?: string; 
    region?: string; 
    city?: string;
    paths: Record<string, number>;
  }> = {};
  
  filteredVisits.forEach(visit => {
    const key = visit.ip;
    if (!stats[key]) {
      stats[key] = {
        count: 0,
        country: visit.country,
        region: visit.region,
        city: visit.city,
        paths: {},
      };
    }
    stats[key].count += 1;
    
    // 记录该IP访问的页面
    if (!visit.path.startsWith('/_next') && !visit.path.startsWith('/api')) {
      stats[key].paths[visit.path] = (stats[key].paths[visit.path] || 0) + 1;
    }
  });
  
  // 转换paths为数组格式
  const result: Record<string, { 
    count: number; 
    country?: string; 
    region?: string; 
    city?: string;
    paths: Array<{ path: string; count: number }>;
  }> = {};
  
  Object.entries(stats).forEach(([ip, data]) => {
    result[ip] = {
      ...data,
      paths: Object.entries(data.paths)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count),
    };
  });
  
  return result;
}

// 获取访问路径统计（包含平均停留时间）
export function getPathStats(limit: number = 20, date?: string): Array<{ path: string; count: number; avgDuration?: number }> {
  const visits = getAllVisits();
  const filteredVisits = date ? visits.filter(v => v.date === date) : visits;
  const stats: Record<string, { count: number; totalDuration: number; durationCount: number }> = {};
  
  filteredVisits.forEach(visit => {
    // 排除静态资源和 API 路由
    if (!visit.path.startsWith('/_next') && !visit.path.startsWith('/api')) {
      if (!stats[visit.path]) {
        stats[visit.path] = { count: 0, totalDuration: 0, durationCount: 0 };
      }
      stats[visit.path].count += 1;
      
      // 如果有停留时间数据，累计
      if (visit.duration !== undefined && visit.duration > 0) {
        stats[visit.path].totalDuration += visit.duration;
        stats[visit.path].durationCount += 1;
      }
    }
  });
  
  return Object.entries(stats)
    .map(([path, data]) => ({
      path,
      count: data.count,
      avgDuration: data.durationCount > 0 ? Math.round(data.totalDuration / data.durationCount) : undefined,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// 获取平均停留时间（秒）
export function getAverageDuration(date?: string): number {
  const visits = getAllVisits();
  const filteredVisits = date ? visits.filter(v => v.date === date) : visits;
  
  const visitsWithDuration = filteredVisits.filter(v => v.duration !== undefined && v.duration > 0);
  
  if (visitsWithDuration.length === 0) {
    return 0;
  }
  
  const totalDuration = visitsWithDuration.reduce((sum, v) => sum + (v.duration || 0), 0);
  return Math.round(totalDuration / visitsWithDuration.length);
}

// 获取总访问量
export function getTotalVisits(): number {
  return getAllVisits().length;
}

// 获取今日访问量
export function getTodayVisits(): number {
  const today = new Date().toISOString().split('T')[0];
  return getAllVisits().filter(v => v.date === today).length;
}

// 获取独立访客数（基于 IP）
export function getUniqueVisitors(): number {
  const visits = getAllVisits();
  const uniqueIPs = new Set(visits.map(v => v.ip));
  return uniqueIPs.size;
}

// 更新指定IP的所有访问记录的地理位置信息
export function updateVisitLocation(
  ip: string,
  location: { country?: string; region?: string; city?: string; isp?: string }
): boolean {
  ensureFileExists();
  
  const visits = getAllVisits();
  let updated = false;
  
  // 更新所有使用该IP的记录
  visits.forEach(visit => {
    if (visit.ip === ip && (!visit.country && !visit.region && !visit.city)) {
      visit.country = location.country;
      visit.region = location.region;
      visit.city = location.city;
      visit.isp = location.isp;
      updated = true;
    }
  });
  
  if (updated) {
    const data: AnalyticsData = { visits };
    fs.writeFileSync(analyticsFilePath, JSON.stringify(data, null, 2), 'utf8');
  }
  
  return updated;
}

