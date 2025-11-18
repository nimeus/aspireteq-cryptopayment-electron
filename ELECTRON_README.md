# Crypto Withdrawal App - Electron Desktop Application

This is a desktop application for managing crypto withdrawals on MEXC and CoinEx exchanges. Built with Next.js and Electron, it runs locally on your machine and uses your IP address for API calls, supporting IP whitelisting.

## Features

- ✅ **Local Execution**: Runs on your machine, uses your real IP address
- ✅ **IP Whitelisting Support**: Works with exchange API keys that have IP restrictions
- ✅ **No CORS Issues**: Desktop app bypasses browser CORS restrictions
- ✅ **Secure**: API credentials stored only in session storage, never sent to external servers
- ✅ **Bulk Withdrawals**: Send crypto to multiple addresses at once
- ✅ **CSV Export**: Export withdrawal results for record-keeping
- ✅ **Multi-Exchange**: Supports MEXC and CoinEx

## Prerequisites

- Node.js 18 or higher
- npm or yarn

## Installation

```bash
# Install dependencies
npm install
```

## Running in Development Mode

```bash
# Start the Electron app in development mode
# This will start Next.js dev server and open Electron window
npm run electron:dev
```

The development mode allows you to:
- See live changes as you modify code
- Use Chrome DevTools for debugging
- Test the app before building

## Building for Production

Build the desktop application for your operating system:

### Build for Your Current OS (Automatic)
```bash
npm run electron:build
```

### Build for Specific Platforms

**Windows (creates installer .exe):**
```bash
npm run electron:build:win
```

**macOS (creates .dmg):**
```bash
npm run electron:build:mac
```

**Linux (creates .AppImage and .deb):**
```bash
npm run electron:build:linux
```

Built applications will be in the `dist/` folder.

## How to Use

### MEXC Exchange

1. Open the app
2. Click on "MEXC Exchange"
3. Enter your MEXC API credentials:
   - API Key
   - API Secret
4. Click "Load Balance" to see your account balances
5. Select a coin and network
6. Add withdrawal addresses and amounts
7. Click "Withdraw to X Address(es)" to process

### CoinEx Exchange

1. Open the app
2. Click on "CoinEx Exchange"
3. Enter your CoinEx API credentials:
   - Access ID
   - Secret Key
4. Click "Load Balance" to see your account balances
5. Select a coin and network
6. Add withdrawal addresses and amounts
7. Click "Withdraw to X Address(es)" to process

## Security Notes

- ⚠️ **Never share your API keys** with anyone
- ⚠️ **API credentials are stored only in browser session storage** (cleared when app closes)
- ⚠️ Enable IP whitelisting on your exchange API keys for added security
- ⚠️ Test with small amounts first
- ⚠️ Double-check addresses before withdrawing

## API Permissions Required

### MEXC
Your API key needs these permissions:
- Read account balances
- Withdraw funds

### CoinEx
Your API key needs these permissions:
- Read account balances
- Withdraw funds

## Project Structure

```
├── app/                    # Next.js pages
│   ├── page.tsx           # Landing page
│   ├── mexc/page.tsx      # MEXC withdrawal page
│   └── coinex/page.tsx    # CoinEx withdrawal page
├── lib/                    # API utilities
│   ├── mexc-api.ts        # MEXC API integration
│   ├── coinex-api.ts      # CoinEx API integration
│   └── types.ts           # TypeScript types
├── electron/               # Electron configuration
│   └── main.js            # Electron main process
├── out/                    # Next.js static build output
└── dist/                   # Electron build output
```

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### App won't start in development
Make sure port 3000 is not in use:
```bash
# Kill any process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
# Then try again
npm run electron:dev
```

### Build fails
Make sure you have:
- Latest Node.js (18+)
- All dependencies installed
- No antivirus blocking electron-builder

## Building for Distribution

The built applications are **not code-signed** by default. Users may see security warnings when first running the app.

To code-sign (requires certificates):
- **Windows**: Use a code signing certificate
- **macOS**: Use Apple Developer ID
- **Linux**: Generally doesn't require signing

## Support

For issues or questions, check:
- MEXC API Docs: https://mexcdevelop.github.io/apidocs/
- CoinEx API Docs: https://docs.coinex.com/api/v2

## License

This is a private application for personal use.
