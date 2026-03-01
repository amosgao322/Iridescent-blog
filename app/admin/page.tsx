'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showOtherTools, setShowOtherTools] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    const auth = sessionStorage.getItem('admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      sessionStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
    } else {
      setError('密码错误');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <h1 className="text-2xl font-bold mb-6">管理员登录</h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                密码
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition-colors"
            >
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">后台管理</h1>
        <button
          onClick={() => {
            sessionStorage.removeItem('admin_auth');
            setIsAuthenticated(false);
          }}
          className="text-gray-600 hover:text-black"
        >
          退出登录
        </button>
      </div>

      <div className="space-y-6">
        {/* 主要功能 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/upload"
            className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">文件上传</h2>
            <p className="text-gray-600">上传 Markdown 文件和图片</p>
          </Link>

          <Link
            href="/admin/posts"
            className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">文章管理</h2>
            <p className="text-gray-600">查看和管理所有文章</p>
          </Link>

          <Link
            href="/admin/notes"
            className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">随记管理</h2>
            <p className="text-gray-600">创建和管理随记（类似微博/朋友圈）</p>
          </Link>

          <Link
            href="/admin/movies"
            className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">电影管理</h2>
            <p className="text-gray-600">录入和管理影视作品记录（光影）</p>
          </Link>
        </div>

        {/* 统计功能 - 可折叠 */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
          >
            <h2 className="text-xl font-semibold">统计功能</h2>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAnalytics ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-0">
              <Link
                href="/admin/notes-analytics"
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">随记统计</h2>
                <p className="text-gray-600">查看随记访问统计和用户浏览记录</p>
              </Link>

              <Link
                href="/admin/analytics"
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">访问统计 V1</h2>
                <p className="text-gray-600">查看访问量、地理位置等统计数据（基础版）</p>
              </Link>

              <Link
                href="/admin/analytics-v2"
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow bg-blue-50 border-blue-200"
              >
                <h2 className="text-xl font-semibold mb-2">访问统计 V2</h2>
                <p className="text-gray-600">更详细的用户行为分析（滚动深度、参与度、图片点击等）</p>
              </Link>
            </div>
          )}
        </div>

        {/* 其他工具 - 可折叠 */}
        <div className="border border-gray-200 rounded-lg">
          <button
            onClick={() => setShowOtherTools(!showOtherTools)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg"
          >
            <h2 className="text-xl font-semibold">其他工具</h2>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showOtherTools ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showOtherTools && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 pt-0">
              <Link
                href="/admin/friends"
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">友链管理</h2>
                <p className="text-gray-600">管理友链（邻居）</p>
              </Link>

              <Link
                href="/admin/private-posts"
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">私密文章</h2>
                <p className="text-gray-600">管理仅管理员可见的私密文章</p>
              </Link>

              <Link
                href="/admin/about"
                className="block p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">关于页面</h2>
                <p className="text-gray-600">编辑关于页面的内容</p>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

