import CryptoJS from 'crypto-js';
import { ApiCredentials, Balance, WithdrawalRequest, WithdrawalResult, CoinInfo } from './types';

const MEXC_API_BASE = 'https://api.mexc.com';

/**
 * Get MEXC server time
 */
async function getMexcServerTime(): Promise<number> {
  try {
    const response = await fetch(`${MEXC_API_BASE}/api/v3/time`);
    const data = await response.json();
    return data.serverTime;
  } catch (error) {
    console.warn('Failed to get MEXC server time, using local time:', error);
    return Date.now();
  }
}

/**
 * Generate MEXC API signature
 */
function generateMexcSignature(queryString: string, secretKey: string): string {
  return CryptoJS.HmacSHA256(queryString, secretKey).toString();
}

/**
 * Build URL-encoded query string from params (maintains insertion order)
 * Used for both signature calculation and URL construction to ensure consistency
 */
function buildQueryString(params: Record<string, any>): string {
  return Object.keys(params)
    .filter(key => params[key] !== undefined && params[key] !== '')
    .map(key => `${key}=${encodeURIComponent(params[key])}`)
    .join('&');
}

/**
 * Make authenticated MEXC API request
 */
async function mexcRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  credentials: ApiCredentials,
  params: Record<string, any> = {}
): Promise<any> {
  const timestamp = await getMexcServerTime();
  const allParams = { ...params, timestamp };

  // Build URL-encoded query string for both signature and URL
  const queryString = buildQueryString(allParams);
  const signature = generateMexcSignature(queryString, credentials.apiSecret);

  // Build final URL with signature
  const url = `${MEXC_API_BASE}${endpoint}?${queryString}&signature=${signature}`;

  // Debug logging
  console.log('MEXC Request Debug:');
  console.log('Method:', method);
  console.log('Params:', allParams);
  console.log('Query String (URL-encoded):', queryString);
  console.log('Signature:', signature);
  console.log('URL:', url);

  const response = await fetch(url, {
    method,
    headers: {
      'X-MEXC-APIKEY': credentials.apiKey,
      // NO Content-Type - Postman has it disabled
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ msg: 'Request failed' }));
    throw new Error(error.msg || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get account balance
 */
export async function getMexcBalance(credentials: ApiCredentials): Promise<Balance[]> {
  const data = await mexcRequest('/api/v3/account', 'GET', credentials);

  return data.balances
    .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
    .map((b: any) => ({
      coin: b.asset,
      free: b.free,
      locked: b.locked,
      total: (parseFloat(b.free) + parseFloat(b.locked)).toString(),
    }));
}

/**
 * Get all coin information
 */
export async function getMexcCoins(credentials: ApiCredentials): Promise<CoinInfo[]> {
  const data = await mexcRequest('/api/v3/capital/config/getall', 'GET', credentials);

  return data.map((coin: any) => ({
    coin: coin.coin,
    name: coin.name,
    networks: coin.networkList.map((network: any) => {
      // Debug: log network data to verify netWork field exists
      if (coin.coin === 'USDT') {
        console.log('USDT Network:', {
          network: network.network,
          netWork: network.netWork,
        });
      }
      return {
        network: network.network, // Display name for UI
        netWork: network.netWork || network.network, // API code for withdrawal requests (fallback to network if netWork missing)
        withdrawFee: network.withdrawFee,
        minWithdraw: network.withdrawMin,
        withdrawEnabled: network.withdrawEnable,
      };
    }),
  }));
}

/**
 * Submit withdrawal
 */
export async function submitMexcWithdrawal(
  credentials: ApiCredentials,
  withdrawal: WithdrawalRequest
): Promise<WithdrawalResult> {
  try {
    const params: Record<string, any> = {
      coin: withdrawal.coin,
      netWork: withdrawal.network,
      address: withdrawal.address,
      amount: withdrawal.amount,
    };

    if (withdrawal.memo) {
      params.memo = withdrawal.memo;
    }

    if (withdrawal.remark) {
      params.remark = withdrawal.remark;
    }

    const data = await mexcRequest('/api/v3/capital/withdraw', 'POST', credentials, params);

    return {
      success: true,
      address: withdrawal.address,
      amount: withdrawal.amount,
      coin: withdrawal.coin,
      txId: data.id,
      message: 'Withdrawal submitted successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      address: withdrawal.address,
      amount: withdrawal.amount,
      coin: withdrawal.coin,
      error: error.message,
    };
  }
}

/**
 * Bulk withdrawal
 */
export async function bulkMexcWithdrawal(
  credentials: ApiCredentials,
  withdrawals: WithdrawalRequest[]
): Promise<WithdrawalResult[]> {
  const results: WithdrawalResult[] = [];

  for (const withdrawal of withdrawals) {
    const result = await submitMexcWithdrawal(credentials, withdrawal);
    results.push(result);

    // Delay between requests to avoid rate limiting
    if (withdrawals.indexOf(withdrawal) < withdrawals.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}
