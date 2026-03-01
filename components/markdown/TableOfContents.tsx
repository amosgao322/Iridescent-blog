'use client';

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

// 生成ID的工具函数（与MarkdownRenderer保持一致）
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || `heading-${Math.random().toString(36).substr(2, 9)}`;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // 提取markdown标题
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TocItem[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = generateHeadingId(text);
      items.push({ id, text, level });
    }

    setToc(items);
  }, [content]);

  useEffect(() => {
    if (toc.length === 0) return;

    // 监听滚动，高亮当前标题
    const handleScroll = () => {
      const headings = document.querySelectorAll('.markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4, .markdown-content h5, .markdown-content h6');
      let current = '';

      // 从下往上查找，找到第一个在视口上方或接近视口顶部的标题
      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i] as HTMLElement;
        if (!heading.id) continue;
        
        const rect = heading.getBoundingClientRect();
        // 当标题到达距离顶部120px的位置时，认为它是当前激活的标题
        if (rect.top <= 150) {
          current = heading.id;
          break;
        }
      }

      // 如果没有找到，检查第一个标题是否在视口中
      if (!current && headings.length > 0) {
        const firstHeading = headings[0] as HTMLElement;
        if (firstHeading.id) {
          const rect = firstHeading.getBoundingClientRect();
          if (rect.top > 0 && rect.top < window.innerHeight) {
            current = firstHeading.id;
          }
        }
      }

      // 更新activeId，即使current为空也要更新（清除高亮）
      setActiveId(current || '');
    };

    // 等待DOM更新后再监听
    const timer = setTimeout(() => {
      handleScroll();
      window.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll, { passive: true });
    }, 500);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [toc]);

  if (toc.length === 0) {
    return null;
  }

  const handleClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 查找元素并跳转
    const findAndScroll = () => {
      // 先在markdown-content容器内查找
      const container = document.querySelector('.markdown-content');
      let element: HTMLElement | null = null;
      
      if (container) {
        element = container.querySelector(`#${CSS.escape(id)}`) as HTMLElement;
      }
      
      // 如果找不到，在整个文档中查找
      if (!element) {
        element = document.getElementById(id);
      }
      
      if (element) {
        const offset = 120;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;

        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth',
        });
        
        // 更新activeId以便立即高亮
        setActiveId(id);
      } else {
        console.warn('找不到标题元素:', id);
      }
    };

    // 立即尝试，如果找不到则延迟重试
    findAndScroll();
    setTimeout(findAndScroll, 100);
    setTimeout(findAndScroll, 300);
  };

  return (
    <div className="w-full lg:w-48">
      <nav className="space-y-0.5">
        {toc.map((item) => {
          const isActive = activeId === item.id;
          const paddingLeft = item.level === 1 ? 0 : item.level === 2 ? 16 : item.level === 3 ? 32 : 48;
          
          return (
            <div
              key={item.id}
              className="relative group"
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(item.id, e)}
                className={`block py-2 px-3 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-red-50 border-l-2 border-red-500'
                    : 'hover:bg-gray-50'
                }`}
                style={{ paddingLeft: `${paddingLeft}px` }}
                title={item.text} // 完整标题作为tooltip
              >
                <span className={`block overflow-hidden text-ellipsis whitespace-nowrap transition-all ${
                  isActive 
                    ? 'text-sm font-bold text-gray-900' 
                    : 'text-xs text-gray-400 opacity-60'
                }`}>
                  {item.text}
                </span>
              </a>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

