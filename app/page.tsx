import ArticleList from "@/components/posts/ArticleList";
import { getAllPosts } from "@/lib/posts";

// 强制动态渲染，确保能读取到新上传的文章
export const dynamic = 'force-dynamic';

export default async function Home() {
  const posts = getAllPosts();

  return (
    <div className="space-y-12">
      {/* 文章部分 */}
      {posts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6">文章</h2>
          <ArticleList posts={posts.slice(0, 5)} />
          {posts.length > 5 && (
            <div className="mt-6 text-center">
              <a
                href="/posts"
                className="text-blue-600 hover:text-blue-800"
              >
                查看更多文章 →
              </a>
            </div>
          )}
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">暂无内容</p>
        </div>
      )}
    </div>
  );
}

