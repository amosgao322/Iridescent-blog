'use client';

import { useState, useEffect } from 'react';
import { Comment } from '@/lib/comments';

interface CommentsProps {
  postSlug: string;
}

export default function Comments({ postSlug }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    content: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [postSlug]);

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postSlug)}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(postSlug)}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setFormData({ nickname: '', email: '', content: '' });
        // 重新获取评论列表
        await fetchComments();
        // 3秒后清除成功消息
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || '提交评论失败');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setError('提交评论失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      const res = await fetch(
        `/api/posts/${encodeURIComponent(postSlug)}/comments/${commentId}/like`,
        {
          method: 'POST',
        }
      );

      if (res.ok) {
        // 更新本地评论列表
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === commentId
              ? { ...comment, likes: (comment.likes || 0) + 1 }
              : comment
          )
        );
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${year}年${month}月${day}日 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // 转义 HTML 防止 XSS
  const escapeHtml = (text: string) => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h2 className="text-xl font-semibold mb-4">评论</h2>

      {/* 评论表单 */}
      <div className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              id="nickname"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="昵称 *"
              maxLength={50}
              required
            />
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="邮箱（选填）"
            />
          </div>
          <textarea
            id="content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="评论内容 *"
            rows={3}
            maxLength={1000}
            required
          />
          <div className="flex items-center justify-between">
            {error && (
              <div className="text-red-600 text-xs">{error}</div>
            )}
            {success && (
              <div className="text-green-600 text-xs">评论提交成功！</div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="ml-auto px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? '提交中...' : '提交评论'}
            </button>
          </div>
        </form>
      </div>

      {/* 评论列表 */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">加载中...</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 pb-3 last:border-b-0">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">
                      {escapeHtml(comment.nickname)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {escapeHtml(comment.content)}
                  </p>
                </div>
                <button
                  onClick={() => handleLike(comment.id)}
                  className="flex-shrink-0 flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors text-sm"
                  title="点赞"
                >
                  <span>👍</span>
                  <span>{comment.likes || 0}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

