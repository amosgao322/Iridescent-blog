'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Note } from '@/lib/notes';

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await fetch('/api/notes');
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
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

  // 获取文字预览（前3-5行）
  const getTextPreview = (content: string, maxLines: number = 4): string => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length <= maxLines) {
      return content;
    }
    return lines.slice(0, maxLines).join('\n') + '...';
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-0">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">随记</h1>
      
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无随记</p>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8">
          {notes.map((note) => {
            const hasImages = note.images && note.images.length > 0;
            const hasVideos = note.videos && note.videos.length > 0;
            const hasMedia = hasImages || hasVideos;
            const textPreview = note.content ? getTextPreview(note.content) : '';
            const isFullText = note.content && note.content === textPreview;
            
            return (
              <Link 
                key={note.id} 
                href={`/notes/${note.id}`}
                className="block"
              >
                <article className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  {/* 日期标题 */}
                  <div className="mb-3">
                    <time className="text-sm text-gray-500">
                      {formatDateDisplay(note.date, note.createdAt)}
                    </time>
                  </div>

                  {/* 内容区域 - 移动端优化：上下排列 */}
                  <div className="space-y-4">
                    {/* 文字预览 */}
                    {note.content && (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed text-gray-800 line-clamp-4">
                          {textPreview}
                        </p>
                        {!isFullText && (
                          <span className="text-blue-600 text-sm mt-2 inline-block">
                            查看全文 →
                          </span>
                        )}
                      </div>
                    )}

                    {/* 图片/视频缩略图 - 移动端：显示在文字下方 */}
                    {hasMedia && (
                      <div className="flex gap-2 flex-wrap">
                        {hasImages && note.images && (
                          <>
                            {note.images.slice(0, 3).map((image, index) => (
                              <div 
                                key={index}
                                className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded overflow-hidden"
                              >
                                <Image
                                  src={image}
                                  alt={`随记图片 ${index + 1}`}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                            ))}
                            {note.images.length > 3 && (
                              <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded overflow-hidden bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-600 text-xs">+{note.images.length - 3}</span>
                              </div>
                            )}
                          </>
                        )}
                        {hasVideos && note.videos && !hasImages && (
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded overflow-hidden bg-black flex items-center justify-center">
                            <span className="text-white text-xs">视频</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

