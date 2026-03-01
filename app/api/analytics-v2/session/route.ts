import { NextRequest, NextResponse } from 'next/server';
import {
  createSession,
  updateSession,
  SessionData,
} from '@/lib/analytics-v2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, startTime, referer, userAgent, ip, country, region, city } = body;

    if (!sessionId || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, startTime' },
        { status: 400 }
      );
    }

    // 获取客户端IP
    const clientIP = ip || 
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const sessionData: SessionData = {
      sessionId,
      startTime,
      referer: referer || undefined,
      userAgent: userAgent || request.headers.get('user-agent') || undefined,
      ip: clientIP,
      country: country || undefined,
      region: region || undefined,
      city: city || undefined,
      isp: undefined,
    };

    const userId = createSession(sessionData);

    // 如果是爬虫，返回空（不记录）
    if (!userId) {
      return NextResponse.json({ success: false, isBot: true });
    }

    return NextResponse.json({ success: true, userId });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // 处理sendBeacon发送的FormData格式
    let body: any;
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else {
      // 尝试直接解析JSON（sendBeacon可能发送纯JSON blob）
      try {
        const text = await request.text();
        body = JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    }

    const { sessionId, endTime, duration, isBounce, pageCount } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    updateSession(sessionId, {
      endTime,
      duration,
      isBounce,
      pageCount,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

