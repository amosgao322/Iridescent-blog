'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer';
import TableOfContents from '@/components/markdown/TableOfContents';
import MobileTOCModal from '@/components/markdown/MobileTOCModal';
import CoverImage from '@/components/posts/CoverImage';

export default function PrivatePostPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);
  const [slug, setSlug] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
    
    // 处理 params（可能是 Promise）
    Promise.resolve(params).then(resolvedParams => {
      setSlug(resolvedParams.slug);
      loadPost(resolvedParams.slug);
    });
  }, [router, params]);

  const loadPost = async (postSlug: string) => {
    try {
      const res = await fetch(`/api/private-posts/${encodeURIComponent(postSlug)}`);
      if (res.ok) {
        const data = await res.json();
        setPost(data.post);
      } else {
        setPost(null);
      }
    } catch (error) {
      console.error('Error loading private post:', error);
      setPost(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-full lg:max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-full lg:max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">文章不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* 移动端大纲按钮和模态框 */}
      <MobileTOCModal content={post.content} />
      
      {/* PC端固定目录 - 独立模块，固定在屏幕左侧垂直居中 */}
      <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-10 max-h-[80vh] overflow-y-auto">
        <TableOfContents content={post.content} />
      </div>
      
      {/* 文章内容区域 */}
      <div className="max-w-full lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="w-full">
            {post.coverImage && (
              <CoverImage
                src={post.coverImage}
                alt={post.title}
              />
            )}
            
            <header className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">{post.title}</h1>
              <div className="text-gray-600 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm space-y-1 sm:space-y-0">
                  <span>{post.date}</span>
                  <span className="hidden sm:inline">·</span>
                  <span>大约{post.readingTime}分钟阅读</span>
                  {post.wordCount && (
                    <>
                      <span className="hidden sm:inline">·</span>
                      <span className="sm:inline">({post.wordCount}个字)</span>
                    </>
                  )}
                </div>
              </div>
            </header>

            <div className="prose prose-lg max-w-none">
              <MarkdownRenderer content={post.content} />
            </div>
          </article>
      </div>
    </div>
  );
}

