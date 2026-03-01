import { NextRequest, NextResponse } from 'next/server';
import { getMovieById, updateMovie, deleteMovie } from '@/lib/movies';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const movie = getMovieById(resolvedParams.id);

    if (!movie) {
      return NextResponse.json(
        { error: '电影不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ movie });
  } catch (error) {
    console.error('Error fetching movie:', error);
    return NextResponse.json(
      { error: '获取电影失败' },
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
    const { name, score, status, review, tag, coverImage } = body;

    if (name !== undefined && name.trim() === '') {
      return NextResponse.json(
        { error: '名称不能为空' },
        { status: 400 }
      );
    }

    if (score !== undefined && (score < 0 || score > 100)) {
      return NextResponse.json(
        { error: '评分必须在0-100之间' },
        { status: 400 }
      );
    }

    if (status && !['已看完', '已二刷', '待二刷', '进行中', '待观看'].includes(status)) {
      return NextResponse.json(
        { error: '状态无效' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (score !== undefined) updateData.score = Number(score);
    if (status !== undefined) updateData.status = status;
    if (review !== undefined) updateData.review = review;
    if (tag !== undefined) updateData.tag = tag?.trim() || undefined;
    if (coverImage !== undefined) updateData.coverImage = coverImage;

    const success = updateMovie(resolvedParams.id, updateData);
    if (!success) {
      return NextResponse.json(
        { error: '电影不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating movie:', error);
    return NextResponse.json(
      { error: '更新电影失败' },
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
    const success = deleteMovie(resolvedParams.id);

    if (!success) {
      return NextResponse.json(
        { error: '电影不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting movie:', error);
    return NextResponse.json(
      { error: '删除电影失败' },
      { status: 500 }
    );
  }
}

