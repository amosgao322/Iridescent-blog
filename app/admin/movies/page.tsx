'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Movie, MovieStatus } from '@/lib/movies';

export default function MoviesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [name, setName] = useState('');
  const [score, setScore] = useState<number>(0);
  const [status, setStatus] = useState<MovieStatus>('待观看');
  const [review, setReview] = useState('');
  const [tag, setTag] = useState('');
  const [coverImage, setCoverImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
    fetchMovies();
  }, [router]);

  const fetchMovies = async () => {
    try {
      const res = await fetch('/api/movies');
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies || []);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('名称不能为空');
      return;
    }

    if (score < 0 || score > 100) {
      alert('评分必须在0-100之间');
      return;
    }

    setSaving(true);
    try {
      const url = editingMovie 
        ? `/api/movies/${editingMovie.id}`
        : '/api/movies';
      const method = editingMovie ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: name.trim(), 
          score, 
          status, 
          review: review.trim(),
          tag: tag.trim() || undefined,
          coverImage: coverImage || undefined
        }),
      });

      if (res.ok) {
        alert(editingMovie ? '更新成功' : '创建成功');
        setShowEditor(false);
        setEditingMovie(null);
        resetForm();
        fetchMovies();
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setName(movie.name);
    setScore(movie.score);
    setStatus(movie.status);
    setReview(movie.review);
    setTag(movie.tag || '');
    setCoverImage(movie.coverImage || '');
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/movies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('删除成功');
        fetchMovies();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleUploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setCoverImage(data.url);
      } else {
        alert('上传失败');
      }
    } catch (error) {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleAddImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUploadFile(file);
      }
    };
    input.click();
  };

  const resetForm = () => {
    setName('');
    setScore(0);
    setStatus('待观看');
    setReview('');
    setTag('');
    setCoverImage('');
  };

  // 检查是否有未保存的内容
  const hasUnsavedContent = () => {
    return name.trim().length > 0 || review.trim().length > 0 || tag.trim().length > 0 || coverImage.length > 0 || score > 0;
  };

  // 处理新建按钮点击
  const handleNewMovie = () => {
    if (showEditor && hasUnsavedContent()) {
      if (!confirm('您有未保存的内容，确定要清空并新建吗？未保存的内容将丢失！')) {
        return;
      }
    }
    setShowEditor(true);
    setEditingMovie(null);
    resetForm();
  };

  // 处理取消按钮点击
  const handleCancel = () => {
    if (hasUnsavedContent()) {
      if (!confirm('您有未保存的内容，确定要取消吗？未保存的内容将丢失！')) {
        return;
      }
    }
    setShowEditor(false);
    setEditingMovie(null);
    resetForm();
  };

  const getStatusColor = (status: MovieStatus) => {
    switch (status) {
      case '已看完':
        return 'bg-green-100 text-green-800';
      case '已二刷':
        return 'bg-blue-100 text-blue-800';
      case '待二刷':
        return 'bg-purple-100 text-purple-800';
      case '进行中':
        return 'bg-orange-100 text-orange-800';
      case '待观看':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">电影管理</h1>
        <div className="space-x-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            返回
          </button>
          <button
            onClick={handleNewMovie}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            新建电影
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingMovie ? '编辑电影' : '新建电影'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="电影名称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">评分 (0-100) *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">状态 *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as MovieStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="待观看">待观看</option>
                  <option value="进行中">进行中</option>
                  <option value="已看完">已看完</option>
                  <option value="待二刷">待二刷</option>
                  <option value="已二刷">已二刷</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">评价</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="写下你的评价..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">标签</label>
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="多个标签用逗号分隔，例如：悬疑,喜剧,动作 或 悬疑，喜剧，动作"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">封面图</label>
              <div className="space-y-2">
                {coverImage && (
                  <div className="flex items-center space-x-2">
                    <div className="w-32 h-48 relative rounded overflow-hidden border border-gray-200">
                      <Image
                        src={coverImage}
                        alt="封面"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => setCoverImage('')}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                )}
                <button
                  onClick={handleAddImage}
                  disabled={uploading}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? '上传中...' : coverImage ? '更换封面' : '上传封面'}
                </button>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : movies.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无电影记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-2">
                    <h3 className="text-lg font-semibold">{movie.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(movie.status)}`}>
                      {movie.status}
                    </span>
                    <span className="text-gray-600">评分: {movie.score}/100</span>
                  </div>
                  {movie.coverImage && (
                    <div className="w-24 h-36 relative rounded overflow-hidden mb-2">
                      <Image
                        src={movie.coverImage}
                        alt={movie.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  {movie.review && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                      {movie.review}
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
                    创建时间: {new Date(movie.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="ml-4 space-x-2">
                  <button
                    onClick={() => handleEdit(movie)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(movie.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

