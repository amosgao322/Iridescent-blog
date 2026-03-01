import Link from "next/link";
import Image from "next/image";
import { Post } from "@/lib/posts";

interface FilteredArticleListProps {
  posts: Post[];
  filterType?: 'tag' | 'category' | 'series';
  filterValue?: string;
}

export default function FilteredArticleList({ 
  posts, 
  filterType, 
  filterValue 
}: FilteredArticleListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无文章</p>
      </div>
    );
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return dateStr;
      }
      const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', 
                         '七月', '八月', '九月', '十月', '十一月', '十二月'];
      const month = monthNames[date.getMonth()];
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}${day}日, ${year}`;
    } catch {
      return dateStr;
    }
  };

  // 获取标题文本
  const getTitle = () => {
    if (filterType === 'category') {
      return `分类: ${filterValue}`;
    } else if (filterType === 'tag') {
      return `标签: ${filterValue}`;
    } else if (filterType === 'series') {
      return `系列: ${filterValue}`;
    }
    return '文章列表';
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold mb-6">{getTitle()}</h1>
      <div className="space-y-6">
        {posts.map((post) => (
          <article 
            key={post.slug} 
            className="flex gap-6 pb-6 border-b border-gray-100 last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <Link href={`/post/${post.slug}`} prefetch={false}>
                <h2 className="text-xl font-bold mb-2 hover:text-blue-600 transition-colors">
                  {post.title}
                </h2>
              </Link>
              
              {/* 标签 */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs text-gray-500"
                    >
                      <span className="w-1 h-1 bg-gray-400 rounded-full flex-shrink-0"></span>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* 描述 */}
              <p className="text-gray-600 mb-3 line-clamp-2 text-sm">
                {post.excerpt || post.content.substring(0, 150).replace(/[#*\[\]()]/g, '')}
              </p>
              
              {/* 元数据 */}
              <div className="text-sm text-gray-500">
                <span>{formatDate(post.date)}</span>
                {post.category && (
                  <>
                    <span className="mx-2">·</span>
                    <span>{post.category}</span>
                  </>
                )}
                <span className="mx-2">·</span>
                <span>{post.readingTime}分钟阅读</span>
              </div>
            </div>
            
            {/* 缩略图 */}
            {post.coverImage && (
              <div className="w-32 h-32 flex-shrink-0">
                <Link href={`/post/${post.slug}`} className="block w-full h-full" prefetch={false}>
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                  />
                </Link>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

