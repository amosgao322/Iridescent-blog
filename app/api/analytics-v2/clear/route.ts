import { NextRequest, NextResponse } from 'next/server';
import { closeDb } from '@/lib/analytics-v2';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    // 检查是否为管理员（简单检查，生产环境应该使用更严格的认证）
    const auth = request.headers.get('x-admin-auth');
    if (auth !== 'true') {
      // 也可以从session或其他方式验证
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 关闭数据库连接
    closeDb();

    // 删除数据库文件
    const dbPath = path.join(process.cwd(), 'content/analytics-v2.db');
    
    // 等待一小段时间确保连接完全关闭
    await new Promise(resolve => setTimeout(resolve, 500));

    if (fs.existsSync(dbPath)) {
      // 尝试多次删除（处理文件锁定问题）
      let retries = 5;
      while (retries > 0) {
        try {
          fs.unlinkSync(dbPath);
          break;
        } catch (error: any) {
          if (error.code === 'EBUSY' && retries > 1) {
            retries--;
            await new Promise(resolve => setTimeout(resolve, 500));
            continue;
          }
          throw error;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'V2统计数据已清空' 
    });
  } catch (error: any) {
    console.error('Error clearing analytics v2 data:', error);
    return NextResponse.json(
      { error: `清空数据失败: ${error.message}` },
      { status: 500 }
    );
  }
}

