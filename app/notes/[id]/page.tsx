'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Note } from '@/lib/notes';

export default function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string>('');
  const router = useRouter();
  
  // 统计相关
  const viewStartTimeRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const accumulatedTimeRef = useRef<number>(0);
  const hasTrackedViewRef = useRef<boolean>(false);

  // 处理 params（可能是 Promise）
  useEffect(() => {
    Promise.resolve(params).then(resolvedParams => {
      setNoteId(resolvedParams.id);
      loadNote(resolvedParams.id);
    });
  }, [params]);

  const loadNote = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setNote(data.note);
        viewStartTimeRef.current = Date.now();
        lastVisibleTimeRef.current = Date.now();
        accumulatedTimeRef.current = 0;
      } else {
        setNote(null);
      }
    } catch (error) {
      console.error('Error loading note:', error);
      setNote(null);
    } finally {
      setLoading(false);
    }
  };

  // 生成唯一ID
  const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // 获取sessionId和pageViewId
  const getSessionInfo = () => {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      return { sessionId: null, pageViewId: null };
    }
    const sessionId = sessionStorage.getItem('analytics_v2_session_id');
    const pageViewId = sessionStorage.getItem('analytics_v2_pageview_id');
    return { sessionId, pageViewId };
  };

  // 记录随记浏览事件
  useEffect(() => {
    if (!note || hasTrackedViewRef.current) return;
    
    const trackNoteView = async () => {
      const { sessionId, pageViewId } = getSessionInfo();
      if (!sessionId) {
        // 如果还没有session，等待一下再试
        setTimeout(trackNoteView, 1000);
        return;
      }

      try {
        await fetch('/api/analytics-v2/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: generateId(),
            sessionId,
            pageViewId: pageViewId || undefined,
            eventType: 'note_view',
            eventData: {
              noteId: note.id,
            },
            timestamp: Date.now(),
          }),
        });
        hasTrackedViewRef.current = true;
      } catch (error) {
        console.error('Failed to track note view:', error);
      }
    };

    trackNoteView();
  }, [note]);

  // 追踪查看时长（页面可见性API）
  useEffect(() => {
    if (!note) return;

    const handleVisibilityChange = () => {
      const now = Date.now();
      if (document.hidden) {
        // 页面隐藏，累计时间
        if (isVisibleRef.current) {
          accumulatedTimeRef.current += now - lastVisibleTimeRef.current;
        }
        isVisibleRef.current = false;
      } else {
        // 页面显示
        lastVisibleTimeRef.current = now;
        isVisibleRef.current = true;
      }
    };

    // 页面卸载时发送查看时长
    const handleBeforeUnload = () => {
      const now = Date.now();
      if (isVisibleRef.current) {
        accumulatedTimeRef.current += now - lastVisibleTimeRef.current;
      }
      
      const totalDuration = accumulatedTimeRef.current;
      if (totalDuration > 0 && note) {
        const { sessionId, pageViewId } = getSessionInfo();
        if (sessionId) {
          const eventData = {
            eventId: generateId(),
            sessionId,
            pageViewId: pageViewId || undefined,
            eventType: 'note_view_time',
            eventData: {
              noteId: note.id,
              viewDuration: totalDuration,
            },
            timestamp: Date.now(),
          };
          
          // 优先使用 fetch with keepalive
          if (typeof fetch !== 'undefined') {
            fetch('/api/analytics-v2/event', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(eventData),
              keepalive: true,
            }).catch(() => {
              // 如果 fetch 失败，尝试 sendBeacon with FormData
              if (navigator.sendBeacon) {
                const formData = new FormData();
                formData.append('data', JSON.stringify(eventData));
                navigator.sendBeacon('/api/analytics-v2/event', formData);
              }
            });
          } else if (navigator.sendBeacon) {
            const formData = new FormData();
            formData.append('data', JSON.stringify(eventData));
            navigator.sendBeacon('/api/analytics-v2/event', formData);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      
      // 组件卸载时也发送时长
      const now = Date.now();
      if (isVisibleRef.current) {
        accumulatedTimeRef.current += now - lastVisibleTimeRef.current;
      }
      
      const totalDuration = accumulatedTimeRef.current;
      if (totalDuration > 0 && note) {
        const { sessionId, pageViewId } = getSessionInfo();
        if (sessionId) {
          fetch('/api/analytics-v2/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: generateId(),
              sessionId,
              pageViewId: pageViewId || undefined,
              eventType: 'note_view_time',
              eventData: {
                noteId: note.id,
                viewDuration: totalDuration,
              },
              timestamp: Date.now(),
            }),
          }).catch(error => {
            console.error('Failed to track view time:', error);
          });
        }
      }
    };
  }, [note]);

  // ESC键关闭图片查看器
  useEffect(() => {
    if (!selectedImage) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedImage]);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    
    // 记录图片点击事件
    if (note) {
      const { sessionId, pageViewId } = getSessionInfo();
      if (sessionId) {
        fetch('/api/analytics-v2/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: generateId(),
            sessionId,
            pageViewId: pageViewId || undefined,
            eventType: 'note_image_click',
            eventData: {
              noteId: note.id,
              imageUrl: imageUrl,
            },
            timestamp: Date.now(),
          }),
        }).catch(error => {
          console.error('Failed to track image click:', error);
        });
      }
    }
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  // 格式化日期显示（年月日格式）
  const formatDateDisplay = (dateStr: string, createdAt: number) => {
    try {
      const date = new Date(createdAt);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${year}年${month}月${day}日`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-0">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-0">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">随记不存在</p>
          <button
            onClick={() => router.push('/notes')}
            className="text-blue-600 hover:text-blue-800"
          >
            返回随记列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-0">
      {/* 返回按钮 */}
      <button
        onClick={() => router.push('/notes')}
        className="mb-4 text-gray-600 hover:text-gray-800 flex items-center gap-2"
      >
        <span>←</span>
        <span>返回随记列表</span>
      </button>

      <article className="space-y-6">
        {/* 日期标题 */}
        <div>
          <time className="text-sm text-gray-500">
            {formatDateDisplay(note.date, note.createdAt)}
          </time>
        </div>

        {/* 文字内容 */}
        {note.content && (
          <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
            <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed text-gray-800">
              {note.content}
            </p>
          </div>
        )}

        {/* 图片列表 */}
        {note.images && note.images.length > 0 && (
          <div className="space-y-3">
            {note.images.map((image, index) => (
              <div 
                key={index}
                className="relative w-full cursor-pointer rounded-lg overflow-hidden"
                onClick={() => handleImageClick(image)}
              >
                <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                  <Image
                    src={image}
                    alt={`随记图片 ${index + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 视频列表 */}
        {note.videos && note.videos.length > 0 && (
          <div className="space-y-3">
            {note.videos.map((video, index) => (
              <div key={index} className="relative w-full overflow-hidden bg-black rounded-lg">
                <video
                  src={video}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full"
                  style={{ 
                    display: 'block',
                    aspectRatio: '16/9',
                    objectFit: 'contain'
                  }}
                  onLoadedMetadata={(e) => {
                    const videoEl = e.target as HTMLVideoElement;
                    if (videoEl.videoWidth && videoEl.videoHeight) {
                      const aspectRatio = videoEl.videoWidth / videoEl.videoHeight;
                      videoEl.style.aspectRatio = `${aspectRatio}`;
                    }
                  }}
                  onCanPlay={(e) => {
                    const videoEl = e.target as HTMLVideoElement;
                    videoEl.style.opacity = '1';
                  }}
                  onError={(e) => {
                    console.error('视频加载失败:', video, e);
                    const videoEl = e.target as HTMLVideoElement;
                    videoEl.style.display = 'none';
                  }}
                >
                  <source src={video} type="video/mp4" />
                  <source src={video} type="video/webm" />
                  <source src={video} type="video/ogg" />
                  您的浏览器不支持视频播放
                </video>
              </div>
            ))}
          </div>
        )}
      </article>

      {/* 图片查看模态框 */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <button
            onClick={closeImageModal}
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10"
            aria-label="关闭"
          >
            ×
          </button>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage}
              alt="放大图片"
              width={1200}
              height={800}
              className="max-w-full max-h-[90vh] object-contain"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}

