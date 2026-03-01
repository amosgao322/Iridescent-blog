import { NextRequest, NextResponse } from 'next/server';
import { getAllNotes, createNote } from '@/lib/notes';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const date = searchParams.get('date');
    
    let notes = getAllNotes();
    
    // 搜索过滤
    if (search) {
      const searchLower = search.toLowerCase();
      notes = notes.filter(note => 
        note.content.toLowerCase().includes(searchLower)
      );
    }
    
    // 日期过滤
    if (date) {
      notes = notes.filter(note => note.date === date);
    }
    
    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json(
      { error: '获取随记失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, images, videos } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: '内容不能为空' },
        { status: 400 }
      );
    }

    const id = createNote(content.trim(), images, videos);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json(
      { error: '创建随记失败' },
      { status: 500 }
    );
  }
}

