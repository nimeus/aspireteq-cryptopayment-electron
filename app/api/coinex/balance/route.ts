import { NextRequest, NextResponse } from 'next/server';
import { getCoinexBalance } from '@/lib/coinex-api';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret } = await request.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'API credentials are required' },
        { status: 400 }
      );
    }

    const balances = await getCoinexBalance({ apiKey, apiSecret });
    return NextResponse.json(balances);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
