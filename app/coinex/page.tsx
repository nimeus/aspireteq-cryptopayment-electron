'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaKey, FaWallet, FaPaperPlane, FaPlus, FaTrash, FaDownload, FaCheckCircle, FaTimesCircle, FaBitcoin, FaFileExport, FaFileImport } from 'react-icons/fa';
import { Balance, WithdrawalRequest, WithdrawalResult, CoinInfo } from '@/lib/types';

export default function CoinexPage() {
  const [accessId, setAccessId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [coins, setCoins] = useState<CoinInfo[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balanceError, setBalanceError] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<WithdrawalResult[]>([]);

  // Generate default remark with current date/time
  const generateDefaultRemark = () => {
    return new Date().toLocaleString();
  };

  useEffect(() => {
    const savedAccessId = sessionStorage.getItem('coinex_access_id');
    const savedSecretKey = sessionStorage.getItem('coinex_secret_key');
    if (savedAccessId && savedSecretKey) {
      setAccessId(savedAccessId);
      setSecretKey(savedSecretKey);
      setIsAuthenticated(true);
    }

    // Check for pending import from home page
    const pendingImport = sessionStorage.getItem('pending_import_config');
    if (pendingImport) {
      try {
        const config = JSON.parse(pendingImport);
        if (config.exchange === 'CoinEx') {
          // Restore API credentials
          if (config.accessId && config.secretKey) {
            setAccessId(config.accessId);
            setSecretKey(config.secretKey);
            sessionStorage.setItem('coinex_access_id', config.accessId);
            sessionStorage.setItem('coinex_secret_key', config.secretKey);
            setIsAuthenticated(true);
          }
          // Restore withdrawals
          if (config.withdrawals && Array.isArray(config.withdrawals)) {
            setWithdrawals(config.withdrawals);
          }
          // Remove pending import
          sessionStorage.removeItem('pending_import_config');
          alert('Configuration imported successfully!');
        }
      } catch (error) {
        console.error('Failed to import pending config:', error);
      }
    }
  }, []);

  // Initialize first withdrawal when balances and coins are loaded
  useEffect(() => {
    if (balances.length > 0 && coins.length > 0 && withdrawals.length === 0) {
      const firstCoin = balances[0].coin;
      const networks = coins.find(c => c.coin === firstCoin)?.networks || [];
      const firstNetwork = networks.length > 0 ? networks[0].network : '';

      setWithdrawals([{
        coin: firstCoin,
        network: firstNetwork,
        address: '',
        amount: '',
        remark: generateDefaultRemark()
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balances, coins]);

  // Update withdrawal networks when coins are loaded
  useEffect(() => {
    if (coins.length > 0 && withdrawals.length > 0) {
      const updated = withdrawals.map(w => {
        const networks = getNetworksForCoin(w.coin);
        // If current network doesn't exist, reset to first available
        const hasMatch = networks.some(n => n.network === w.network);
        if (!hasMatch && networks.length > 0) {
          return { ...w, network: networks[0].network };
        }
        return w;
      });
      setWithdrawals(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins]);

  const handleConnect = async () => {
    if (!accessId || !secretKey) {
      setBalanceError('Please enter both Access ID and Secret Key');
      return;
    }
    sessionStorage.setItem('coinex_access_id', accessId);
    sessionStorage.setItem('coinex_secret_key', secretKey);
    setIsAuthenticated(true);
    await fetchBalance();
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('coinex_access_id');
    sessionStorage.removeItem('coinex_secret_key');
    setAccessId('');
    setSecretKey('');
    setIsAuthenticated(false);
    setBalances([]);
    setCoins([]);
    setWithdrawals([]);
  };

  const fetchBalance = async () => {
    setLoadingBalances(true);
    setBalanceError('');
    try {
      const credentials = { apiKey: accessId, apiSecret: secretKey };
      const [balanceRes, coinsRes] = await Promise.all([
        fetch('/api/coinex/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        }),
        fetch('/api/coinex/coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        }),
      ]);

      if (!balanceRes.ok || !coinsRes.ok) {
        const error = await balanceRes.json().catch(() => ({ error: 'Failed to fetch data' }));
        throw new Error(error.error || 'Failed to fetch data');
      }

      const balanceData = await balanceRes.json();
      const coinData = await coinsRes.json();

      setBalances(balanceData);
      setCoins(coinData);
    } catch (error: any) {
      setBalanceError(error.message || 'Failed to fetch balance');
    } finally {
      setLoadingBalances(false);
    }
  };

  const addWithdrawal = () => {
    // Use the coin from the last withdrawal, or default to first balance if no withdrawals exist
    const lastWithdrawal = withdrawals[withdrawals.length - 1];
    const coinToUse = lastWithdrawal ? lastWithdrawal.coin : (balances.length > 0 ? balances[0].coin : 'USDT');

    // Get first available network for the selected coin
    const networks = getNetworksForCoin(coinToUse);
    const defaultNetwork = networks.length > 0
      ? networks[0].network
      : '';

    setWithdrawals([...withdrawals, { coin: coinToUse, network: defaultNetwork, address: '', amount: '', remark: generateDefaultRemark() }]);
  };

  const removeWithdrawal = (index: number) => {
    setWithdrawals(withdrawals.filter((_, i) => i !== index));
  };

  const updateWithdrawal = (index: number, field: keyof WithdrawalRequest, value: string) => {
    const updated = [...withdrawals];
    updated[index] = { ...updated[index], [field]: value };

    // If coin changes, reset network to first available network for that coin
    if (field === 'coin') {
      const networks = getNetworksForCoin(value);
      if (networks.length > 0) {
        updated[index].network = networks[0].network;
      }
    }

    setWithdrawals(updated);
  };

  const getNetworksForCoin = (coinName: string) => {
    const coin = coins.find(c => c.coin === coinName);
    return coin?.networks || [];
  };

  const handleWithdraw = async () => {
    const invalid = withdrawals.some(w => !w.address || !w.amount || parseFloat(w.amount) <= 0);
    if (invalid) {
      alert('Please fill all fields with valid data');
      return;
    }
    if (!confirm(`Are you sure you want to withdraw to ${withdrawals.length} address(es)?`)) {
      return;
    }
    setProcessing(true);
    setResults([]);
    try {
      const response = await fetch('/api/coinex/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: accessId, apiSecret: secretKey, withdrawals }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to process withdrawals' }));
        throw new Error(error.error || 'Failed to process withdrawals');
      }

      const results = await response.json();
      setResults(results);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const exportResults = () => {
    const csv = [
      ['Address', 'Coin', 'Amount', 'Network', 'Status', 'TX ID', 'Error'].join(','),
      ...results.map(r =>
        [
          r.address,
          r.coin,
          r.amount,
          withdrawals.find(w => w.address === r.address)?.network || '',
          r.success ? 'Success' : 'Failed',
          r.txId || '',
          r.error || '',
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coinex-withdrawals-${Date.now()}.csv`;
    a.click();
  };

  const exportConfig = () => {
    const config = {
      accessId,
      secretKey,
      withdrawals,
      exportDate: new Date().toISOString(),
      exchange: 'CoinEx',
    };
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coinex-config-${Date.now()}.json`;
    a.click();
  };

  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        if (config.exchange !== 'CoinEx') {
          alert('Invalid config file. This file is not for CoinEx.');
          return;
        }

        // Restore API credentials
        if (config.accessId && config.secretKey) {
          setAccessId(config.accessId);
          setSecretKey(config.secretKey);
          sessionStorage.setItem('coinex_access_id', config.accessId);
          sessionStorage.setItem('coinex_secret_key', config.secretKey);
          setIsAuthenticated(true);
        }

        // Restore withdrawals
        if (config.withdrawals && Array.isArray(config.withdrawals)) {
          setWithdrawals(config.withdrawals);
        }

        alert('Configuration imported successfully!');

        // Reload balance if authenticated
        if (config.accessId && config.secretKey) {
          await fetchBalance();
        }
      } catch (error: any) {
        alert('Failed to import config: ' + error.message);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <FaArrowLeft className="text-xl" />
              </Link>
              <div className="flex items-center gap-2">
                <FaBitcoin className="text-3xl text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">CoinEx Withdrawal</h1>
              </div>
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <button onClick={importConfig} className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg">
                  <FaFileImport /> Import
                </button>
                <button onClick={exportConfig} className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg">
                  <FaFileExport /> Export
                </button>
                <button onClick={handleDisconnect} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg">
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthenticated ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <FaKey className="text-2xl text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Connect to CoinEx</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access ID</label>
                  <input
                    type="text"
                    value={accessId}
                    onChange={(e) => setAccessId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="Enter your CoinEx Access ID"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="Enter your CoinEx Secret Key"
                  />
                </div>
                {balanceError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {balanceError}
                  </div>
                )}
                <button
                  onClick={handleConnect}
                  disabled={!accessId || !secretKey}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Connect & Load Balance
                </button>
              </div>
              <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-purple-900">
                  <strong>Note:</strong> Your API credentials are stored only in your browser&apos;s session storage.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FaWallet className="text-2xl text-purple-600" />
                  <h2 className="text-2xl font-bold text-gray-900">Your Balance</h2>
                </div>
                <button
                  onClick={fetchBalance}
                  disabled={loadingBalances}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300"
                >
                  {loadingBalances ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              {balanceError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                  {balanceError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {balances.length === 0 && !loadingBalances && (
                  <p className="text-gray-500 col-span-full">No balances found or still loading...</p>
                )}
                {balances.map((balance) => (
                  <div key={balance.coin} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-lg">{balance.coin}</span>
                      <span className="text-sm text-gray-500">Available</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{parseFloat(balance.free).toFixed(8)}</div>
                    {parseFloat(balance.locked) > 0 && (
                      <div className="text-sm text-gray-500 mt-1">
                        Locked: {parseFloat(balance.locked).toFixed(8)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <FaPaperPlane className="text-2xl text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Bulk Withdrawal</h2>
              </div>
              <div className="space-y-4">
                {withdrawals.map((withdrawal, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Coin</label>
                        <select
                          value={withdrawal.coin}
                          onChange={(e) => updateWithdrawal(index, 'coin', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        >
                          {balances.map(b => (
                            <option key={b.coin} value={b.coin}>{b.coin}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
                        <select
                          value={withdrawal.network}
                          onChange={(e) => updateWithdrawal(index, 'network', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        >
                          {getNetworksForCoin(withdrawal.coin).map(n => (
                            <option key={n.network} value={n.network}>
                              {n.network} (Fee: {n.withdrawFee}, Min: {n.minWithdraw})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <input
                          type="text"
                          value={withdrawal.address}
                          onChange={(e) => updateWithdrawal(index, 'address', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                          placeholder="Withdrawal address"
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                          <input
                            type="number"
                            step="0.00000001"
                            value={withdrawal.amount}
                            onChange={(e) => updateWithdrawal(index, 'amount', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                            placeholder="0.00"
                          />
                        </div>
                        {withdrawals.length > 1 && (
                          <button
                            onClick={() => removeWithdrawal(index)}
                            className="mt-auto px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Remark (Optional)</label>
                      <input
                        type="text"
                        value={withdrawal.remark || ''}
                        onChange={(e) => updateWithdrawal(index, 'remark', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                        placeholder="Default: current date/time"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={addWithdrawal}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <FaPlus /> Add Address
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={processing || withdrawals.length === 0}
                  className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {processing ? 'Processing...' : `Withdraw to ${withdrawals.length} Address(es)`}
                </button>
              </div>
            </div>

            {results.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Withdrawal Results</h2>
                  <button
                    onClick={exportResults}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <FaDownload /> Export CSV
                  </button>
                </div>
                <div className="space-y-3">
                  {results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-2 ${
                        result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <FaCheckCircle className="text-2xl text-green-600 flex-shrink-0 mt-1" />
                        ) : (
                          <FaTimesCircle className="text-2xl text-red-600 flex-shrink-0 mt-1" />
                        )}
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">
                            {result.amount} {result.coin} to {result.address.slice(0, 10)}...{result.address.slice(-8)}
                          </div>
                          {result.success && result.txId && (
                            <div className="text-sm text-gray-600">TX ID: {result.txId}</div>
                          )}
                          {!result.success && result.error && (
                            <div className="text-sm text-red-600">{result.error}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
