import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsersWithStats,
  getUserProfile,
  getUserPageVisits,
} from '@/lib/analytics-v2';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '30');
    const date = searchParams.get('date') || undefined; // 可选的日期参数（YYYY-MM-DD格式）

    // 计算日期范围
    // 如果指定了日期，只查询该日期的数据；否则使用今天
    let endDate = Date.now();
    let startDate = endDate - (days * 24 * 60 * 60 * 1000);
    
    if (date) {
      const selectedDate = new Date(date);
      // 无论选择的是今天还是其他日期，都只查询该日期的数据
      selectedDate.setHours(0, 0, 0, 0);
      startDate = selectedDate.getTime();
      selectedDate.setHours(23, 59, 59, 999);
      endDate = selectedDate.getTime();
    } else {
      // 如果没有指定日期，默认只查询今天的数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate = today.getTime();
      today.setHours(23, 59, 59, 999);
      endDate = today.getTime();
    }

    // 如果指定了userId，返回用户详情和访问历史
    if (userId) {
      const profile = getUserProfile(userId);
      if (!profile) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const pageVisits = getUserPageVisits(userId, startDate, endDate);

      return NextResponse.json({
        profile,
        pageVisits,
      });
    }

    // 否则返回所有用户列表
    const users = getAllUsersWithStats(startDate, endDate);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    );
  }
}

