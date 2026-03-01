import { NextRequest, NextResponse } from 'next/server';
import {
  createPageView,
  updatePageView,
  PageViewData,
} from '@/lib/analytics-v2';


export async function PATCH(request: NextRequest) {
  try {
    // 处理sendBeacon发送的FormData格式
    let body: any;
    const contentType = request.headers.get('content-type');
    
    console.log('[API] PATCH pageview, content-type:', contentType);
    
    if (contentType?.includes('application/json')) {
      body = await request.json();
    } else if (contentType?.includes('multipart/form-data') || contentType?.includes('application/x-www-form-urlencoded')) {
      // sendBeacon可能发送FormData，尝试解析
      const formData = await request.formData();
      const dataStr = formData.get('data') as string;
      if (dataStr) {
        body = JSON.parse(dataStr);
      } else {
        // 如果没有data字段，尝试从formData中直接获取
        const isExitValue = formData.get('isExit');
        body = {
          pageViewId: formData.get('pageViewId') as string,
          duration: formData.get('duration') ? parseInt(formData.get('duration') as string) : undefined,
          scrollDepth: formData.get('scrollDepth') ? parseInt(formData.get('scrollDepth') as string) : undefined,
          isExit: isExitValue === 'true' || isExitValue === '1',
        };
      }
    } else {
      // 尝试直接解析JSON（sendBeacon可能发送纯JSON blob）
      try {
        const text = await request.text();
        body = JSON.parse(text);
      } catch (e) {
        console.error('[API] Failed to parse request body:', e);
        return NextResponse.json(
          { error: 'Invalid request format' },
          { status: 400 }
        );
      }
    }

    const { pageViewId, duration, scrollDepth, isExit } = body;

    console.log('[API] Update pageview:', { pageViewId, duration, scrollDepth, isExit });

    if (!pageViewId) {
      return NextResponse.json(
        { error: 'Missing required field: pageViewId' },
        { status: 400 }
      );
    }

    const now = Date.now();
    updatePageView(pageViewId, {
      duration,
      scrollDepth,
      isExit,
      endTime: isExit ? now : undefined, // 如果是退出，记录结束时间
    });

    console.log('[API] Pageview updated successfully');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error updating page view:', error);
    return NextResponse.json(
      { error: 'Failed to update page view' },
      { status: 500 }
    );
  }
}

// POST 方法：用于创建页面访问，也支持更新（通过 action=update 参数，用于 sendBeacon）
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    
    // 如果是更新操作（用于 sendBeacon，因为 sendBeacon 不支持 PATCH）
    if (action === 'update') {
      let body: any;
      const contentType = request.headers.get('content-type');
      
      console.log('[API] POST pageview update, content-type:', contentType);
      
      if (contentType?.includes('application/json')) {
        body = await request.json();
      } else if (contentType?.includes('multipart/form-data') || contentType?.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const dataStr = formData.get('data') as string;
        if (dataStr) {
          body = JSON.parse(dataStr);
        } else {
          const isExitValue = formData.get('isExit');
          body = {
            pageViewId: formData.get('pageViewId') as string,
            duration: formData.get('duration') ? parseInt(formData.get('duration') as string) : undefined,
            scrollDepth: formData.get('scrollDepth') ? parseInt(formData.get('scrollDepth') as string) : undefined,
            isExit: isExitValue === 'true' || isExitValue === '1',
          };
        }
      } else {
        try {
          const text = await request.text();
          body = JSON.parse(text);
        } catch (e) {
          console.error('[API] Failed to parse request body:', e);
          return NextResponse.json(
            { error: 'Invalid request format' },
            { status: 400 }
          );
        }
      }

      const { pageViewId, duration, scrollDepth, isExit } = body;

      console.log('[API] Update pageview via POST:', { pageViewId, duration, scrollDepth, isExit });

      if (!pageViewId) {
        return NextResponse.json(
          { error: 'Missing required field: pageViewId' },
          { status: 400 }
        );
      }

      const now = Date.now();
      updatePageView(pageViewId, {
        duration,
        scrollDepth,
        isExit,
        endTime: isExit ? now : undefined,
      });

      console.log('[API] Pageview updated successfully via POST');
      return NextResponse.json({ success: true });
    }

    // 否则是创建页面访问
    const body = await request.json();
    const { pageViewId, sessionId, path, timestamp, referer, userAgent } = body;

    if (!pageViewId || !sessionId || !path || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: pageViewId, sessionId, path, timestamp' },
        { status: 400 }
      );
    }

    const pageViewData: PageViewData = {
      pageViewId,
      sessionId,
      path,
      timestamp,
      referer: referer || undefined,
      userAgent: userAgent || request.headers.get('user-agent') || undefined,
    };

    createPageView(pageViewData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error in POST pageview:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

