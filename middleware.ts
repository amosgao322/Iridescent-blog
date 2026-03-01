import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // 排除静态资源、API 路由和 Next.js 内部路由
  const pathname = request.nextUrl.pathname;
  
  // 添加日志以便调试
  console.log(`[Middleware] Request received: path=${pathname}`);
  
  // 排除 prefetch 请求（Next.js Link 组件的预加载）
  // Next.js 的 prefetch 请求通常带有以下特征：
  // 1. purpose: prefetch header（最可靠的标识）
  // 2. 通过 _next/data/ 路径（Next.js 数据预取）
  // 3. 带有 _next 查询参数
  const purpose = request.headers.get('purpose');
  const isPrefetch = purpose === 'prefetch' || 
                     pathname.startsWith('/_next/data/') ||
                     request.nextUrl.searchParams.has('_next');
  
  if (
    isPrefetch || // 排除 prefetch 请求
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/private') || // 排除私密文章，不纳入统计
    pathname === '/rss' || // 排除 RSS 订阅（RSS 订阅器会定期自动抓取）
    pathname === '/rss.xml' || // 排除 RSS XML
    pathname.startsWith('/rss/') || // 排除 RSS 相关路径
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|ttf|eot)$/)
  ) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:14',message:'Path excluded from analytics',data:{pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return NextResponse.next();
  }

  // 添加日志以便调试
  console.log(`[Middleware] Calling recordVisit for path=${pathname}`);

  // 异步记录访问，不阻塞请求
  recordVisit(request).catch(err => {
    console.error(`[Middleware] Failed to record visit for path=${pathname}:`, err);
  });

  return NextResponse.next();
}

async function recordVisit(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:25',message:'recordVisit called',data:{pathname:request.nextUrl.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  try {
    const ip = getClientIP(request);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:28',message:'IP retrieved',data:{ip,pathname:request.nextUrl.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    const path = request.nextUrl.pathname;
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;

    // 构建完整的 URL（处理不同环境）
    // 优先使用 request.nextUrl.origin（它已经包含正确的协议）
    // 如果没有，则根据 X-Forwarded-Proto 头来确定协议
    let origin = request.nextUrl.origin;
    
    // 如果 origin 无效（比如是 0.0.0.0），则重新构建
    if (!origin || origin.includes('0.0.0.0')) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
      
      if (host && host !== '0.0.0.0') {
        origin = `${protocol}://${host}`;
      } else {
        // 如果 host 也是 0.0.0.0 或不存在，使用 localhost（仅用于开发环境）
        origin = 'http://localhost:3000';
      }
    }
    
    console.log(`[Middleware] Built origin: ${origin}, original origin: ${request.nextUrl.origin}, host: ${request.headers.get('host')}, proto: ${request.headers.get('x-forwarded-proto')}`);
    
    // 调用内部 API 记录访问（避免在中间件中直接操作文件系统）
    // 使用 fire-and-forget 模式，不等待响应
    const apiUrl = `${origin}/api/analytics/record`;
    console.log(`[Middleware] Calling recordVisit API: ${apiUrl}, path=${path}, ip=${ip}`);
    
    fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true', // 标记为内部请求
      },
      body: JSON.stringify({
        ip,
        path,
        userAgent,
        referer,
      }),
    })
    .then(response => {
      if (!response.ok) {
        console.error(`[Middleware] recordVisit API failed: ${response.status} ${response.statusText}, url=${apiUrl}`);
      } else {
        console.log(`[Middleware] recordVisit API success: path=${path}, ip=${ip}`);
      }
    })
    .catch((error) => {
      // 记录错误以便调试
      console.error(`[Middleware] recordVisit API error:`, error.message, `url=${apiUrl}, path=${path}, ip=${ip}`);
    });
  } catch (error) {
    // 静默失败，不影响主请求
  }
}

function getClientIP(request: NextRequest): string {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:59',message:'getClientIP called',data:{pathname:request.nextUrl.pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  
  // 优先从 X-Real-IP 获取（Nginx 代理设置）
  const realIP = request.headers.get('x-real-ip');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:62',message:'Checking X-Real-IP header',data:{realIP:realIP||null,hasRealIP:!!realIP},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  if (realIP) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:64',message:'Using X-Real-IP',data:{ip:realIP},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return realIP;
  }

  // 从 X-Forwarded-For 获取（可能包含多个 IP，取第一个）
  const forwardedFor = request.headers.get('x-forwarded-for');
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:69',message:'Checking X-Forwarded-For header',data:{forwardedFor:forwardedFor||null,hasForwardedFor:!!forwardedFor},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  if (forwardedFor) {
    const ip = forwardedFor.split(',')[0].trim();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:71',message:'Using X-Forwarded-For',data:{ip,originalValue:forwardedFor},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return ip;
  }

  // 如果 headers 都没有，返回 unknown（Next.js 16 中 NextRequest 没有 ip 属性）
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/c13bc734-5cbc-4b67-9752-d2caac9061e3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'middleware.ts:75',message:'No IP found in headers, returning unknown',data:{allHeaders:Object.fromEntries(request.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  return 'unknown';
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

