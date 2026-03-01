'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface COSFile {
  Key: string;
  Size: number;
  LastModified: string;
  url: string;
}

// 复制文本到剪贴板的辅助函数
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 尝试使用 Clipboard API（需要 HTTPS 或 localhost）
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // 降级方案：使用传统方法
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        const success = document.execCommand('copy');
        textArea.remove();
        return success;
      } catch (err) {
        textArea.remove();
        return false;
      }
    }
  } catch (err) {
    // 如果 Clipboard API 失败，使用降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    } catch (e) {
      textArea.remove();
      return false;
    }
  }
}

export default function UploadPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'markdown' | 'image'>('image');
  const [file, setFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [imageList, setImageList] = useState<COSFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [showImageList, setShowImageList] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const router = useRouter();

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage('');
    }, 2000);
  };

  const fetchImageList = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch('/api/cos/list');
      if (res.ok) {
        const data = await res.json();
        const files = data.files || [];
        // 按日期降序排序（日期近的在前面）
        const sortedFiles = files.sort((a: COSFile, b: COSFile) => {
          const dateA = new Date(a.LastModified).getTime();
          const dateB = new Date(b.LastModified).getTime();
          return dateB - dateA;
        });
        setImageList(sortedFiles);
        setShowImageList(true);
      } else {
        showToast('获取图片列表失败');
      }
    } catch (error) {
      showToast('获取图片列表失败');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    const auth = sessionStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  // 当上传类型切换为图片时，自动加载列表
  useEffect(() => {
    if (isAuthenticated && uploadType === 'image' && !showImageList) {
      fetchImageList();
    }
  }, [uploadType, isAuthenticated, showImageList, fetchImageList]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadedUrl('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('请选择文件');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', uploadType);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setUploadedUrl(data.url);
        alert('上传成功！');
        // 如果是图片，刷新图片列表
        if (uploadType === 'image') {
          fetchImageList();
        } else if (uploadType === 'markdown') {
          // Markdown 文件上传后，可以选择跳转到编辑器
          router.push('/admin/editor');
        }
      } else {
        alert(data.error || '上传失败');
      }
    } catch (error) {
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">文件上传</h1>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          返回
        </button>
      </div>

      <div className="bg-white p-6 border border-gray-200 rounded-lg space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">上传类型</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="image"
                checked={uploadType === 'image'}
                onChange={(e) => setUploadType(e.target.value as 'image')}
                className="mr-2"
              />
              图片（上传到 COS）
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="markdown"
                checked={uploadType === 'markdown'}
                onChange={(e) => setUploadType(e.target.value as 'markdown')}
                className="mr-2"
              />
              Markdown 文件（上传到服务器）
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">选择文件</label>
          <input
            type="file"
            accept={uploadType === 'image' ? 'image/*' : '.md'}
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {file && (
          <div>
            <p className="text-sm text-gray-600 mb-2">
              文件名: {file.name}
            </p>
            <p className="text-sm text-gray-600">
              文件大小: {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
        )}

        {uploadedUrl && (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-sm font-medium mb-2">上传成功！</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={uploadedUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white"
              />
              <button
                onClick={async () => {
                  const markdownSyntax = `![](${uploadedUrl})`;
                  const success = await copyToClipboard(markdownSyntax);
                  if (success) {
                    showToast('已复制到剪贴板');
                  } else {
                    prompt('请手动复制以下内容：', markdownSyntax);
                  }
                }}
                className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                复制 Markdown
              </button>
            </div>
            {uploadType === 'image' && (
              <div className="mt-4">
                <img
                  src={uploadedUrl}
                  alt="预览"
                  className="max-w-full h-auto rounded-md"
                />
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? '上传中...' : '上传文件'}
        </button>
      </div>

      {/* 图片列表 */}
      {uploadType === 'image' && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">已上传的图片</h2>
            <button
              onClick={() => {
                if (showImageList) {
                  setShowImageList(false);
                } else {
                  fetchImageList();
                }
              }}
              disabled={loadingList}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              {loadingList ? '加载中...' : showImageList ? '隐藏列表' : '刷新列表'}
            </button>
          </div>

          {showImageList && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {imageList.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  暂无图片
                </div>
              ) : (
                imageList.map((image) => (
                  <div
                    key={image.Key}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="aspect-square relative bg-gray-100">
                      <Image
                        src={image.url}
                        alt={image.Key}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate mb-1" title={image.Key}>
                        {image.Key.split('/').pop()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(image.Size / 1024).toFixed(2)} KB
                      </p>
                      <button
                        onClick={async () => {
                          const markdownSyntax = `![](${image.url})`;
                          const success = await copyToClipboard(markdownSyntax);
                          if (success) {
                            showToast('已复制到剪贴板');
                          } else {
                            prompt('请手动复制以下内容：', markdownSyntax);
                          }
                        }}
                        className="mt-2 w-full px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                      >
                        链接
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded-md shadow-lg z-50 animate-fade-in">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

