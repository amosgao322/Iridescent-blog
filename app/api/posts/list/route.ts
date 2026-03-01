import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/posts';

export async function GET() {
  try {
    const posts = getAllPosts();
    
    // 只返回基本信息
    const postsList = posts.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      category: post.category,
    }));

    return NextResponse.json({ posts: postsList });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: '获取文章列表失败' },
      { status: 500 }
    );
  }
}

