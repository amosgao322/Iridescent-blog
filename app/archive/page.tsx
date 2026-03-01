import { getAllPosts, getPostsByTag, getPostsByCategory, getPostsBySeries } from '@/lib/posts';
import { getAllNotes } from '@/lib/notes';
import { getAllMovies } from '@/lib/movies';
import Link from 'next/link';
import FilteredArticleList from '@/components/posts/FilteredArticleList';

// 强制动态渲染，确保能读取到新上传的文章
export const dynamic = 'force-dynamic';

interface ArchivePageProps {
  searchParams: Promise<{ tag?: string; category?: string; series?: string }> | { tag?: string; category?: string; series?: string };
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  // 处理 searchParams（可能是 Promise 或对象）
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  
  const allPosts = getAllPosts();
  
  // 根据查询参数过滤文章
  let filteredPosts: typeof allPosts = [];
  let filterType: 'tag' | 'category' | 'series' | undefined;
  let filterValue: string | undefined;
  
  if (params.tag) {
    filteredPosts = getPostsByTag(decodeURIComponent(params.tag));
    filterType = 'tag';
    filterValue = decodeURIComponent(params.tag);
  } else if (params.category) {
    filteredPosts = getPostsByCategory(decodeURIComponent(params.category));
    filterType = 'category';
    filterValue = decodeURIComponent(params.category);
  } else if (params.series) {
    filteredPosts = getPostsBySeries(decodeURIComponent(params.series));
    filterType = 'series';
    filterValue = decodeURIComponent(params.series);
  }
  
  // 如果有过滤条件，显示过滤后的文章列表
  if (filterType && filterValue) {
    return (
      <div className="max-w-4xl mx-auto">
        <FilteredArticleList 
          posts={filteredPosts} 
          filterType={filterType}
          filterValue={filterValue}
        />
      </div>
    );
  }
  
  const posts = allPosts;
  const notes = getAllNotes();
  const movies = getAllMovies();
  
  // 按年份分组文章
  const postsByYear = posts.reduce((acc, post) => {
    const year = post.date.substring(0, 4);
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(post);
    return acc;
  }, {} as Record<string, typeof posts>);

  // 按年份分组随记
  const notesByYear = notes.reduce((acc, note) => {
    const year = note.date.substring(0, 4);
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(note);
    return acc;
  }, {} as Record<string, typeof notes>);

  // 按年份分组电影
  const moviesByYear = movies.reduce((acc, movie) => {
    const year = new Date(movie.createdAt).getFullYear().toString();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(movie);
    return acc;
  }, {} as Record<string, typeof movies>);

  // 计算分类统计
  const categoryStats = posts.reduce((acc, post) => {
    const category = post.category || '未分类';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 计算系列统计
  const seriesStats = posts.reduce((acc, post) => {
    if (post.series) {
      acc[post.series] = (acc[post.series] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // 计算标签统计
  const tagStats = posts.reduce((acc, post) => {
    (post.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // 按年份统计文章数量
  const yearStats = Object.keys(postsByYear).reduce((acc, year) => {
    acc[year] = postsByYear[year].length;
    return acc;
  }, {} as Record<string, number>);

  // 按年份统计随记数量
  const noteYearStats = Object.keys(notesByYear).reduce((acc, year) => {
    acc[year] = notesByYear[year].length;
    return acc;
  }, {} as Record<string, number>);

  // 按年份统计电影数量
  const movieYearStats = Object.keys(moviesByYear).reduce((acc, year) => {
    acc[year] = moviesByYear[year].length;
    return acc;
  }, {} as Record<string, number>);

  // 合并所有年份
  const allYears = new Set([...Object.keys(postsByYear), ...Object.keys(notesByYear), ...Object.keys(moviesByYear)]);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">归档</h1>
      
      <div className="space-y-8">
        {/* 统计卡片区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 分类卡片 */}
          <section id="categories" className="scroll-mt-20 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 pb-3 border-b border-gray-200">分类</h2>
            <div className="space-y-2">
              {Object.entries(categoryStats)
                .sort((a, b) => b[1] - a[1])
                .map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                    <Link 
                      href={`/archive?category=${encodeURIComponent(category)}`}
                      className="text-gray-700 hover:text-blue-600 transition-colors flex-1"
                    >
                      {category}
                    </Link>
                    <span className="text-gray-500 text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{count}</span>
                  </div>
                ))}
            </div>
          </section>

          {/* 文章年份卡片 */}
          <section id="articles-year" className="scroll-mt-20 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 pb-3 border-b border-gray-200">文章</h2>
            <div className="space-y-2">
              {Object.keys(yearStats)
                .sort((a, b) => {
                  const aNum = Number(a);
                  const bNum = Number(b);
                  if (isNaN(aNum) && isNaN(bNum)) return 0;
                  if (isNaN(aNum)) return 1;
                  if (isNaN(bNum)) return -1;
                  return bNum - aNum;
                })
                .map((year) => (
                  <div key={year} className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                    <Link 
                      href={`#year-${year}`}
                      className="text-gray-700 hover:text-blue-600 transition-colors flex-1"
                    >
                      {year}
                    </Link>
                    <span className="text-gray-500 text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{yearStats[year]}</span>
                  </div>
                ))}
            </div>
          </section>

          {/* 光影年份卡片 */}
          <section id="movies-year" className="scroll-mt-20 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 pb-3 border-b border-gray-200">光影</h2>
            <div className="space-y-2">
              {Object.keys(movieYearStats)
                .sort((a, b) => {
                  const aNum = Number(a);
                  const bNum = Number(b);
                  if (isNaN(aNum) && isNaN(bNum)) return 0;
                  if (isNaN(aNum)) return 1;
                  if (isNaN(bNum)) return -1;
                  return bNum - aNum;
                })
                .map((year) => (
                  <div key={year} className="flex items-center justify-between py-2 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                    <Link 
                      href={`#movies-year-${year}`}
                      className="text-gray-700 hover:text-blue-600 transition-colors flex-1"
                    >
                      {year}
                    </Link>
                    <span className="text-gray-500 text-sm font-medium bg-gray-100 px-2 py-0.5 rounded">{movieYearStats[year]}</span>
                  </div>
                ))}
            </div>
          </section>

          {/* 标签卡片 */}
          {Object.keys(tagStats).length > 0 && (
            <section id="tags" className="scroll-mt-20 bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-800 pb-3 border-b border-gray-200">标签</h2>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tagStats)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tag, count]) => (
                    <Link
                      key={tag}
                      href={`/archive?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-md transition-colors border border-gray-200 hover:border-blue-300"
                    >
                      <span className="w-1.5 h-1.5 bg-gray-400 transform rotate-45 inline-block"></span>
                      {tag}
                      <span className="text-xs text-gray-500 ml-0.5">({count})</span>
                    </Link>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* 文章列表部分 */}
        <section id="articles" className="scroll-mt-20 bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-800 pb-3 border-b border-gray-200">文章列表</h2>
          <div className="space-y-8">
            {Object.keys(postsByYear)
              .sort((a, b) => {
                const aNum = Number(a);
                const bNum = Number(b);
                if (isNaN(aNum) && isNaN(bNum)) return 0;
                if (isNaN(aNum)) return 1;
                if (isNaN(bNum)) return -1;
                return bNum - aNum;
              })
              .map((year) => (
                <div key={year} id={`year-${year}`} className="scroll-mt-20">
                  <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500"></span>
                    {year}
                  </h3>
                  <div className="space-y-4 pl-3 border-l-2 border-gray-100">
                    {postsByYear[year].map((post) => (
                      <article key={post.slug} className="pb-4 last:pb-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                        <Link href={`/post/${post.slug}`} prefetch={false}>
                          <h4 className="font-semibold text-lg mb-2 hover:text-blue-600 transition-colors">
                            {post.title}
                          </h4>
                        </Link>
                        <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
                          <span>{post.date}</span>
                          {post.category && (
                            <>
                              <span className="text-gray-300">·</span>
                              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{post.category}</span>
                            </>
                          )}
                          {post.tags && post.tags.length > 0 && (
                            <>
                              <span className="text-gray-300">·</span>
                              <div className="flex flex-wrap gap-1">
                                {post.tags.map((tag, idx) => (
                                  <span key={idx} className="text-xs text-gray-500">
                                    {tag}{idx < post.tags.length - 1 && ','}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* 光影列表部分 */}
        {movies.length > 0 && (
          <section id="movies" className="scroll-mt-20 bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800 pb-3 border-b border-gray-200">光影列表</h2>
            <div className="space-y-8">
              {Object.keys(moviesByYear)
                .sort((a, b) => {
                  const aNum = Number(a);
                  const bNum = Number(b);
                  if (isNaN(aNum) && isNaN(bNum)) return 0;
                  if (isNaN(aNum)) return 1;
                  if (isNaN(bNum)) return -1;
                  return bNum - aNum;
                })
                .map((year) => (
                  <div key={year} id={`movies-year-${year}`} className="scroll-mt-20">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                      <span className="w-1 h-6 bg-purple-500"></span>
                      {year}
                    </h3>
                    <div className="space-y-4 pl-3 border-l-2 border-gray-100">
                      {moviesByYear[year].map((movie) => (
                        <article key={movie.id} className="pb-4 last:pb-0 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
                          <Link href="/movies" prefetch={false}>
                            <h4 className="font-semibold text-lg mb-2 hover:text-blue-600 transition-colors">
                              {movie.name}
                            </h4>
                          </Link>
                          <div className="text-sm text-gray-500 flex flex-wrap items-center gap-2">
                            <span>{new Date(movie.createdAt).toLocaleDateString('zh-CN')}</span>
                            <span className="text-gray-300">·</span>
                            <span>评分: {movie.score}/100</span>
                            <span className="text-gray-300">·</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              movie.status === '已看完' ? 'bg-green-100 text-green-800' :
                              movie.status === '已二刷' ? 'bg-blue-100 text-blue-800' :
                              movie.status === '待二刷' ? 'bg-purple-100 text-purple-800' :
                              movie.status === '进行中' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {movie.status}
                            </span>
                            {movie.tag && (
                              <>
                                <span className="text-gray-300">·</span>
                                <div className="flex flex-wrap gap-1">
                                  {movie.tag.split(/[,，]/).filter(t => t.trim()).map((tag, idx) => (
                                    <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      {tag.trim()}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

