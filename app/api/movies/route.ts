import { NextRequest, NextResponse } from 'next/server';
import { getAllMovies, createMovie, filterMoviesByStatus, sortMoviesByScore, searchMoviesByName } from '@/lib/movies';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as '已看完' | '已二刷' | '进行中' | '待观看' | '全部' | null;
    const sortBy = searchParams.get('sortBy') as 'score-asc' | 'score-desc' | null;
    const search = searchParams.get('search');
    
    let movies = getAllMovies();
    
    // 按状态筛选
    if (status && status !== '全部') {
      movies = filterMoviesByStatus(movies, status);
    }
    
    // 按名称搜索
    if (search) {
      movies = searchMoviesByName(movies, search);
    }
    
    // 按评分排序
    if (sortBy === 'score-asc') {
      movies = sortMoviesByScore(movies, 'asc');
    } else if (sortBy === 'score-desc') {
      movies = sortMoviesByScore(movies, 'desc');
    }
    
    return NextResponse.json({ movies });
  } catch (error) {
    console.error('Error fetching movies:', error);
    return NextResponse.json(
      { error: '获取电影列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, score, status, review, tag, coverImage } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: '名称不能为空' },
        { status: 400 }
      );
    }

    if (score === undefined || score === null || score < 0 || score > 100) {
      return NextResponse.json(
        { error: '评分必须在0-100之间' },
        { status: 400 }
      );
    }

    if (!status || !['已看完', '已二刷', '待二刷', '进行中', '待观看'].includes(status)) {
      return NextResponse.json(
        { error: '状态无效' },
        { status: 400 }
      );
    }

    const id = createMovie({ 
      name: name.trim(), 
      score: Number(score), 
      status, 
      review: review || '', 
      tag: tag?.trim() || undefined,
      coverImage 
    });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating movie:', error);
    return NextResponse.json(
      { error: '创建电影记录失败' },
      { status: 500 }
    );
  }
}

