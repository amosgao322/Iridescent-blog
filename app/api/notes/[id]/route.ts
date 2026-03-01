import { NextRequest, NextResponse } from 'next/server';
import { getNoteById, updateNote, deleteNote } from '@/lib/notes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const note = getNoteById(resolvedParams.id);

    if (!note) {
      return NextResponse.json(
        { error: '随记不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Error fetching note:', error);
    return NextResponse.json(
      { error: '获取随记失败' },
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
    const { content, images, videos } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400 }
      );
    }

    const success = updateNote(resolvedParams.id, content.trim(), images, videos);
    if (!success) {
      return NextResponse.json(
        { error: '随记不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: '更新随记失败' },
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
    const success = deleteNote(resolvedParams.id);

    if (!success) {
      return NextResponse.json(
        { error: '随记不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: '删除随记失败' },
      { status: 500 }
    );
  }
}

