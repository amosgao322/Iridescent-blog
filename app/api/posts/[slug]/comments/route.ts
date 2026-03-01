import { NextRequest, NextResponse } from 'next/server';
import { getCommentsByPostSlug, createComment } from '@/lib/comments';

// 邮箱格式验证正则表达式
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 获取指定文章的所有评论
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const comments = getCommentsByPostSlug(resolvedParams.slug);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: '获取评论失败' },
      { status: 500 }
    );
  }
}

// 创建新评论
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { nickname, email, content } = body;

    // 验证必填字段
    if (!nickname || nickname.trim() === '') {
      return NextResponse.json(
        { error: '昵称不能为空' },
        { status: 400 }
      );
    }

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '评论内容不能为空' },
        { status: 400 }
      );
    }

    // 验证字段长度
    if (nickname.trim().length > 50) {
      return NextResponse.json(
        { error: '昵称长度不能超过50个字符' },
        { status: 400 }
      );
    }

    if (content.trim().length > 1000) {
      return NextResponse.json(
        { error: '评论内容长度不能超过1000个字符' },
        { status: 400 }
      );
    }

    // 如果提供了邮箱，验证邮箱格式
    const emailValue = email ? email.trim() : '';
    if (emailValue && !emailRegex.test(emailValue)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    const id = createComment(
      resolvedParams.slug,
      nickname.trim(),
      emailValue,
      content.trim()
    );

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: '创建评论失败' },
      { status: 500 }
    );
  }
}

