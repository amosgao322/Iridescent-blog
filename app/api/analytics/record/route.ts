import { NextRequest, NextResponse } from 'next/server';
import { addVisit } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    // 检查是否为内部请求（防止外部直接调用）
    const isInternal = request.headers.get('x-internal-request') === 'true';
    if (!isInternal) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ip, path, userAgent, referer } = body;

    if (!ip || !path) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 关键优化：先创建访问记录（不等待地理位置），确保 visitId 可以立即被查询到
    // 然后再异步更新地理位置信息
    const visitId = addVisit({
      ip,
      path,
      userAgent,
      referer,
    });

    console.log(`[RecordVisit] Visit created: visitId=${visitId}, path=${path}, ip=${ip}`);

    return NextResponse.json({ success: true, visitId });
  } catch (error) {
    console.error('Error recording visit:', error);
    return NextResponse.json(
      { error: 'Failed to record visit' },
      { status: 500 }
    );
  }
}

