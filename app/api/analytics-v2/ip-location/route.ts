import { NextRequest, NextResponse } from 'next/server';
import { getIPLocation } from '../../../../lib/ip-location-apihz';
import { updateUserLocation } from '../../../../lib/analytics-v2';

/**
 * 按需查询 IP 归属地（访问统计 V2 用户列表点击用户时调用）
 * POST body: { ip: string, userId?: string }
 * 若传 userId，会同时把结果写回该用户；返回 { country?, region?, city?, isp? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ip, userId } = body;

    if (!ip || typeof ip !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid ip' },
        { status: 400 }
      );
    }

    const loc = await getIPLocation(ip, { timeoutMs: 5000 });
    if (!loc) {
      return NextResponse.json({ country: undefined, region: undefined, city: undefined, isp: undefined });
    }

    if (userId && typeof userId === 'string') {
      updateUserLocation(userId, loc);
    }

    return NextResponse.json(loc);
  } catch (error) {
    console.error('[ip-location]', error);
    return NextResponse.json(
      { error: 'IP location lookup failed' },
      { status: 500 }
    );
  }
}
