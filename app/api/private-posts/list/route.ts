import { NextRequest, NextResponse } from 'next/server';
import { getAllPrivatePosts } from '@/lib/private-posts';

export async function GET(request: NextRequest) {
  try {
    const posts = getAllPrivatePosts();
    
    // 只返回基本信息，不包含完整内容
    const postsList = posts.map(post => ({
      slug: post.slug,
      title: post.title,
      date: post.date,
      excerpt: post.excerpt,
      readingTime: post.readingTime,
    }));

    return NextResponse.json({ posts: postsList });
  } catch (error) {
    console.error('Error fetching private posts:', error);
    return NextResponse.json(
      { error: '获取私密文章列表失败' },
      { status: 500 }
    );
  }
}

