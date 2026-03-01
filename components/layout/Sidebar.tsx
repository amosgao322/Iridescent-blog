import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { getAllNotes } from "@/lib/notes";
import { getAllMovies } from "@/lib/movies";

export default function Sidebar() {
  const posts = getAllPosts();
  const notes = getAllNotes();
  const movies = getAllMovies();
  
  // 计算统计数据
  const articleCount = posts.length;
  const noteCount = notes.length;
  const movieCount = movies.length;
  
  // 获取所有分类
  const categories = new Set(posts.map(post => post.category));
  const categoryCount = categories.size;
  
  // 获取所有标签
  const allTags = posts.flatMap(post => post.tags || []);
  const tags = new Set(allTags);
  const tagCount = tags.size;
  
  return (
    <aside className="space-y-8">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
            <img
              src="https://ghy-1308445199.cos.ap-guangzhou.myqcloud.com/iridescent-blog/1768225360330-maavyg.jpg"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="font-bold text-lg">高槐玉</h3>
            <p className="text-sm text-gray-600">博观而约取，厚积而薄发。</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <Link 
            href="/archive#articles" 
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            {articleCount} 文章
          </Link>
          <span className="mx-1">/</span>
          <Link 
            href="/archive#notes" 
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            {noteCount} 随记
          </Link>
          <span className="mx-1">/</span>
          <Link 
            href="/archive#movies" 
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            {movieCount} 光影
          </Link>
          <span className="mx-1">/</span>
          <Link 
            href="/archive#categories" 
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            {categoryCount} 分类
          </Link>
          <span className="mx-1">/</span>
          <Link 
            href="/archive#tags" 
            className="hover:text-blue-600 hover:underline transition-colors"
          >
            {tagCount} 标签
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          <Link href="/about" className="text-sm text-blue-600 hover:underline" prefetch={false}>
            关于本站
          </Link>
          {/* 暂时注释掉新特性链接 - 接口返回 404 */}
          {/* <span className="mx-2">·</span>
          <Link href="/features" className="text-sm text-blue-600 hover:underline">
            新特性
          </Link> */}
        </div>
      </div>
    </aside>
  );
}

