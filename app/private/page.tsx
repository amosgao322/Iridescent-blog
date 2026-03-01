'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function PrivatePostsListPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
    fetchPosts();
  }, [router]);

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/private-posts/list');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching private posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">私密文章</h1>
        <p className="text-gray-600">仅管理员可见</p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无私密文章</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/private/${post.slug}`}
              className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{post.title}</h2>
              {post.excerpt && (
                <p className="text-gray-600 mb-3">{post.excerpt}</p>
              )}
              <div className="flex items-center text-sm text-gray-500">
                <span>{post.date}</span>
                <span className="mx-2">·</span>
                <span>大约{post.readingTime}分钟阅读</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

