import { NextRequest, NextResponse } from 'next/server';
import {
  createEngagementSignal,
  EngagementSignalData,
} from '@/lib/analytics-v2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signalId, sessionId, pageViewId, signalType, value, timestamp } = body;

    if (!signalId || !sessionId || !signalType || !timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: signalId, sessionId, signalType, timestamp' },
        { status: 400 }
      );
    }

    const signal: EngagementSignalData = {
      signalId,
      sessionId,
      pageViewId: pageViewId || undefined,
      signalType,
      value: value !== undefined ? value : undefined,
      timestamp,
    };

    createEngagementSignal(signal);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating engagement signal:', error);
    return NextResponse.json(
      { error: 'Failed to create engagement signal' },
      { status: 500 }
    );
  }
}

