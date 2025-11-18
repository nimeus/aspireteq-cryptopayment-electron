import CryptoJS from 'crypto-js';
import { ApiCredentials, Balance, WithdrawalRequest, WithdrawalResult, CoinInfo } from './types';

const COINEX_API_BASE = 'https://api.coinex.com/v2';

/**
 * Generate CoinEx API signature
 * Format: HMAC-SHA256(METHOD + REQUEST_PATH + BODY + TIMESTAMP, SECRET_KEY)
 */
function generateCoinexSignature(
  method: string,
  requestPath: string,
  body: string,
  timestamp: string,
  secretKey: string
): string {
  const preparedStr = method + requestPath + body + timestamp;
  return CryptoJS.HmacSHA256(preparedStr, secretKey).toString().toLowerCase();
}

/**
 * Make authenticated CoinEx API request
 */
async function coinexRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE',
  credentials: ApiCredentials,
  body: any = null
): Promise<any> {
  const timestamp = Date.now().toString();
  const bodyString = body ? JSON.stringify(body) : '';

  // CoinEx requires /v2 prefix in signature path
  const requestPath = `/v2${endpoint}`;

  const signature = generateCoinexSignature(
    method,
    requestPath,
    bodyString,
    timestamp,
    credentials.apiSecret
  );

  // Debug logging
  console.log('CoinEx Request Debug:');
  console.log('Method:', method);
  console.log('Request Path:', requestPath);
  console.log('Body:', bodyString || '(empty)');
  console.log('Timestamp:', timestamp);
  console.log('Prepared String:', method + requestPath + bodyString + timestamp);
  console.log('Signature:', signature);

  const url = `${COINEX_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-COINEX-KEY': credentials.apiKey,
    'X-COINEX-SIGN': signature,
    'X-COINEX-TIMESTAMP': timestamp,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && method === 'POST') {
    options.body = bodyString;
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const result = await response.json();

  if (result.code !== 0) {
    throw new Error(result.message || 'API request failed');
  }

  return result.data;
}

/**
 * Get account balance
 */
export async function getCoinexBalance(credentials: ApiCredentials): Promise<Balance[]> {
  const data = await coinexRequest('/assets/spot/balance', 'GET', credentials);

  return data
    .filter((b: any) => parseFloat(b.available) > 0 || parseFloat(b.frozen) > 0)
    .map((b: any) => ({
      coin: b.ccy,
      free: b.available,
      locked: b.frozen,
      total: (parseFloat(b.available) + parseFloat(b.frozen)).toFixed(8),
    }));
}

/**
 * Get withdrawal configuration for a specific coin
 */
export async function getCoinexWithdrawalConfig(
  credentials: ApiCredentials,
  coin: string
): Promise<any> {
  const endpoint = `/assets/deposit-withdraw-config?ccy=${encodeURIComponent(coin)}`;
  return coinexRequest(endpoint, 'GET', credentials);
}

/**
 * Get all withdrawal configurations
 */
export async function getCoinexAllCoins(credentials: ApiCredentials): Promise<CoinInfo[]> {
  const data = await coinexRequest('/assets/all-deposit-withdraw-config', 'GET', credentials);

  return data.map((item: any) => ({
    coin: item.asset.ccy,
    name: item.asset.ccy,
    networks: item.chains.map((chain: any) => ({
      network: chain.chain,
      withdrawFee: chain.withdrawal_fee,
      minWithdraw: chain.min_withdraw_amount,
      withdrawEnabled: chain.withdraw_enabled,
    })),
  }));
}

/**
 * Submit withdrawal
 */
export async function submitCoinexWithdrawal(
  credentials: ApiCredentials,
  withdrawal: WithdrawalRequest
): Promise<WithdrawalResult> {
  try {
    const body: Record<string, any> = {
      ccy: withdrawal.coin,
      to_address: withdrawal.address,
      amount: withdrawal.amount,
    };

    if (withdrawal.network) {
      body.chain = withdrawal.network;
    }

    if (withdrawal.memo) {
      body.memo = withdrawal.memo;
    }

    if (withdrawal.remark) {
      body.remark = withdrawal.remark;
    }

    const data = await coinexRequest('/assets/withdraw', 'POST', credentials, body);

    return {
      success: true,
      address: withdrawal.address,
      amount: withdrawal.amount,
      coin: withdrawal.coin,
      txId: data.withdraw_id?.toString(),
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
export async function bulkCoinexWithdrawal(
  credentials: ApiCredentials,
  withdrawals: WithdrawalRequest[]
): Promise<WithdrawalResult[]> {
  const results: WithdrawalResult[] = [];

  for (const withdrawal of withdrawals) {
    const result = await submitCoinexWithdrawal(credentials, withdrawal);
    results.push(result);

    // Delay between requests to avoid rate limiting
    if (withdrawals.indexOf(withdrawal) < withdrawals.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  return results;
}
