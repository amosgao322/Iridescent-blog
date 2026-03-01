import { NextRequest, NextResponse } from 'next/server';

// v1 已不再调用 IP 归属接口，地理位置请使用【访问统计 V2 - 用户画像】按需查询
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      totalIPs: 0,
      processed: 0,
      updated: 0,
      failed: 0,
      message: 'v1 已不再调用 IP 归属接口，请使用访问统计 V2 用户画像中点击用户按需查询地理位置',
    });
  } catch (error) {
    console.error('Error updating locations:', error);
    return NextResponse.json(
      { error: '更新地理位置失败' },
      { status: 500 }
    );
  }
}

