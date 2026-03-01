import Link from "next/link";
import Image from "next/image";
import { Post } from "@/lib/posts";

interface ArticleListProps {
  posts: Post[];
}

export default function ArticleList({ posts }: ArticleListProps) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">暂无文章</p>
      </div>
    );
  }

  const featuredPost = posts[0];
  const restPosts = posts.slice(1);

  return (
    <div className="space-y-12">
      {/* 特色文章 */}
      {featuredPost && (
        <article className="border-b border-gray-200 pb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {featuredPost.coverImage && (
              <div className="md:w-2/3 w-full">
                <Link href={`/post/${featuredPost.slug}`} className="block w-full" prefetch={false}>
                  <div className="relative w-full aspect-video overflow-hidden rounded-lg">
                    <Image
                      src={featuredPost.coverImage}
                      alt={featuredPost.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 66vw"
                    />
                  </div>
                </Link>
              </div>
            )}
            <div className="md:w-1/3 flex flex-col justify-center">
              <Link href={`/post/${featuredPost.slug}`} className="block" prefetch={false}>
                <h2 className="text-2xl font-bold mb-2 hover:text-gray-700">
                  {featuredPost.title}
                </h2>
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {featuredPost.excerpt || featuredPost.content.substring(0, 150)}
                </p>
                <div className="text-sm text-gray-500">
                  <span>{featuredPost.date}</span>
                  <span className="mx-2">·</span>
                  <span>{featuredPost.category}</span>
                  <span className="mx-2">·</span>
                  <span>{featuredPost.readingTime}分钟阅读</span>
                </div>
              </Link>
            </div>
          </div>
        </article>
      )}

      {/* 文章网格 - 所有其余文章统一带封面展示 */}
      {restPosts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {restPosts.map((post) => (
            <article key={post.slug} className="border border-gray-200 overflow-hidden rounded-lg hover:shadow-lg transition-shadow">
              {post.coverImage && (
                <Link href={`/post/${post.slug}`} className="block w-full" prefetch={false}>
                  <div className="relative w-full aspect-video overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                </Link>
              )}
              <Link href={`/post/${post.slug}`} className="block p-4" prefetch={false}>
                <h3 className="font-bold text-lg mb-2 hover:text-gray-700">
                  {post.title}
                </h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {post.excerpt || post.content.substring(0, 100)}
                </p>
                <div className="text-xs text-gray-500">
                  <span>{post.date}</span>
                  <span className="mx-2">·</span>
                  <span>{post.category}</span>
                  <span className="mx-2">·</span>
                  <span>{post.readingTime}分钟阅读</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

