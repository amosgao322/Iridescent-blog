import { NextRequest, NextResponse } from 'next/server';
import { getAboutContent, updateAboutContent } from '@/lib/about';

// 获取关于内容
export async function GET() {
  try {
    const aboutContent = getAboutContent();
    return NextResponse.json(aboutContent);
  } catch (error) {
    console.error('Error fetching about content:', error);
    return NextResponse.json(
      { error: '获取关于内容失败' },
      { status: 500 }
    );
  }
}

// 更新关于内容
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 支持两种格式：
    // 1. 仅更新内容：{ content: "..." }
    // 2. 更新完整对象：{ content, avatar, name, bio, images, ... }
    const { content, ...otherFields } = body;

    // 如果只传了 content，保持向后兼容
    if (content !== undefined && typeof content !== 'string') {
      return NextResponse.json(
        { error: '内容格式错误' },
        { status: 400 }
      );
    }

    // 如果传了其他字段，使用完整对象更新
    const updateData = Object.keys(otherFields).length > 0
      ? { content, ...otherFields }
      : content;

    const success = updateAboutContent(updateData);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: '更新失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating about content:', error);
    return NextResponse.json(
      { error: '更新关于内容失败' },
      { status: 500 }
    );
  }
}

