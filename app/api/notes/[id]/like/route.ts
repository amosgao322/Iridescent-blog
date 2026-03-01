import { NextRequest, NextResponse } from 'next/server';
import { likeNote } from '@/lib/notes';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const success = likeNote(resolvedParams.id);

    if (!success) {
      return NextResponse.json(
        { error: '随记不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error liking note:', error);
    return NextResponse.json(
      { error: '点赞失败' },
      { status: 500 }
    );
  }
}

