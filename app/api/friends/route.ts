import { NextRequest, NextResponse } from 'next/server';
import { getAllFriends, createFriend } from '@/lib/friends';

export async function GET() {
  try {
    const friends = getAllFriends();
    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: '获取友链失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, url, description, avatar } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: '名称和链接不能为空' },
        { status: 400 }
      );
    }

    const id = createFriend({ name, url, description, avatar });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating friend:', error);
    return NextResponse.json(
      { error: '创建友链失败' },
      { status: 500 }
    );
  }
}

