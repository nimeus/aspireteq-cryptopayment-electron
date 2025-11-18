const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;
let nextServer;
let logFile;
let serverPort = 3000; // Track the port the server is running on

// Single instance lock - prevent multiple instances from running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Safe logging function that checks if file is writable
function safeLog(...args) {
  const message = args.join(' ');
  console.log(message);
  if (logFile && !logFile.destroyed && logFile.writable) {
    logFile.write(`[LOG] ${new Date().toISOString()}: ${message}\n`);
  }
}

function safeError(...args) {
  const message = args.join(' ');
  console.error(message);
  if (logFile && !logFile.destroyed && logFile.writable) {
    logFile.write(`[ERROR] ${new Date().toISOString()}: ${message}\n`);
  }
}

// Enable logging to file in production
if (!isDev) {
  const logPath = path.join(app.getPath('userData'), 'app.log');
  logFile = fs.createWriteStream(logPath, { flags: 'a' });

  safeLog('='.repeat(80));
  safeLog('Application started at:', new Date().toISOString());
  safeLog('Log file created at:', logPath);
  safeLog('App version:', app.getVersion());
  safeLog('Electron version:', process.versions.electron);
  safeLog('Node version:', process.versions.node);
  safeLog('Is packaged:', app.isPackaged);
  safeLog('='.repeat(80));
}

function createWindow() {
  safeLog('Creating window...');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
      devTools: true,
    },
    icon: path.join(__dirname, '../public/icon.png'),
    title: 'Crypto Withdrawal App',
  });

  // Open dev tools in production if ELECTRON_DEBUG is set
  if (!isDev && process.env.ELECTRON_DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  // Load the app
  if (isDev) {
    safeLog('Loading development server at http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Start Next.js server in production
    safeLog('Starting Next.js server in production mode...');
    startNextServer()
      .then((port) => {
        serverPort = port;
        safeLog(`Next.js server started successfully on port ${port}, loading app...`);
        mainWindow.loadURL(`http://localhost:${port}`);
      })
      .catch((error) => {
        safeError('Failed to start server:', error);
        dialog.showErrorBox(
          'Startup Error',
          `Failed to start the application server:\n\n${error.message}\n\nCheck the log file at:\n${app.getPath('userData')}\\app.log`
        );
        app.quit();
      });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  return new Promise((resolve, reject) => {
    const isPackaged = app.isPackaged;

    // Find the correct app path
    let appPath;
    if (isPackaged) {
      const possiblePaths = [
        path.join(process.resourcesPath, 'app.asar.unpacked'),
        path.join(process.resourcesPath, 'app'),
        path.dirname(app.getAppPath()),
      ];

      for (const p of possiblePaths) {
        safeLog('Checking path:', p);
        if (fs.existsSync(p)) {
          const nextDir = path.join(p, '.next');
          if (fs.existsSync(nextDir)) {
            appPath = p;
            safeLog('Found .next directory at:', nextDir);
            break;
          }
        }
      }

      if (!appPath) {
        safeError('Could not find .next directory in any expected location');
        reject(new Error('Next.js build files not found. Please rebuild the application.'));
        return;
      }
    } else {
      appPath = path.join(__dirname, '..');
    }

    safeLog('Using app path:', appPath);
    safeLog('Is packaged:', isPackaged);

    const nextBuildDir = path.join(appPath, '.next');
    if (!fs.existsSync(nextBuildDir)) {
      safeError('.next directory not found at:', nextBuildDir);
      reject(new Error('Next.js build not found. Run "npm run build" first.'));
      return;
    }

    // Find the Node.js binary
    let nodePath;
    if (process.platform === 'win32') {
      const possibleNodePaths = [
        path.join(process.resourcesPath, 'node.exe'),
        path.join(path.dirname(process.execPath), 'node.exe'),
        'node',
      ];
      
      for (const p of possibleNodePaths) {
        if (p === 'node' || fs.existsSync(p)) {
          nodePath = p;
          break;
        }
      }
    } else {
      nodePath = 'node';
    }

    const nextBin = path.join(appPath, 'node_modules', 'next', 'dist', 'bin', 'next');

    safeLog('Node path:', nodePath);
    safeLog('Next.js binary:', nextBin);

    if (!fs.existsSync(nextBin)) {
      safeError('Next.js binary not found at:', nextBin);
      reject(new Error('Next.js installation not found in bundled app.'));
      return;
    }

    // Try starting on different ports if 3000 is busy
    function tryStartServer(port, attempt = 1) {
      if (attempt > 5) {
        reject(new Error('Could not find an available port after 5 attempts'));
        return;
      }

      safeLog(`Starting Next.js server on port ${port} (attempt ${attempt})...`);

      let spawnCommand;
      let spawnArgs;
      
      if (process.platform === 'win32' && nodePath === 'node') {
        spawnCommand = 'node';
        spawnArgs = [nextBin, 'start', '-p', port.toString()];
      } else {
        spawnCommand = nodePath;
        spawnArgs = [nextBin, 'start', '-p', port.toString()];
      }

      safeLog('Spawn command:', spawnCommand, spawnArgs.join(' '));

      const serverProcess = spawn(spawnCommand, spawnArgs, {
        cwd: appPath,
        env: { ...process.env, NODE_ENV: 'production' },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
        shell: process.platform === 'win32',
      });

      let serverStarted = false;
      let outputBuffer = '';
      let retrying = false;

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        safeLog('Next.js stdout:', output.trim());

        if ((output.includes('Ready') || output.includes('started server') || output.includes('Local:')) && !serverStarted) {
          serverStarted = true;
          nextServer = serverProcess; // Save the successful server process
          safeLog(`? Next.js server is ready on port ${port}!`);
          setTimeout(() => resolve(port), 1500);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const output = data.toString();
        
        // Check if port is in use
        if (output.includes('EADDRINUSE') && !serverStarted && !retrying) {
          retrying = true;
          safeLog(`Port ${port} is in use, trying next port...`);
          serverProcess.kill();
          // Try next port
          setTimeout(() => tryStartServer(port + 1, attempt + 1), 500);
          return;
        }

        safeError('Next.js stderr:', output.trim());
        if (output.includes('Error') || output.includes('error')) {
          outputBuffer += output;
        }
      });

      serverProcess.on('error', (error) => {
        safeError('Failed to spawn Next.js process:', error);
        if (!serverStarted && !retrying) {
          reject(new Error(`Failed to start Next.js: ${error.message}`));
        }
      });

      serverProcess.on('exit', (code, signal) => {
        safeLog(`Next.js server process exited with code ${code} and signal ${signal}`);
        if (!serverStarted && !retrying) {
          safeError('Server output buffer:', outputBuffer);
          reject(new Error(`Next.js server exited with code ${code}. ${outputBuffer}`));
        } else if (serverStarted) {
          // Server was running but stopped
          safeError('Next.js server stopped unexpectedly!');
          if (mainWindow) {
            dialog.showErrorBox(
              'Server Stopped',
              'The application server stopped unexpectedly. The app will now close.'
            );
            app.quit();
          }
        }
      });

      // Longer timeout for slower systems
      setTimeout(() => {
        if (!serverStarted && !retrying) {
          safeLog('Timeout reached after 10 seconds');
          safeLog('Server output so far:', outputBuffer);
          safeLog('Attempting to connect anyway...');
          serverStarted = true;
          nextServer = serverProcess;
          resolve(port);
        }
      }, 10000);
    }

    // Start trying from port 3000
    tryStartServer(3000);
  });
}

app.whenReady().then(() => {
  safeLog('Electron app is ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  safeLog('All windows closed');
  // Kill the Next.js server
  if (nextServer && !nextServer.killed) {
    safeLog('Killing Next.js server...');
    try {
      nextServer.kill('SIGTERM');

      // Force kill if it doesn't stop
      setTimeout(() => {
        if (nextServer && !nextServer.killed) {
          safeLog('Force killing Next.js server...');
          nextServer.kill('SIGKILL');
        }
      }, 2000);
    } catch (error) {
      safeError('Error killing server:', error);
    }
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  safeLog('App is quitting...');
  // Ensure Next.js server is killed
  if (nextServer && !nextServer.killed) {
    safeLog('Before quit: Killing Next.js server...');
    try {
      nextServer.kill('SIGTERM');
    } catch (error) {
      safeError('Error killing server on quit:', error);
    }
  }

  // Close log file
  if (logFile && !logFile.destroyed) {
    safeLog('Closing log file...');
    logFile.end();
  }
});

// Log unhandled errors
process.on('uncaughtException', (error) => {
  safeError('Uncaught exception:', error);
  if (!app.isQuitting) {
    dialog.showErrorBox('Application Error', error.message);
  }
});

app.on('will-quit', () => {
  if (logFile && !logFile.destroyed && logFile.writable) {
    logFile.end();
  }
});