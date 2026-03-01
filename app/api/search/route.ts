import { NextRequest, NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/posts';
import FlexSearch from 'flexsearch';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const posts = getAllPosts();

  // 创建搜索索引
  const index = new FlexSearch.Index({
    tokenize: 'forward',
  });

  // 添加文档到索引
  posts.forEach((post, id) => {
    const searchableText = `${post.title} ${post.content} ${post.tags.join(' ')} ${post.category}`;
    index.add(id, searchableText);
  });

  // 执行搜索
  const results = index.search(query, 10);

  // 返回匹配的文章
  const matchedPosts = results.map((id) => posts[id as number]).filter(Boolean);

  return NextResponse.json({ results: matchedPosts });
}

