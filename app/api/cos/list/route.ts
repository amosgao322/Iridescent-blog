import { NextRequest, NextResponse } from 'next/server';
import { listCOSFiles } from '@/lib/cos';

export async function GET(request: NextRequest) {
  try {
    // 检查是否配置了 COS
    const hasCOSConfig = 
      process.env.COS_SECRET_ID && 
      process.env.COS_SECRET_KEY && 
      process.env.COS_BUCKET;

    if (!hasCOSConfig) {
      return NextResponse.json(
        { error: '未配置腾讯云 COS' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const prefix = searchParams.get('prefix') || process.env.COS_IMAGE_PATH || 'images';
    const maxKeys = parseInt(searchParams.get('maxKeys') || '100');
    const marker = searchParams.get('marker') || undefined;

    const result = await listCOSFiles({
      Prefix: prefix.endsWith('/') ? prefix : `${prefix}/`,
      MaxKeys: maxKeys,
      Marker: marker,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('List COS files error:', error);
    return NextResponse.json(
      { error: '获取文件列表失败' },
      { status: 500 }
    );
  }
}

