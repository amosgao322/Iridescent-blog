export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 从 Markdown 图片语法中提取 URL
 * 支持格式: ![](url) 或 ![alt](url)
 */
export function extractImageUrl(markdownImage?: string): string | undefined {
  if (!markdownImage) return undefined;
  
  // 如果已经是纯 URL，直接返回
  if (markdownImage.startsWith('http://') || markdownImage.startsWith('https://')) {
    return markdownImage;
  }
  
  // 尝试从 Markdown 格式中提取 URL
  const match = markdownImage.match(/!\[.*?\]\((.*?)\)/);
  if (match && match[1]) {
    return match[1];
  }
  
  // 如果都不匹配，返回原值（可能是其他格式）
  return markdownImage;
}

/**
 * 统计文章字数（排除图片链接）
 * 移除 Markdown 图片语法和 HTML img 标签中的内容
 */
export function countWordsExcludingImages(content: string): number {
  if (!content) return 0;
  
  let text = content;
  
  // 移除 Markdown 图片语法：![alt](url) 或 ![](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  
  // 移除 HTML img 标签：<img ...> 或 <img ... />
  text = text.replace(/<img[^>]*>/gi, '');
  
  // 移除所有空白字符后统计字数
  return text.replace(/\s/g, '').length;
}

/**
 * 从标题生成 slug（文件名）
 * 支持中文标题
 */
export function generateSlugFromTitle(title: string): string {
  if (!title || title.trim().length === 0) {
    return `post-${Date.now()}`;
  }

  // 先尝试生成英文 slug
  let slug = title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '') // 保留中文、英文、数字、连字符
    .replace(/\s+/g, '-')
    .trim();

  // 如果 slug 为空或只包含中文，使用时间戳+标题
  if (!slug || slug.length === 0 || /^[\u4e00-\u9fa5]+$/.test(slug)) {
    const timestamp = Date.now();
    // 提取标题的前10个字符（去除特殊字符）
    const titlePart = title
      .replace(/[^\w\u4e00-\u9fa5]/g, '')
      .substring(0, 10);
    slug = `${timestamp}-${titlePart || 'post'}`;
  }

  // 最终检查，确保不为空
  if (!slug || slug.length === 0) {
    slug = `post-${Date.now()}`;
  }

  return slug;
}
