'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBitcoin, FaShieldAlt, FaBolt, FaUsers, FaFileImport, FaFileExport } from 'react-icons/fa';
import { SiMxlinux } from 'react-icons/si';
import { useState, useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const [hasMexcConfig, setHasMexcConfig] = useState(false);
  const [hasCoinexConfig, setHasCoinexConfig] = useState(false);

  useEffect(() => {
    // Check if there are saved configs in session storage
    setHasMexcConfig(!!sessionStorage.getItem('mexc_api_key'));
    setHasCoinexConfig(!!sessionStorage.getItem('coinex_access_id'));
  }, []);

  const handleExportMexcConfig = () => {
    const apiKey = sessionStorage.getItem('mexc_api_key');
    const apiSecret = sessionStorage.getItem('mexc_api_secret');

    if (!apiKey || !apiSecret) {
      alert('No MEXC configuration found. Please connect to MEXC first.');
      return;
    }

    const config = {
      apiKey,
      apiSecret,
      withdrawals: [],
      exportDate: new Date().toISOString(),
      exchange: 'MEXC',
    };

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mexc-config-${Date.now()}.json`;
    a.click();
  };

  const handleExportCoinexConfig = () => {
    const accessId = sessionStorage.getItem('coinex_access_id');
    const secretKey = sessionStorage.getItem('coinex_secret_key');

    if (!accessId || !secretKey) {
      alert('No CoinEx configuration found. Please connect to CoinEx first.');
      return;
    }

    const config = {
      accessId,
      secretKey,
      withdrawals: [],
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

  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const config = JSON.parse(text);

        if (!config.exchange) {
          alert('Invalid config file. Missing exchange information.');
          return;
        }

        // Store config temporarily for the target page to pick up
        sessionStorage.setItem('pending_import_config', text);

        // Redirect to appropriate exchange page
        if (config.exchange === 'MEXC') {
          router.push('/mexc');
        } else if (config.exchange === 'CoinEx') {
          router.push('/coinex');
        } else {
          alert('Unknown exchange: ' + config.exchange);
        }
      } catch (error: any) {
        alert('Failed to read config file: ' + error.message);
      }
    };
    input.click();
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaBitcoin className="text-3xl text-orange-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Crypto Withdrawal Tool
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleImportConfig}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <FaFileImport /> Import
                </button>
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <FaFileExport /> Export
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <button
                      onClick={handleExportMexcConfig}
                      disabled={!hasMexcConfig}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 disabled:text-gray-400 disabled:cursor-not-allowed first:rounded-t-lg"
                    >
                      Export MEXC Config
                    </button>
                    <button
                      onClick={handleExportCoinexConfig}
                      disabled={!hasCoinexConfig}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 disabled:text-gray-400 disabled:cursor-not-allowed last:rounded-b-lg"
                    >
                      Export CoinEx Config
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FaShieldAlt className="text-green-600" />
                <span className="hidden sm:inline">100% Client-Side</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Bulk Withdraw Your Crypto
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Safely & Efficiently
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Client-side bulk withdrawal tool for MEXC and CoinEx exchanges.
            Your API keys never leave your browser.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FaShieldAlt className="text-2xl text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">100% Secure</h3>
            <p className="text-gray-600">
              All operations run in your browser. Your API credentials are never sent to any server.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FaBolt className="text-2xl text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Bulk Actions</h3>
            <p className="text-gray-600">
              Withdraw to multiple addresses at once. Save time with CSV uploads or manual entry.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FaUsers className="text-2xl text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Exchange</h3>
            <p className="text-gray-600">
              Support for MEXC and CoinEx exchanges with more coming soon.
            </p>
          </div>
        </div>

        {/* Exchange Cards */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* MEXC Card */}
          <Link href="/mexc">
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <SiMxlinux className="text-3xl text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">MEXC</h3>
                  <p className="text-gray-500">Global Crypto Exchange</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Access your MEXC account, view balances, and withdraw to multiple addresses on-chain.
              </p>
              <div className="flex items-center text-blue-600 font-medium group-hover:gap-3 gap-2 transition-all">
                <span>Get Started</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>

          {/* CoinEx Card */}
          <Link href="/coinex">
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <FaBitcoin className="text-3xl text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">CoinEx</h3>
                  <p className="text-gray-500">Professional Trading Platform</p>
                </div>
              </div>
              <p className="text-gray-600 mb-6">
                Manage your CoinEx portfolio, check balances, and execute bulk withdrawals with ease.
              </p>
              <div className="flex items-center text-purple-600 font-medium group-hover:gap-3 gap-2 transition-all">
                <span>Get Started</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Security Notice */}
        <div className="mt-16 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
          <div className="flex gap-4">
            <FaShieldAlt className="text-3xl text-yellow-600 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Security Notice</h4>
              <ul className="text-gray-700 space-y-1">
                <li>• Your API keys are stored only in your browser&apos;s session storage</li>
                <li>• All API requests are made directly from your browser to the exchange</li>
                <li>• No data is sent to or stored on any third-party server</li>
                <li>• Always ensure you&apos;re using API keys with withdrawal permissions only</li>
                <li>• Enable IP whitelisting on your API keys for extra security</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            Open-source crypto withdrawal tool. Your keys, your crypto, your control.
          </p>
        </div>
      </footer>
    </div>
  );
}
