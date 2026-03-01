'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTimeTracker() {
  const pathname = usePathname();
  const startTimeRef = useRef<number>(Date.now());
  const visitIdRef = useRef<string | null>(null);
  const visitIdPathRef = useRef<string | null>(null); // 关键修复：记录 visitId 对应的路径
  const isVisibleRef = useRef<boolean>(true);
  const accumulatedTimeRef = useRef<number>(0);
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const fetchVisitIdAttemptedRef = useRef<boolean>(false);
  const lastSentTimeRef = useRef<number>(0);
  const hasSentInitialUpdateRef = useRef<boolean>(false);

  useEffect(() => {
    // 重置状态（关键：每次路径变化时都重置，避免跨路径复用 visitId）
    startTimeRef.current = Date.now();
    visitIdRef.current = null;
    visitIdPathRef.current = null; // 关键修复：清除 visitId 对应的路径
    accumulatedTimeRef.current = 0;
    lastVisibleTimeRef.current = Date.now();
    isVisibleRef.current = !document.hidden;
    fetchVisitIdAttemptedRef.current = false;
    lastSentTimeRef.current = 0;
    hasSentInitialUpdateRef.current = false;
    
    // 关键修复：清除 sessionStorage 中存储的 visitId，避免跨路径复用
    // 每次路径变化时，都应该重新获取当前路径的 visitId
    sessionStorage.removeItem('current_visit_id');

    // 发送停留时间的辅助函数
    const sendDurationUpdate = (totalDuration: number, force: boolean = false) => {
      const now = Date.now();
      
      // 关键修复：验证 visitId 是否与当前路径匹配（防止跨路径复用 visitId）
      if (visitIdRef.current && visitIdPathRef.current !== pathname) {
        console.warn(`[SendDuration] VisitId path mismatch: visitId=${visitIdRef.current}, visitIdPath=${visitIdPathRef.current}, currentPath=${pathname}, skipping send`);
        // 清除无效的 visitId
        visitIdRef.current = null;
        visitIdPathRef.current = null;
        return;
      }
      
      // 如果强制发送，或者满足条件且距离上次发送超过最小间隔
      // 强制发送时不检查最小间隔，但需要至少1秒的停留时间
      // 正常发送需要满足最小间隔（避免频繁请求）
      const canSend = visitIdRef.current && totalDuration >= 1 && 
                      (force || (now - lastSentTimeRef.current) >= 5000);
      
      if (canSend) {
        const data = {
          visitId: visitIdRef.current,
          duration: Math.round(totalDuration),
        };
        
        // 异步发送（正常情况）
        fetch('/api/analytics/duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        .then((response) => {
          if (!response.ok) {
            console.error('Duration update failed:', response.status, response.statusText);
          }
        })
        .catch((error) => {
          // 记录错误以便调试
          console.error('Failed to send duration update:', error, { visitId: visitIdRef.current, duration: Math.round(totalDuration) });
        });
        lastSentTimeRef.current = now;
        hasSentInitialUpdateRef.current = true;
      }
    };

    // 检查并发送首次更新（当获取到visitId且停留时间已达标时）
    const checkAndSendInitialUpdate = () => {
      if (visitIdRef.current && !hasSentInitialUpdateRef.current) {
        const now = Date.now();
        let totalDuration = accumulatedTimeRef.current;
        if (isVisibleRef.current) {
          totalDuration += (now - lastVisibleTimeRef.current) / 1000;
        }
        if (totalDuration >= 1) { // 降低阈值到1秒
          sendDurationUpdate(totalDuration, true); // 强制发送首次更新
        }
      }
    };

    // 获取当前页面的访问ID
    const fetchVisitId = async () => {
      if (fetchVisitIdAttemptedRef.current) return;
      fetchVisitIdAttemptedRef.current = true;

      try {
        // 通过API获取当前访问的visitId（基于当前路径和最近的时间戳）
        const response = await fetch(`/api/analytics/get-visit-id?path=${encodeURIComponent(pathname)}`, {
          method: 'GET',
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.visitId) {
            // 关键修复：同时记录 visitId 和对应的路径，用于验证心跳时 visitId 是否仍然有效
            visitIdRef.current = data.visitId;
            visitIdPathRef.current = pathname; // 记录 visitId 对应的路径
            sessionStorage.setItem('current_visit_id', data.visitId);
            console.log(`[VisitId] Successfully fetched visitId=${data.visitId} for path=${pathname}`);
            // 获取到visitId后，立即检查是否需要发送首次更新
            setTimeout(checkAndSendInitialUpdate, 100);
          } else {
            // 总是记录警告（方便调试）
            console.warn(`[VisitId] No visitId returned from API for path: ${pathname}`);
          }
        } else {
          // 总是记录错误（方便调试）
          console.error(`[VisitId] Failed to get visitId, status: ${response.status}, path: ${pathname}`);
        }
      } catch (error) {
        // 总是记录错误（方便调试）
        console.error(`[VisitId] Error fetching visitId for path ${pathname}:`, error);
      }
    };

    // 延迟获取visitId，给服务端时间创建访问记录
    // 关键修复：增加延迟和重试次数，因为访问记录创建可能延迟（地理位置查询最多5秒）
    // 第一次尝试：2秒后（给 middleware 和地理位置查询时间）
    setTimeout(fetchVisitId, 2000);
    
    // 第二次尝试：5秒后（如果第一次失败，可能是地理位置查询还在进行）
    setTimeout(() => {
      if (!visitIdRef.current) {
        console.log(`[VisitId] Retry 1: Attempting to fetch visitId for path: ${pathname}`);
        fetchVisitIdAttemptedRef.current = false;
        fetchVisitId();
      }
    }, 5000);
    
    // 第三次尝试：8秒后（最后尝试，确保即使地理位置查询失败也能获取到）
    setTimeout(() => {
      if (!visitIdRef.current) {
        console.log(`[VisitId] Retry 2: Attempting to fetch visitId for path: ${pathname}`);
        fetchVisitIdAttemptedRef.current = false;
        fetchVisitId();
      }
    }, 8000);

    // 处理页面可见性变化
    const handleVisibilityChange = () => {
      const now = Date.now();
      
      if (document.hidden) {
        // 页面隐藏，累计当前可见时间
        if (isVisibleRef.current) {
          accumulatedTimeRef.current += (now - lastVisibleTimeRef.current) / 1000;
          isVisibleRef.current = false;
          
          // 页面隐藏时立即发送一次更新（减少延迟）
          // 使用强制发送，确保数据能记录
          sendDurationUpdate(accumulatedTimeRef.current, true);
        }
      } else {
        // 页面可见，记录可见开始时间
        isVisibleRef.current = true;
        lastVisibleTimeRef.current = now;
      }
    };

    // 处理页面卸载
    const handleBeforeUnload = () => {
      const now = Date.now();
      let totalDuration = accumulatedTimeRef.current;
      
      if (isVisibleRef.current) {
        totalDuration += (now - lastVisibleTimeRef.current) / 1000;
      }

      // 发送停留时间（多重保障机制，确保数据能发送）
      if (totalDuration > 0 && visitIdRef.current) {
        const data = {
          visitId: visitIdRef.current,
          duration: Math.round(totalDuration),
          isHeartbeat: true, // 关键修复：标记为心跳，确保更新 lastActivityTime
        };
        
        // 在生产环境也输出关键日志，方便调试
        console.log('[PageUnload] Sending final duration:', data);
        
        // 策略1：优先使用 sendBeacon（异步，不阻塞，移动端支持好）
        let beaconSent = false;
        if (navigator.sendBeacon) {
          try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));
            beaconSent = navigator.sendBeacon('/api/analytics/duration', formData);
            console.log('[PageUnload] sendBeacon result:', beaconSent, data);
          } catch (beaconError) {
            console.error('[PageUnload] sendBeacon error:', beaconError, data);
          }
        }
        
        // 策略2：如果 sendBeacon 失败或不支持，使用 fetch with keepalive
        if (!beaconSent) {
          try {
            fetch('/api/analytics/duration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
              keepalive: true, // 关键：keepalive 确保请求在页面关闭后也能完成
            })
            .then((response) => {
              console.log('[PageUnload] Fetch keepalive response:', response.ok, response.status, data);
              if (!response.ok) {
                console.error('[PageUnload] Fetch keepalive failed:', response.status, response.statusText);
              }
            })
            .catch((fetchError) => {
              console.error('[PageUnload] Fetch keepalive error:', fetchError, data);
              // 如果 fetch 也失败，尝试同步 XMLHttpRequest（最后手段）
              try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/analytics/duration', false);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(data));
                console.log('[PageUnload] XHR sync result:', xhr.status, data);
                if (xhr.status !== 200) {
                  console.error('[PageUnload] XHR sync failed:', xhr.status, xhr.statusText);
                }
              } catch (xhrError) {
                console.error('[PageUnload] XHR sync error:', xhrError, data);
              }
            });
          } catch (fetchError) {
            console.error('[PageUnload] Fetch error:', fetchError, data);
          }
        }
      } else {
        console.warn('[PageUnload] Cannot send duration:', { totalDuration, visitId: visitIdRef.current });
      }
    };

    // 心跳机制：定期发送停留时间（每3秒，确保最终停留时间能被记录）
    // 在移动端（特别是微信浏览器、夸克浏览器），页面卸载事件可能不触发
    // 使用心跳机制：每次发送都更新 lastActivityTime，服务器端可以通过最后活动时间计算停留时间
    const HEARTBEAT_INTERVAL = 3000; // 心跳间隔3秒（更频繁，提高准确性）
    
    const heartbeatIntervalId = setInterval(() => {
      const now = Date.now();
      let totalDuration = accumulatedTimeRef.current;
      
      if (isVisibleRef.current) {
        totalDuration += (now - lastVisibleTimeRef.current) / 1000;
      }

      // 如果还没有visitId，再次尝试获取
      if (!visitIdRef.current && !fetchVisitIdAttemptedRef.current) {
        fetchVisitId();
      }

      // 关键修复：检查 visitId 是否仍然有效（防止组件卸载后心跳继续运行）
      // 如果 visitIdRef.current 为 null，说明组件已卸载或路径已变化，停止心跳
      if (!visitIdRef.current) {
        // visitId 已被清除，说明组件已卸载或路径已变化，停止心跳
        return;
      }
      
      // 关键修复：验证 visitId 是否与当前路径匹配（防止跨路径复用 visitId）
      // 如果 visitId 对应的路径与当前路径不一致，说明路径已变化，停止心跳
      if (visitIdPathRef.current !== pathname) {
        console.warn(`[Heartbeat] VisitId path mismatch: visitId=${visitIdRef.current}, visitIdPath=${visitIdPathRef.current}, currentPath=${pathname}, stopping heartbeat`);
        // 清除无效的 visitId，等待新的 visitId 获取
        visitIdRef.current = null;
        visitIdPathRef.current = null;
        return;
      }
      
      // 心跳：总是发送当前停留时间（即使很小），让服务器知道用户还在
      // 这样即使页面卸载事件不触发，服务器也能通过心跳停止来判断用户离开
      // 降低阈值到 0.5 秒，确保更早发送心跳
      if (totalDuration >= 0.5) {
        const currentVisitId = visitIdRef.current; // 保存当前 visitId，防止在发送过程中被清除
        const data = {
          visitId: currentVisitId,
          duration: Math.round(totalDuration),
          isHeartbeat: true, // 标记为心跳，服务器可以记录最后活动时间
        };
        
        // 输出心跳发送日志（总是输出，方便调试）
        console.log(`[Heartbeat] Sending: visitId=${currentVisitId}, duration=${Math.round(totalDuration)}, path=${pathname}`);
        
        // 发送心跳（使用 fetch，不等待响应，避免阻塞）
        fetch('/api/analytics/duration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        .then((response) => {
          if (response.ok) {
            console.log(`[Heartbeat] Success: visitId=${currentVisitId}, duration=${Math.round(totalDuration)}, status=${response.status}, path=${pathname}`);
          } else {
            console.error(`[Heartbeat] Failed: visitId=${currentVisitId}, status=${response.status}, statusText=${response.statusText}, path=${pathname}`);
          }
        })
        .catch((error) => {
          console.error(`[Heartbeat] Error: visitId=${currentVisitId}, error=`, error, `path=${pathname}`);
        });
        
        // 更新最后发送时间
        lastSentTimeRef.current = now;
        hasSentInitialUpdateRef.current = true;
      } else {
        // 如果条件不满足，输出调试信息（总是输出，方便调试）
        console.log(`[Heartbeat] Skipped: visitId=${visitIdRef.current || 'null'}, totalDuration=${totalDuration.toFixed(2)}, isVisible=${isVisibleRef.current}, path=${pathname}`);
      }
    }, HEARTBEAT_INTERVAL);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // 使用多个事件来捕获页面卸载，提高移动端兼容性
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload); // 移动端更可靠
    window.addEventListener('unload', handleBeforeUnload); // 备用方案

    // 关键修复：不再从 sessionStorage 获取 visitId
    // 因为 sessionStorage 可能存储的是其他路径的 visitId，导致跨路径复用
    // 每次路径变化时，都应该通过 API 重新获取当前路径的 visitId

    return () => {
      // 关键修复：立即清除心跳定时器，避免继续更新已离开页面的停留时间
      clearInterval(heartbeatIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('unload', handleBeforeUnload);
      
      // 关键修复：清除 visitId，避免心跳继续使用旧的 visitId
      // 注意：这里不清除 sessionStorage，因为可能还有其他标签页在使用
      // 但会清除当前组件的 visitIdRef，确保心跳停止
      const finalVisitId = visitIdRef.current;
      visitIdRef.current = null; // 立即清除，防止心跳继续使用
      visitIdPathRef.current = null; // 同时清除路径记录
      
      // 页面卸载时发送最终数据
      const now = Date.now();
      let totalDuration = accumulatedTimeRef.current;
      
      if (isVisibleRef.current) {
        totalDuration += (now - lastVisibleTimeRef.current) / 1000;
      }

      if (totalDuration > 0 && finalVisitId) {
        const data = {
          visitId: finalVisitId,
          duration: Math.round(totalDuration),
          isHeartbeat: true, // 关键修复：标记为心跳，确保更新 lastActivityTime
        };
        
        // 组件卸载时也使用多重保障机制
        console.log('[ComponentUnmount] Sending final duration:', data);
        
        let beaconSent = false;
        if (navigator.sendBeacon) {
          try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));
            beaconSent = navigator.sendBeacon('/api/analytics/duration', formData);
            console.log('[ComponentUnmount] sendBeacon result:', beaconSent, data);
          } catch (beaconError) {
            console.error('[ComponentUnmount] sendBeacon error:', beaconError, data);
          }
        }
        
        if (!beaconSent) {
          try {
            fetch('/api/analytics/duration', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
              keepalive: true,
            })
            .then((response) => {
              console.log('[ComponentUnmount] Fetch keepalive response:', response.ok, response.status, data);
            })
            .catch((fetchError) => {
              console.error('[ComponentUnmount] Fetch keepalive error:', fetchError, data);
              // 如果 fetch 也失败，尝试同步 XMLHttpRequest（最后手段）
              try {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/analytics/duration', false);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(data));
                console.log('[ComponentUnmount] XHR sync result:', xhr.status, data);
              } catch (xhrError) {
                console.error('[ComponentUnmount] XHR sync error:', xhrError, data);
              }
            });
          } catch (fetchError) {
            console.error('[ComponentUnmount] Fetch error:', fetchError, data);
          }
        }
      }
    };
  }, [pathname]);

  // 这个组件不渲染任何内容
  return null;
}

