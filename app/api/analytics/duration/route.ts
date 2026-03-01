import { NextRequest, NextResponse } from 'next/server';
import { getAllVisits } from '@/lib/analytics';
import fs from 'fs';
import path from 'path';

const analyticsFilePath = path.join(process.cwd(), 'content/analytics.json');

interface AnalyticsData {
  visits: Array<{
    id: string;
    duration?: number;
    [key: string]: any;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // 记录 API 调用（总是输出，方便调试）
    console.log(`[DurationAPI] POST request received, contentType: ${request.headers.get('content-type') || 'N/A'}`);
    
    // 支持 Blob 数据（sendBeacon 发送的格式）
    // sendBeacon 发送的 Blob 数据，content-type 可能是 'application/json'，但需要特殊处理
    let body: any;
    const contentType = request.headers.get('content-type') || '';
    
    // 支持多种数据格式：
    // 1. 标准 JSON (fetch 请求)
    // 2. FormData (sendBeacon with FormData)
    // 3. Blob (sendBeacon with Blob)
    try {
      if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        // FormData 格式（sendBeacon 使用 FormData）
        const formData = await request.formData();
        const dataStr = formData.get('data') as string | null;
        if (dataStr) {
          body = JSON.parse(dataStr);
        } else {
          // 如果没有 data 字段，尝试直接解析所有字段（兼容性处理）
          const formEntries = Object.fromEntries(formData.entries());
          // 尝试从 formEntries 中提取 visitId 和 duration
          if (formEntries.visitId || formEntries.duration !== undefined) {
            body = {
              visitId: formEntries.visitId,
              duration: typeof formEntries.duration === 'string' ? parseInt(formEntries.duration, 10) : formEntries.duration,
            };
          } else {
            throw new Error('No data field in FormData');
          }
        }
      } else if (contentType.includes('application/json')) {
        // 标准 JSON 请求
        body = await request.json();
      } else {
        // 尝试作为 JSON 解析（兼容性处理）
        body = await request.json();
      }
    } catch (parseError) {
      // 如果 JSON 解析失败，尝试作为文本或 Blob 解析
      try {
        const text = await request.text();
        body = JSON.parse(text);
      } catch (textError) {
        try {
          const blob = await request.blob();
          const text = await blob.text();
          body = JSON.parse(text);
        } catch (blobError) {
          console.error('Failed to parse request body:', { parseError, textError, blobError, contentType });
          return NextResponse.json(
            { error: 'Invalid data format' },
            { status: 400 }
          );
        }
      }
    }
    
    const { visitId, duration, isHeartbeat } = body;
    
    // 记录解析后的数据（总是输出，方便调试）
    console.log(`[DurationAPI] Parsed body: visitId=${visitId}, duration=${duration}, isHeartbeat=${isHeartbeat || false}, type=${typeof duration}`);

    if (!visitId || typeof duration !== 'number' || duration < 0) {
      console.error(`[DurationAPI] Invalid parameters: visitId=${visitId}, duration=${duration}, type=${typeof duration}`);
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // 读取现有数据
    const visits = getAllVisits();
    const visitIndex = visits.findIndex(v => v.id === visitId);
    
    console.log(`[DurationAPI] Looking for visitId=${visitId}, found index=${visitIndex}, total visits=${visits.length}`);

    if (visitIndex === -1) {
      console.error(`[DurationAPI] Visit not found: visitId=${visitId}, total visits: ${visits.length}`);
      // 列出最近的几个 visitId 以便调试
      if (visits.length > 0) {
        const recentVisits = visits.slice(-5).map(v => v.id);
        console.error(`[DurationAPI] Recent visitIds: ${recentVisits.join(', ')}`);
      }
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      );
    }

    // 更新停留时间和最后活动时间（心跳机制）
    const currentDuration = visits[visitIndex].duration || 0;
    const newDuration = Math.round(duration);
    const now = Date.now();
    
    // 更新最后活动时间（心跳机制：每次更新都记录最后活动时间）
    // 注意：无论是否是心跳，都更新 lastActivityTime
    visits[visitIndex].lastActivityTime = now;
    
    // 更新 endTime 的逻辑：
    // endTime 应该反映用户实际离开的时间，优先使用 lastActivityTime（当前时间）
    // 因为 lastActivityTime 表示用户最后一次活动的时间，更准确
    // 如果用户还在活动，endTime 应该等于 lastActivityTime（即当前时间）
    // 如果用户已经离开，endTime 应该等于最后一次心跳的 lastActivityTime
    
    // 优先使用 lastActivityTime（当前时间）作为 endTime
    // 这样可以确保 endTime 总是 >= lastActivityTime
    if (now > visits[visitIndex].timestamp) {
      // 只有当当前时间晚于开始时间时，才更新
      if (!visits[visitIndex].endTime || now > visits[visitIndex].endTime) {
        visits[visitIndex].endTime = now;
      }
    }
    
    // 备用方案：如果 now 无效，使用 timestamp + duration 计算
    // 这通常不会发生，但作为备用方案
    if (!visits[visitIndex].endTime || visits[visitIndex].endTime <= visits[visitIndex].timestamp) {
      if (newDuration > 0) {
        const calculatedEndTime = visits[visitIndex].timestamp + (newDuration * 1000);
        if (calculatedEndTime > visits[visitIndex].timestamp) {
          visits[visitIndex].endTime = calculatedEndTime;
        }
      }
    }
    
    console.log(`[DurationAPI] Updating lastActivityTime for visitId=${visitId}: ${new Date(now).toISOString()}, isHeartbeat=${isHeartbeat || false}, endTime=${visits[visitIndex].endTime ? new Date(visits[visitIndex].endTime).toISOString() : 'N/A'}`);
    
    // 更新停留时间（总是更新为更大的值，确保最终停留时间正确）
    // 注意：如果 newDuration 为 0，可能是初始化，不应该覆盖已有的值
    if (newDuration > 0 && newDuration > currentDuration) {
      visits[visitIndex].duration = newDuration;
      if (isHeartbeat) {
        console.log(`[Heartbeat] Duration updated (increased): visitId=${visitId}, old=${currentDuration}, new=${newDuration}`);
      } else {
        console.log(`Duration updated (increased): visitId=${visitId}, old=${currentDuration}, new=${newDuration}`);
      }
    } else if (newDuration > 0 && newDuration === currentDuration) {
      // 如果值相同且大于0，也更新一次（可能是最终更新或心跳）
      visits[visitIndex].duration = newDuration;
      if (isHeartbeat) {
        console.log(`[Heartbeat] Duration updated (same): visitId=${visitId}, duration=${newDuration}`);
      } else {
        console.log(`Duration updated (same): visitId=${visitId}, duration=${newDuration}`);
      }
    } else if (newDuration > 0 && newDuration < currentDuration) {
      // 如果新值更小但大于0，可能是部分更新，但仍然更新（记录日志以便调试）
      visits[visitIndex].duration = newDuration;
      console.log(`Duration updated (decreased, may be partial): visitId=${visitId}, old=${currentDuration}, new=${newDuration}`);
    } else if (newDuration === 0 && currentDuration > 0) {
      // 如果新值是0但已有值大于0，不更新 duration（避免被0覆盖），但更新 lastActivityTime
      console.log(`Duration update ignored (new=0, current=${currentDuration}): visitId=${visitId}, but lastActivityTime updated`);
    } else {
      // 如果都是0，更新（可能是初始化）
      visits[visitIndex].duration = newDuration;
      console.log(`Duration updated (initialization): visitId=${visitId}, duration=${newDuration}`);
    }

    // 保存到文件
    try {
      const data: AnalyticsData = { visits };
      fs.writeFileSync(analyticsFilePath, JSON.stringify(data, null, 2), 'utf8');
      const logMessage = `Duration updated successfully: visitId=${visitId}, duration=${visits[visitIndex].duration}, lastActivityTime=${visits[visitIndex].lastActivityTime ? new Date(visits[visitIndex].lastActivityTime).toISOString() : 'N/A'}, endTime=${visits[visitIndex].endTime ? new Date(visits[visitIndex].endTime).toISOString() : 'N/A'}`;
      if (isHeartbeat) {
        console.log(`[Heartbeat] ${logMessage}`);
      } else {
        console.log(`[DurationAPI] ${logMessage}`);
      }
    } catch (writeError) {
      console.error('Error writing analytics file:', writeError);
      // 检查是否是权限问题
      if ((writeError as NodeJS.ErrnoException).code === 'EACCES' || 
          (writeError as NodeJS.ErrnoException).code === 'EPERM') {
        console.error('File write permission denied. Check file permissions for:', analyticsFilePath);
      }
      throw writeError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating duration:', error);
    return NextResponse.json(
      { error: 'Failed to update duration' },
      { status: 500 }
    );
  }
}

