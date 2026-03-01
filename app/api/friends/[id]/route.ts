import { NextRequest, NextResponse } from 'next/server';
import { getFriendById, updateFriend, deleteFriend } from '@/lib/friends';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const friend = getFriendById(resolvedParams.id);

    if (!friend) {
      return NextResponse.json(
        { error: '友链不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ friend });
  } catch (error) {
    console.error('Error fetching friend:', error);
    return NextResponse.json(
      { error: '获取友链失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const body = await request.json();
    const { name, url, description, avatar } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: '名称和链接不能为空' },
        { status: 400 }
      );
    }

    const success = updateFriend(resolvedParams.id, { name, url, description, avatar });
    if (!success) {
      return NextResponse.json(
        { error: '友链不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating friend:', error);
    return NextResponse.json(
      { error: '更新友链失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const success = deleteFriend(resolvedParams.id);

    if (!success) {
      return NextResponse.json(
        { error: '友链不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting friend:', error);
    return NextResponse.json(
      { error: '删除友链失败' },
      { status: 500 }
    );
  }
}

