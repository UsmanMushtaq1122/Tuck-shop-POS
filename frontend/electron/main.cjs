const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const { spawn } = require('child_process');

log.initialize();
log.info('Application starting...');

let mainWindow;
let serverProcess = null;

function startBackendServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '../../backend/index.js');
    const env = { ...process.env, NODE_ENV: app.isPackaged ? 'production' : 'development' };

    serverProcess = spawn('node', [serverPath], { env, stdio: 'pipe' });

    serverProcess.stdout.on('data', (data) => {
      log.info(`[Server] ${data.toString().trim()}`);
      if (data.toString().includes('Server running')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      log.error(`[Server] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (error) => {
      log.error('Failed to start backend server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      log.info(`Backend server exited with code ${code}`);
    });

    setTimeout(() => resolve(), 5000);
  });
}

function stopBackendServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    log.info('Backend server stopped');
  }
}

function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    frame: true,
    backgroundColor: '#0F172A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5176');
    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      if (validatedURL.startsWith('http://localhost:5176')) {
        log.info('Vite dev server not ready. Retrying...');
        setTimeout(() => {
          if (mainWindow) {
            mainWindow.loadURL('http://localhost:5176');
          }
        }, 1000);
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  log.info('Window created successfully');
}

ipcMain.on('print-receipt', (event, receipt) => {
  log.info('Printing receipt...');
  const printWindow = new BrowserWindow({
    show: false,
    width: 400,
    height: 600,
    webPreferences: { nodeIntegration: true },
  });

  printWindow.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(`
    <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
          pre { margin: 0; white-space: pre-wrap; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body><pre>${receipt}</pre></body>
    </html>
  `));

  printWindow.webContents.on('did-finish-load', () => {
    printWindow.webContents.print({ silent: true }, (success) => {
      log.info(`Print ${success ? 'successful' : 'failed'}`);
      setTimeout(() => printWindow.close(), 1000);
    });
  });
});

ipcMain.handle('get-platform', () => process.platform);
ipcMain.handle('is-packaged', () => app.isPackaged);

app.whenReady().then(async () => {
  if (!app.isPackaged) {
    try {
      await startBackendServer();
    } catch (error) {
      log.error('Backend server failed to start:', error);
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackendServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackendServer();
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
