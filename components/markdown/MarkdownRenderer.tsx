'use client';

import { useEffect, useState, useRef } from 'react';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkHtml from 'remark-html';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!content) {
      setHtmlContent('');
      return;
    }

    // 处理段落开头的 tab 字符，转换为两个空格
    const processedContent = content.split('\n').map((line) => {
      // 如果行以 tab 开头，替换为两个空格
      if (line.startsWith('\t')) {
        return line.replace(/^\t+/, (match) => '  '.repeat(match.length));
      }
      return line;
    }).join('\n');

    remark()
      .use(remarkGfm)
      .use(remarkHtml, { allowDangerousHtml: false })
      .process(processedContent)
      .then((result) => {
        setHtmlContent(result.toString());
        setError(null);
      })
      .catch((err) => {
        console.error('Markdown rendering error:', err);
        setError('渲染失败');
        setHtmlContent(content); // 失败时显示原始内容
      });
  }, [content]);

  // 为标题添加ID（与TableOfContents保持一致）并为图片添加点击事件，同时处理段落缩进
  useEffect(() => {
    if (!containerRef.current || !htmlContent) return;

    const generateId = (text: string): string => {
      return text
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim() || `heading-${Math.random().toString(36).substr(2, 9)}`;
    };

    const headings = containerRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6') as NodeListOf<HTMLElement>;
    headings.forEach((heading) => {
      const text = heading.textContent || '';
      const id = generateId(text);
      
      // 设置标题ID和滚动边距
      heading.id = id;
      // 确保标题可滚动到
      heading.style.scrollMarginTop = '120px';
    });

    // 处理段落缩进：检查原始内容中段落开头是否有两个空格，如果有则添加缩进样式
    const paragraphs = containerRef.current.querySelectorAll('p') as NodeListOf<HTMLElement>;
    const contentLines = content.split('\n');
    
    // 创建一个映射，记录哪些行需要缩进（以两个空格开头但不是三个或更多）
    const indentLines = new Set<number>();
    contentLines.forEach((line, index) => {
      // 如果行以两个空格开头，但不是三个或更多空格，且不是空行，且不是代码块或列表
      if (line.startsWith('  ') && !line.startsWith('   ') && line.trim() && 
          !line.trim().startsWith('#') && 
          !line.trim().startsWith('-') && 
          !line.trim().startsWith('*') && 
          !line.trim().startsWith('+') &&
          !line.trim().match(/^\d+\./) &&
          !line.trim().startsWith('```')) {
        indentLines.add(index);
      }
    });
    
    // 为需要缩进的段落添加样式
    // 通过匹配段落文本内容与原始内容行来找到对应的段落
    let processedParagraphs = 0;
    paragraphs.forEach((paragraph) => {
      if (processedParagraphs >= indentLines.size) return;
      
      const paragraphText = paragraph.textContent?.trim() || '';
      if (!paragraphText) return;
      
      // 在原始内容中查找包含这段文本的行
      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i].trim();
        // 如果原始行以两个空格开头，且包含段落的前几个字符，则添加缩进
        if (indentLines.has(i) && line && paragraphText.startsWith(line.substring(0, Math.min(10, line.length)))) {
          paragraph.style.textIndent = '2em';
          processedParagraphs++;
          break;
        }
      }
    });

    // 使用事件委托处理图片点击（更可靠，避免重复绑定问题）
    const container = containerRef.current;
    
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        const img = target as HTMLImageElement;
        setSelectedImage(img.src);
        
        // 追踪图片点击事件（Analytics V2）
        const sessionId = sessionStorage.getItem('analytics_v2_session_id');
        const pageViewId = sessionStorage.getItem('analytics_v2_pageview_id');
        if (sessionId) {
          const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // 获取图片位置信息
          const rect = img.getBoundingClientRect();
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
          
          fetch('/api/analytics-v2/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              eventId: generateId(),
              sessionId: sessionId,
              pageViewId: pageViewId || undefined,
              eventType: 'image_click',
              eventData: {
                imageUrl: img.src,
                imageAlt: img.alt || '',
                position: {
                  x: rect.left + scrollLeft,
                  y: rect.top + scrollTop,
                  width: rect.width,
                  height: rect.height,
                },
                pagePath: window.location.pathname,
              },
              timestamp: Date.now(),
            }),
          }).catch(error => {
            console.error('[AnalyticsV2] Failed to record image click:', error);
          });
        }
      }
    };
    
    const handleImageMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        (target as HTMLImageElement).style.opacity = '0.8';
      }
    };
    
    const handleImageMouseLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG') {
        (target as HTMLImageElement).style.opacity = '1';
      }
    };
    
    // 为所有图片添加样式
    const images = container.querySelectorAll('img') as NodeListOf<HTMLImageElement>;
    images.forEach((img) => {
      img.style.cursor = 'pointer';
      img.style.transition = 'opacity 0.2s';
    });
    
    // 使用事件委托，在容器上监听点击事件
    container.addEventListener('click', handleImageClick);
    container.addEventListener('mouseenter', handleImageMouseEnter, true); // 使用捕获阶段
    container.addEventListener('mouseleave', handleImageMouseLeave, true); // 使用捕获阶段
    
    // 清理函数
    return () => {
      container.removeEventListener('click', handleImageClick);
      container.removeEventListener('mouseenter', handleImageMouseEnter, true);
      container.removeEventListener('mouseleave', handleImageMouseLeave, true);
    };
  }, [htmlContent]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
        <pre className="mt-2 text-sm whitespace-pre-wrap">{content}</pre>
      </div>
    );
  }

  if (!htmlContent && content) {
    return <div className="text-gray-500">加载中...</div>;
  }

  if (!htmlContent) {
    return null;
  }

  return (
    <>
      <div
        ref={containerRef}
        className="markdown-content prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
      {/* 图片放大模态框 */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
          onKeyDown={(e) => {
            // 按 ESC 键关闭
            if (e.key === 'Escape') {
              setSelectedImage(null);
            }
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(null);
            }}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 transition-colors"
            aria-label="关闭"
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <img
            src={selectedImage}
            alt="放大查看"
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={(e) => {
              // 关键修复：点击图片本身也关闭（用户要求）
              e.stopPropagation();
              setSelectedImage(null);
            }}
            onLoad={(e) => {
              // 确保图片加载后可以正常显示
              (e.target as HTMLImageElement).style.display = 'block';
            }}
          />
        </div>
      )}
    </>
  );
}

