import { NextRequest, NextResponse } from 'next/server';
import { bulkCoinexWithdrawal } from '@/lib/coinex-api';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret, withdrawals } = await request.json();

    if (!apiKey || !apiSecret || !withdrawals) {
      return NextResponse.json(
        { error: 'API credentials and withdrawals are required' },
        { status: 400 }
      );
    }

    const results = await bulkCoinexWithdrawal({ apiKey, apiSecret }, withdrawals);
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to process withdrawals' },
      { status: 500 }
    );
  }
}
