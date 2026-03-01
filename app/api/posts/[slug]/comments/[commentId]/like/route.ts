import { NextRequest, NextResponse } from 'next/server';
import { likeComment } from '@/lib/comments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; commentId: string }> | { slug: string; commentId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const success = likeComment(resolvedParams.commentId);

    if (!success) {
      return NextResponse.json(
        { error: '评论不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error liking comment:', error);
    return NextResponse.json(
      { error: '点赞失败' },
      { status: 500 }
    );
  }
}

