import ArticleList from "@/components/posts/ArticleList";
import { getAllPosts } from "@/lib/posts";

// 强制动态渲染，确保能读取到新上传的文章
export const dynamic = 'force-dynamic';

export default async function PostsPage() {
  const posts = getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">文章</h1>
      <ArticleList posts={posts} />
    </div>
  );
}

