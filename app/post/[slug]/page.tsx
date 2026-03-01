import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '@/lib/posts';
import MarkdownRenderer from '@/components/markdown/MarkdownRenderer';
import TableOfContents from '@/components/markdown/TableOfContents';
import MobileTOCModal from '@/components/markdown/MobileTOCModal';
import Comments from '@/components/posts/Comments';
import CoverImage from '@/components/posts/CoverImage';
import ScrollToTop from '@/components/posts/ScrollToTop';

// 强制动态渲染，确保新上传的文章能立即访问
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({
    // Next.js 会自动处理 URL 编码，直接使用 slug 即可
    slug: post.slug,
  }));
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  // Next.js 16 中 params 可能是 Promise
  const resolvedParams = await Promise.resolve(params);
  const post = getPostBySlug(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="relative w-full">
      {/* 移动端大纲按钮和模态框 */}
      <MobileTOCModal content={post.content} />
      
      {/* PC端固定目录 - 独立模块，固定在屏幕左侧垂直居中 */}
      <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-10 max-h-[80vh] overflow-y-auto">
        <TableOfContents content={post.content} />
      </div>
      
      {/* 文章内容区域 */}
      <div className="max-w-full lg:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <article className="w-full">
            {post.coverImage && (
              <CoverImage
                src={post.coverImage}
                alt={post.title}
                caption={post.coverImageCaption}
              />
            )}
            
            <header className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">{post.title}</h1>
              <div className="text-gray-600 space-y-3">
                {/* 移动端优化：元信息分行显示 */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-sm space-y-1 sm:space-y-0">
                  <span>{post.date}</span>
                  <span className="hidden sm:inline">·</span>
                  <span>{post.category}</span>
                  <span className="hidden sm:inline">·</span>
                  <span>大约{post.readingTime}分钟阅读</span>
                  {post.wordCount && (
                    <>
                      <span className="hidden sm:inline">·</span>
                      <span className="sm:inline">
                        ({post.wordCount}个字
                        {post.imageCount && <>, {post.imageCount}张图片</>})
                      </span>
                    </>
                  )}
                </div>
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </header>

            <div className="prose prose-lg max-w-none">
              <MarkdownRenderer content={post.content} />
            </div>
          </article>

        {/* 评论区域 */}
        <Comments postSlug={post.slug} />
      </div>

      {/* 回到顶部按钮 */}
      <ScrollToTop />
    </div>
  );
}

