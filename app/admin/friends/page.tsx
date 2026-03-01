'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Friend {
  id: string;
  name: string;
  url: string;
  description?: string;
  avatar?: string;
}

export default function FriendsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFriend, setEditingFriend] = useState<Friend | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    avatar: '',
  });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
    fetchFriends();
  }, [router]);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      alert('名称和链接不能为空');
      return;
    }

    setSaving(true);
    try {
      const url = editingFriend 
        ? `/api/friends/${editingFriend.id}`
        : '/api/friends';
      const method = editingFriend ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          url: formData.url.trim(),
          description: formData.description.trim() || undefined,
          avatar: formData.avatar.trim() || undefined,
        }),
      });

      if (res.ok) {
        alert(editingFriend ? '更新成功' : '创建成功');
        setShowEditor(false);
        setEditingFriend(null);
        setFormData({ name: '', url: '', description: '', avatar: '' });
        fetchFriends();
      } else {
        alert('保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (friend: Friend) => {
    setEditingFriend(friend);
    setFormData({
      name: friend.name,
      url: friend.url,
      description: friend.description || '',
      avatar: friend.avatar || '',
    });
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个友链吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/friends/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('删除成功');
        fetchFriends();
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
        <h1 className="text-2xl font-bold">友链管理</h1>
        <div className="space-x-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            返回
          </button>
          <button
            onClick={() => {
              setShowEditor(true);
              setEditingFriend(null);
              setFormData({ name: '', url: '', description: '', avatar: '' });
            }}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            新建友链
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingFriend ? '编辑友链' : '新建友链'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">名称 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="博客名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">链接 *</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="简短描述"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">头像URL</label>
              <input
                type="url"
                value={formData.avatar}
                onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="https://..."
              />
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim() || !formData.url.trim()}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={() => {
                  setShowEditor(false);
                  setEditingFriend(null);
                  setFormData({ name: '', url: '', description: '', avatar: '' });
                }}
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
      ) : friends.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无友链</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  头像
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  链接
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  描述
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {friends.map((friend) => (
                <tr key={friend.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    {friend.avatar ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <Image
                          src={friend.avatar}
                          alt={friend.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">{friend.name[0]}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium">{friend.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <a
                      href={friend.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {friend.url}
                    </a>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {friend.description || '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm space-x-3">
                    <button
                      onClick={() => handleEdit(friend)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(friend.id)}
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

