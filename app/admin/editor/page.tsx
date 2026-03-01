'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function EditorContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '生活',
    tags: '',
    series: '',
    coverImage: '',
    coverImageCaption: '',
    excerpt: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);

    // 检查是否是编辑模式
    const slug = searchParams.get('slug');
    if (slug) {
      setIsEditMode(true);
      setEditSlug(slug);
      loadPost(slug);
    }
  }, [router, searchParams]);

  // 检查是否有未保存的内容
  const hasUnsavedContent = () => {
    return title.trim().length > 0 || content.trim().length > 0;
  };

  // 监听页面离开事件，防止意外丢失内容
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedContent()) {
        e.preventDefault();
        e.returnValue = '您有未保存的内容，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [title, content]);

  // 处理取消按钮点击
  const handleCancel = () => {
    if (hasUnsavedContent()) {
      if (!confirm('您有未保存的内容，确定要离开吗？未保存的内容将丢失！')) {
        return;
      }
    }
    router.back();
  };

  const loadPost = async (slug: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        const post = data.post;
        setTitle(post.title);
        setContent(post.content);
        setMetadata({
          date: post.date,
          category: post.category || '生活',
          tags: post.tags ? post.tags.join(', ') : '',
          series: post.series || '',
          coverImage: post.coverImage || '',
          coverImageCaption: post.coverImageCaption || '',
          excerpt: post.excerpt || '',
        });
      } else {
        alert('加载文章失败');
      }
    } catch (error) {
      console.error('Error loading post:', error);
      alert('加载文章失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const postData = {
        title,
        content,
        ...metadata,
        tags: metadata.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
      };

      let res;
      if (isEditMode && editSlug) {
        // 更新文章
        res = await fetch(`/api/posts/${encodeURIComponent(editSlug)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });
      } else {
        // 创建新文章
        res = await fetch('/api/posts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });
      }

      if (res.ok) {
        alert(isEditMode ? '文章更新成功！' : '文章保存成功！');
        router.push('/admin/posts');
      } else {
        const errorData = await res.json();
        alert(errorData.error || '保存失败，请重试');
      }
    } catch (error) {
      console.error('Error saving post:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{isEditMode ? '编辑文章' : '文章编辑器'}</h1>
        <div className="space-x-4">
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title || !content}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (isEditMode ? '更新中...' : '保存中...') : (isEditMode ? '更新文章' : '保存文章')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <input
            type="text"
            placeholder="文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 text-2xl font-bold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <textarea
            placeholder="开始编写你的文章（Markdown 格式）..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[600px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 border border-gray-200 rounded-lg">
            <h2 className="font-semibold mb-4">文章信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">发布日期</label>
                <input
                  type="date"
                  value={metadata.date}
                  onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">分类</label>
                <input
                  type="text"
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={metadata.tags}
                  onChange={(e) => setMetadata({ ...metadata, tags: e.target.value })}
                  placeholder="旅行, 摄影"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">系列</label>
                <input
                  type="text"
                  value={metadata.series}
                  onChange={(e) => setMetadata({ ...metadata, series: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">封面图片 URL</label>
                <input
                  type="text"
                  value={metadata.coverImage}
                  onChange={(e) => setMetadata({ ...metadata, coverImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">封面图简介</label>
                <input
                  type="text"
                  value={metadata.coverImageCaption}
                  onChange={(e) => setMetadata({ ...metadata, coverImageCaption: e.target.value })}
                  placeholder="图片说明文字..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">摘要</label>
                <textarea
                  value={metadata.excerpt}
                  onChange={(e) => setMetadata({ ...metadata, excerpt: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  );
}

