import { NextRequest, NextResponse } from 'next/server';
import { getStorageStats } from '@/lib/storage/stats';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const stats = await getStorageStats(userId);
    
    return NextResponse.json({
      success: true,
      usedGb: stats.usedGb,
      totalGb: stats.totalGb,
      fileCount: stats.fileCount,
      planName: stats.planName,
    });
  } catch (err: any) {
    console.error('[API_STORAGE_STATS]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}