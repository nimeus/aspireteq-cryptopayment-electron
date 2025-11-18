import { NextRequest, NextResponse } from 'next/server';
import { getMexcCoins } from '@/lib/mexc-api';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret } = await request.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'API credentials are required' },
        { status: 400 }
      );
    }

    const coins = await getMexcCoins({ apiKey, apiSecret });
    return NextResponse.json(coins);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch coins' },
      { status: 500 }
    );
  }
}
