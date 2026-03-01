'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Note {
  id: string;
  content: string;
  images?: string[];
  videos?: string[];
  date: string;
  likes?: number;
}

export default function NotesPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
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
    fetchNotes();
  }, [router]);

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

  const handleSave = async () => {
    if (!content.trim()) {
      alert('内容不能为空');
      return;
    }

    setSaving(true);
    try {
      const url = editingNote 
        ? `/api/notes/${editingNote.id}`
        : '/api/notes';
      const method = editingNote ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim(), images, videos }),
      });

      if (res.ok) {
        alert(editingNote ? '更新成功' : '创建成功');
        setShowEditor(false);
        setEditingNote(null);
        setContent('');
        setImages([]);
        setVideos([]);
        fetchNotes();
      } else {
        alert('保存失败');
      }
    } catch (error) {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setContent(note.content);
    setImages(note.images || []);
    setVideos(note.videos || []);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条随记吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('删除成功');
        fetchNotes();
      } else {
        alert('删除失败');
      }
    } catch (error) {
      alert('删除失败');
    }
  };

  const handleUploadFile = async (file: File, type: 'image' | 'video') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (type === 'image') {
          setImages([...images, data.url]);
        } else {
          setVideos([...videos, data.url]);
        }
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
        handleUploadFile(file, 'image');
      }
    };
    input.click();
  };

  const handleAddVideo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleUploadFile(file, 'video');
      }
    };
    input.click();
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = (index: number) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  // 检查是否有未保存的内容
  const hasUnsavedContent = () => {
    return content.trim().length > 0 || images.length > 0 || videos.length > 0;
  };

  // 处理新建按钮点击
  const handleNewNote = () => {
    if (showEditor && hasUnsavedContent()) {
      if (!confirm('您有未保存的内容，确定要清空并新建吗？未保存的内容将丢失！')) {
        return;
      }
    }
    setShowEditor(true);
    setEditingNote(null);
    setContent('');
    setImages([]);
    setVideos([]);
  };

  // 处理取消按钮点击
  const handleCancel = () => {
    if (hasUnsavedContent()) {
      if (!confirm('您有未保存的内容，确定要取消吗？未保存的内容将丢失！')) {
        return;
      }
    }
    setShowEditor(false);
    setEditingNote(null);
    setContent('');
    setImages([]);
    setVideos([]);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">随记管理</h1>
        <div className="space-x-4">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            返回
          </button>
          <button
            onClick={handleNewNote}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            新建随记
          </button>
        </div>
      </div>

      {showEditor && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            {editingNote ? '编辑随记' : '新建随记'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">内容</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="记录你的想法..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">图片</label>
              <div className="space-y-2">
                {images.map((image, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-20 h-20 relative rounded overflow-hidden">
                      <Image
                        src={image}
                        alt={`图片 ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddImage}
                  disabled={uploading}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? '上传中...' : '上传图片'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">视频</label>
              <div className="space-y-2">
                {videos.map((video, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <video
                      src={video}
                      controls
                      className="w-40 h-24 rounded"
                    />
                    <button
                      onClick={() => handleRemoveVideo(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddVideo}
                  disabled={uploading}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  {uploading ? '上传中...' : '上传视频'}
                </button>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleSave}
                disabled={saving || !content.trim()}
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
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无随记</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-sm text-gray-500 mb-2">{note.date}</div>
                  <p className="whitespace-pre-wrap mb-4">{note.content}</p>
                  {note.images && note.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {note.images.map((image, index) => (
                        <div key={index} className="relative aspect-square rounded overflow-hidden">
                          <Image
                            src={image}
                            alt={`图片 ${index + 1}`}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {note.videos && note.videos.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {note.videos.map((video, index) => (
                        <div key={index} className="w-full max-w-md">
                          <video
                            src={video}
                            controls
                            preload="metadata"
                            playsInline
                            className="w-full rounded bg-black"
                            style={{ minHeight: '200px' }}
                          >
                            您的浏览器不支持视频播放
                          </video>
                        </div>
                      ))}
                    </div>
                  )}
                  {note.likes !== undefined && (
                    <div className="text-sm text-gray-500">👍 {note.likes}</div>
                  )}
                </div>
                <div className="ml-4 space-x-2">
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
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

