'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface SessionData {
  sessionId: string;
  startTime: number;
  referer?: string;
  userAgent?: string;
}

export default function AnalyticsV2Tracker() {
  const pathname = usePathname();
  const sessionIdRef = useRef<string | null>(null);
  const pageViewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true); // 默认值，在useEffect中更新
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);
  const scrollDepthRef = useRef<number>(0);
  const maxScrollDepthRef = useRef<number>(0);
  const hasMouseActivityRef = useRef<boolean>(false);
  const hasKeyboardActivityRef = useRef<boolean>(false);
  const lastHeartbeatRef = useRef<number>(0);
  const scrollDepthMilestonesRef = useRef<Set<number>>(new Set());

  // 生成唯一ID
  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 获取或创建会话ID
  const getOrCreateSession = async (): Promise<string> => {
    console.log('[AnalyticsV2] getOrCreateSession called');
    if (sessionIdRef.current) {
      console.log('[AnalyticsV2] Using existing session:', sessionIdRef.current);
      return sessionIdRef.current;
    }

    // 只在客户端访问sessionStorage
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      // 尝试从sessionStorage获取
      const storedSessionId = sessionStorage.getItem('analytics_v2_session_id');
      const storedSessionStart = sessionStorage.getItem('analytics_v2_session_start');
      
      // 如果会话存在且未过期（30分钟）
      if (storedSessionId && storedSessionStart) {
        const sessionAge = Date.now() - parseInt(storedSessionStart, 10);
        if (sessionAge < 30 * 60 * 1000) {
          sessionIdRef.current = storedSessionId;
          return sessionIdRef.current;
        }
      }
    }

    // 创建新会话
    const newSessionId = generateId();
    sessionIdRef.current = newSessionId;
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('analytics_v2_session_id', newSessionId);
      sessionStorage.setItem('analytics_v2_session_start', Date.now().toString());
    }

    // 发送会话创建请求
    try {
      await fetch('/api/analytics-v2/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: newSessionId,
          startTime: Date.now(),
          referer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
          userAgent: typeof navigator !== 'undefined' ? (navigator.userAgent || undefined) : undefined,
        }),
      });
    } catch (error) {
      console.error('[AnalyticsV2] Failed to create session:', error);
    }

    return newSessionId;
  };

  // 记录页面访问
  const recordPageView = async (): Promise<void> => {
    console.log('[AnalyticsV2] recordPageView called');
    try {
      console.log('[AnalyticsV2] Getting or creating session...');
      const sessionId = await getOrCreateSession();
      console.log('[AnalyticsV2] Session ID:', sessionId);
      
      if (!sessionId) {
        console.warn('[AnalyticsV2] No session ID, skipping page view');
        return;
      }
      
      const pageViewId = generateId();
      console.log('[AnalyticsV2] Generated pageViewId:', pageViewId);
      pageViewIdRef.current = pageViewId;
      // 存储到sessionStorage以便其他组件访问
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('analytics_v2_pageview_id', pageViewId);
      }
      startTimeRef.current = Date.now();
      scrollDepthRef.current = 0;
      maxScrollDepthRef.current = 0;
      scrollDepthMilestonesRef.current.clear();
      hasMouseActivityRef.current = false;
      hasKeyboardActivityRef.current = false;
      accumulatedTimeRef.current = 0;
      lastVisibleTimeRef.current = Date.now();
      lastHeartbeatRef.current = 0; // 重置心跳时间，确保第一次心跳能发送
      // 只在客户端访问document
      if (typeof document !== 'undefined') {
        isVisibleRef.current = !document.hidden;
      }

      const pageViewData = {
        pageViewId,
        sessionId,
        path: pathname,
        timestamp: Date.now(),
        referer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
        userAgent: typeof navigator !== 'undefined' ? (navigator.userAgent || undefined) : undefined,
      };
      
      console.log('[AnalyticsV2] Sending page view data:', pageViewData);
      
      const response = await fetch('/api/analytics-v2/pageview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pageViewData),
      });
      
      if (response.ok) {
        console.log('[AnalyticsV2] Page view recorded successfully');
      } else {
        console.error('[AnalyticsV2] Page view recording failed:', response.status, response.statusText);
      }

      // 更新会话的页面计数（如果不是首次访问）
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        const previousPageViewId = sessionStorage.getItem('analytics_v2_previous_pageview_id');
        if (previousPageViewId && sessionId) {
          // 说明这是会话中的第二个页面，更新pageCount
          // 这里不直接更新，而是在后端统计时计算
        }
        sessionStorage.setItem('analytics_v2_previous_pageview_id', pageViewId);
      }
    } catch (error) {
      console.error('[AnalyticsV2] Failed to record page view:', error);
    }
  };

  // 更新滚动深度
  const updateScrollDepth = () => {
    if (!pageViewIdRef.current) {
      console.log('[AnalyticsV2] updateScrollDepth skipped: no pageViewId');
      return;
    }
    
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('[AnalyticsV2] updateScrollDepth skipped: window or document not available');
      return;
    }

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    const scrollPercentage = Math.round(
      ((scrollTop + windowHeight) / documentHeight) * 100
    );
    
    // 总是记录滚动深度，即使没有增加（用于调试）
    if (scrollPercentage !== maxScrollDepthRef.current) {
      console.log('[AnalyticsV2] Scroll depth changed:', {
        old: maxScrollDepthRef.current,
        new: scrollPercentage,
        path: pathname,
      });
    }
    
    if (scrollPercentage > maxScrollDepthRef.current) {
      maxScrollDepthRef.current = scrollPercentage;
      scrollDepthRef.current = scrollPercentage;

      // 添加调试日志
      console.log('[AnalyticsV2] Scroll depth updated:', {
        scrollPercentage,
        maxScrollDepth: maxScrollDepthRef.current,
        path: pathname,
      });

      // 记录滚动里程碑（25%, 50%, 75%, 100%）
      const milestones = [25, 50, 75, 100];
      milestones.forEach(milestone => {
        if (
          scrollPercentage >= milestone &&
          !scrollDepthMilestonesRef.current.has(milestone)
        ) {
          scrollDepthMilestonesRef.current.add(milestone);
          
          console.log('[AnalyticsV2] Scroll milestone reached:', milestone);
          
          // 发送参与度信号
          if (sessionIdRef.current) {
            fetch('/api/analytics-v2/engagement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                signalId: generateId(),
                sessionId: sessionIdRef.current,
                pageViewId: pageViewIdRef.current,
                signalType: 'scroll_depth',
                value: milestone,
                timestamp: Date.now(),
              }),
            }).catch(error => {
              console.error('[AnalyticsV2] Failed to record scroll depth:', error);
            });
          }
        }
      });
    }
  };

  // 发送参与度信号
  const sendEngagementSignal = (signalType: string, value?: number) => {
    if (!sessionIdRef.current || !pageViewIdRef.current) return;

    fetch('/api/analytics-v2/engagement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signalId: generateId(),
        sessionId: sessionIdRef.current,
        pageViewId: pageViewIdRef.current,
        signalType,
        value,
        timestamp: Date.now(),
      }),
    }).catch(error => {
      console.error('[AnalyticsV2] Failed to send engagement signal:', error);
    });
  };

  // 心跳机制：定期发送停留时间和参与度数据
  const sendHeartbeat = () => {
    if (!sessionIdRef.current || !pageViewIdRef.current) {
      console.log('[AnalyticsV2] Heartbeat skipped: missing sessionId or pageViewId', {
        sessionId: sessionIdRef.current,
        pageViewId: pageViewIdRef.current,
      });
      return;
    }

    const now = Date.now();
    let totalDuration = accumulatedTimeRef.current;
    
    if (isVisibleRef.current) {
      totalDuration += (now - lastVisibleTimeRef.current) / 1000;
    }

    // 每5秒发送一次心跳
    if (now - lastHeartbeatRef.current < 5000) {
      return;
    }
    lastHeartbeatRef.current = now;

    const data = {
      pageViewId: pageViewIdRef.current,
      duration: Math.round(totalDuration),
      scrollDepth: maxScrollDepthRef.current,
    };

    // 添加调试日志
    console.log('[AnalyticsV2] Heartbeat:', {
      pageViewId: pageViewIdRef.current,
      duration: Math.round(totalDuration),
      scrollDepth: maxScrollDepthRef.current,
      path: pathname,
    });

    // 更新页面访问的停留时间和滚动深度
    fetch('/api/analytics-v2/pageview', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    .then(response => {
      if (!response.ok) {
        console.error('[AnalyticsV2] Heartbeat failed:', response.status, response.statusText);
      } else {
        console.log('[AnalyticsV2] Heartbeat success');
      }
    })
    .catch(error => {
      console.error('[AnalyticsV2] Failed to update page view:', error);
    });
  };

  // 页面卸载处理
  const handleBeforeUnload = () => {
    if (!sessionIdRef.current || !pageViewIdRef.current) return;

    const now = Date.now();
    let totalDuration = accumulatedTimeRef.current;
    
    if (isVisibleRef.current) {
      totalDuration += (now - lastVisibleTimeRef.current) / 1000;
    }

    const data = {
      pageViewId: pageViewIdRef.current,
      duration: Math.round(totalDuration),
      scrollDepth: maxScrollDepthRef.current,
      isExit: true,
    };

    console.log('[AnalyticsV2] Page unload, sending final data:', data);

    // 优先使用 fetch with keepalive（更可靠）
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics-v2/pageview?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true, // 关键：keepalive 确保请求在页面关闭后也能完成
      })
      .then(response => {
        console.log('[AnalyticsV2] Unload request sent, status:', response.status);
      })
      .catch(error => {
        console.error('[AnalyticsV2] Unload request failed:', error);
        // 如果 fetch 失败，尝试 sendBeacon
        if (navigator.sendBeacon) {
          // sendBeacon 只支持 POST，使用 FormData
          const formData = new FormData();
          formData.append('data', JSON.stringify(data));
          const success = navigator.sendBeacon('/api/analytics-v2/pageview?action=update', formData);
          console.log('[AnalyticsV2] SendBeacon result:', success);
        }
      });
    } else if (navigator.sendBeacon) {
      // 备用方案：使用 sendBeacon
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      const success = navigator.sendBeacon('/api/analytics-v2/pageview?action=update', formData);
      console.log('[AnalyticsV2] SendBeacon result:', success);
    }
  };

  useEffect(() => {
    console.log('[AnalyticsV2] useEffect triggered, pathname:', pathname);
    
    // 排除不需要统计的路径（包括所有管理后台页面）
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/private')
    ) {
      console.log('[AnalyticsV2] Path excluded:', pathname);
      return;
    }

    console.log('[AnalyticsV2] Starting to record page view for:', pathname);
    
    // 心跳和事件处理函数定义
    let heartbeatInterval: NodeJS.Timeout | null = null;
    
    const startHeartbeat = () => {
      if (heartbeatInterval) {
        console.log('[AnalyticsV2] Heartbeat already started');
        return; // 避免重复启动
      }
      
      if (!pageViewIdRef.current || !sessionIdRef.current) {
        console.warn('[AnalyticsV2] Cannot start heartbeat: pageViewId or sessionId not ready', {
          pageViewId: pageViewIdRef.current,
          sessionId: sessionIdRef.current,
        });
        return;
      }
      
      console.log('[AnalyticsV2] Starting heartbeat interval');
      
      // 立即执行一次心跳（延迟1秒，确保数据已准备好）
      setTimeout(() => {
        sendHeartbeat();
      }, 1000);
      
      // 然后每5秒执行一次
      heartbeatInterval = setInterval(() => {
        sendHeartbeat();
      }, 5000);
    };

    // 滚动深度追踪
    const handleScroll = () => {
      console.log('[AnalyticsV2] Scroll event detected');
      updateScrollDepth();
    };

    // 页面可见性追踪
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // 页面隐藏，累计可见时间
        if (isVisibleRef.current) {
          accumulatedTimeRef.current += (now - lastVisibleTimeRef.current) / 1000;
          isVisibleRef.current = false;
          sendEngagementSignal('page_hidden');
        }
      } else {
        // 页面可见
        isVisibleRef.current = true;
        lastVisibleTimeRef.current = now;
        sendEngagementSignal('page_visible');
      }
    };

    // 鼠标活动追踪
    const handleMouseMove = () => {
      if (!hasMouseActivityRef.current) {
        hasMouseActivityRef.current = true;
        sendEngagementSignal('mouse_activity', 1);
      }
    };

    const handleMouseClick = () => {
      sendEngagementSignal('mouse_click', 1);
    };

    // 键盘活动追踪
    const handleKeyPress = () => {
      if (!hasKeyboardActivityRef.current) {
        hasKeyboardActivityRef.current = true;
        sendEngagementSignal('keyboard_activity', 1);
      }
    };

    // 链接点击追踪
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.href) {
        sendEngagementSignal('link_click', 1);
        
        // 记录链接点击事件
        if (sessionIdRef.current && pageViewIdRef.current) {
          fetch('/api/analytics-v2/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: generateId(),
              sessionId: sessionIdRef.current,
              pageViewId: pageViewIdRef.current,
              eventType: 'link_click',
              eventData: {
                url: link.href,
                text: link.textContent?.trim() || '',
              },
              timestamp: Date.now(),
            }),
          }).catch(error => {
            console.error('[AnalyticsV2] Failed to record link click:', error);
          });
        }
      }
    };

    // 记录页面访问（异步，完成后启动心跳）
    recordPageView().then(() => {
      console.log('[AnalyticsV2] Page view recorded, starting heartbeat');
      // 页面访问记录完成后，启动心跳
      startHeartbeat();
    }).catch(error => {
      console.error('[AnalyticsV2] Failed to record page view:', error);
    });

    // 事件监听
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleMouseClick, { passive: true });
    document.addEventListener('keypress', handleKeyPress, { passive: true });
    document.addEventListener('click', handleLinkClick, { passive: true });
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    // 初始滚动深度检查
    setTimeout(updateScrollDepth, 100);

    // 清理函数
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('analytics_v2_pageview_id');
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleMouseClick);
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('click', handleLinkClick);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);

      // 页面卸载时发送最终数据
      handleBeforeUnload();
    };
  }, [pathname]);

  return null;
}

