import { NextRequest, NextResponse } from 'next/server';
import {
  createEvent,
  EventData,
} from '@/lib/analytics-v2';

export async function POST(request: NextRequest) {
  try {
    // 处理 sendBeacon 发送的 FormData 格式
    let body: any;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // FormData 格式（sendBeacon 使用 FormData）
      const formData = await request.formData();
      const dataStr = formData.get('data') as string | null;
      if (dataStr) {
        body = JSON.parse(dataStr);
      } else {
        // 如果没有 data 字段，尝试直接解析所有字段
        body = {
          eventId: formData.get('eventId') as string,
          sessionId: formData.get('sessionId') as string,
          pageViewId: formData.get('pageViewId') as string | null,
          eventType: formData.get('eventType') as string,
          eventData: formData.get('eventData') ? JSON.parse(formData.get('eventData') as string) : undefined,
          timestamp: formData.get('timestamp') ? parseInt(formData.get('timestamp') as string) : undefined,
        };
      }
    } else {
      // 标准 JSON 请求
      body = await request.json();
    }

    const { eventId, sessionId, pageViewId, eventType, eventData, timestamp } = body;

    if (!eventId || !sessionId || !eventType || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, sessionId, eventType, timestamp' },
        { status: 400 }
      );
    }

    const event: EventData = {
      eventId,
      sessionId,
      pageViewId: pageViewId || undefined,
      eventType,
      eventData: eventData || undefined,
      timestamp,
    };

    createEvent(event);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}

