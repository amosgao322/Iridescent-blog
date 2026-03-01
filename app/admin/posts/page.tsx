'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Post {
  slug: string;
  title: string;
  date: string;
  category: string;
}

export default function PostsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await fetch('/api/posts/list');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`确定要删除文章 "${slug}" 吗？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/posts/${slug}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('删除成功');
        fetchPosts();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <div className="space-x-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            返回
          </button>
          <Link
            href="/admin/editor"
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            新建文章
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无文章</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  标题
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  日期
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  分类
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {posts.map((post) => (
                <tr key={post.slug} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/post/${post.slug}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {post.date}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {post.category}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <Link
                      href={`/admin/editor?slug=${encodeURIComponent(post.slug)}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(post.slug)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

