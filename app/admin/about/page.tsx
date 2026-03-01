'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AboutImage, ContactInfo } from '@/lib/about';

export default function AboutPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [bio, setBio] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<AboutImage[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [contact, setContact] = useState<ContactInfo>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
    fetchAboutContent();
  }, [router]);

  const fetchAboutContent = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/about');
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setAvatar(data.avatar || '');
        setBio(data.bio || '');
        setContent(data.content || '');
        setImages(data.images || []);
        setSkills(data.skills || []);
        setContact(data.contact || {});
      } else {
        alert('加载关于内容失败');
      }
    } catch (error) {
      console.error('Error loading about content:', error);
      alert('加载关于内容失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          avatar: avatar || undefined,
          bio: bio || undefined,
          content: content || '',
          images: images.length > 0 ? images : undefined,
        }),
      });

      if (res.ok) {
        alert('保存成功！');
        router.push('/about');
      } else {
        const errorData = await res.json();
        alert(errorData.error || '保存失败，请重试');
      }
    } catch (error) {
      console.error('Error saving about content:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleAddImage = () => {
    setImages([...images, { url: '', title: '', description: '' }]);
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleImageChange = (index: number, field: keyof AboutImage, value: string) => {
    const newImages = [...images];
    newImages[index] = { ...newImages[index], [field]: value };
    setImages(newImages);
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">编辑关于页面</h1>
        <div className="space-x-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">基本信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">名称</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="输入您的名称"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">头像URL</label>
              <input
                type="text"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="输入头像图片URL"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {avatar && (
                <div className="mt-2">
                  <img
                    src={avatar}
                    alt="头像预览"
                    className="w-24 h-24 rounded-full object-cover border border-gray-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">简介</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="输入简短的个人简介"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 内容编辑 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">关于内容</h2>
          <label className="block text-sm font-medium mb-2">内容（Markdown 格式）</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="输入关于页面的内容（支持 Markdown 格式）..."
            className="w-full h-[400px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="mt-2 text-sm text-gray-500">支持 Markdown 格式，保存后可在关于页面查看效果</p>
        </div>

        {/* 图片管理 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">图片画廊</h2>
            <button
              onClick={handleAddImage}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              添加图片
            </button>
          </div>
          {images.length === 0 ? (
            <p className="text-gray-500 text-sm">暂无图片，点击"添加图片"按钮添加</p>
          ) : (
            <div className="space-y-4">
              {images.map((image, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium">图片 {index + 1}</h3>
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      删除
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">图片URL *</label>
                      <input
                        type="text"
                        value={image.url}
                        onChange={(e) => handleImageChange(index, 'url', e.target.value)}
                        placeholder="输入图片URL"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">缩略图URL（可选）</label>
                      <input
                        type="text"
                        value={image.thumbnail || ''}
                        onChange={(e) => handleImageChange(index, 'thumbnail', e.target.value)}
                        placeholder="输入缩略图URL，留空则使用原图"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">标题（可选）</label>
                      <input
                        type="text"
                        value={image.title || ''}
                        onChange={(e) => handleImageChange(index, 'title', e.target.value)}
                        placeholder="输入图片标题"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">简介（可选）</label>
                      <textarea
                        value={image.description || ''}
                        onChange={(e) => handleImageChange(index, 'description', e.target.value)}
                        placeholder="输入图片简介"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                    {image.url && (
                      <div className="mt-2">
                        <img
                          src={image.thumbnail || image.url}
                          alt={image.title || `预览 ${index + 1}`}
                          className="max-w-xs max-h-48 object-contain border border-gray-300 rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
