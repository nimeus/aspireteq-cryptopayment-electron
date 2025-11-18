// Common types for the application

export interface Balance {
  coin: string;
  free: string;
  locked: string;
  total: string;
}

export interface WithdrawalRequest {
  coin: string;
  network: string;
  address: string;
  amount: string;
  memo?: string;
  remark?: string;
}

export interface WithdrawalResult {
  success: boolean;
  address: string;
  amount: string;
  coin: string;
  txId?: string;
  error?: string;
  message?: string;
}

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface NetworkInfo {
  network: string; // Display name like "BNB Smart Chain(BEP20)"
  netWork: string; // API code like "BEP20(BSC)" - used for withdrawal requests
  withdrawFee: string;
  minWithdraw: string;
  withdrawEnabled: boolean;
}

export interface CoinInfo {
  coin: string;
  name: string;
  networks: NetworkInfo[];
}
