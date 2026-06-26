const { app, BrowserWindow } = require('electron');
const path = require('path');

// Enable hardware acceleration and force high-performance GPU rasterization
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Register custom protocol client for deep-linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('farmaal', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('farmaal');
}

let mainWindow = null;

// Force single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      
      // Extract deep link from command line arguments (Windows)
      const url = commandLine.find(arg => arg.startsWith('farmaal://'));
      if (url) {
        handleDeepLinkUrl(url);
      }
    }
  });

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 780,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, 'public/logo.png'),
    autoHideMenuBar: true, // hides the menu bar (Alt to show)
  });

  // Open external links in the default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Parse the protocol URL on startup (Windows command line arguments)
  const url = process.argv.find(arg => arg.startsWith('farmaal://'));
  if (url) {
    mainWindow.webContents.once('did-finish-load', () => {
      handleDeepLinkUrl(url);
    });
  }
}

function handleDeepLinkUrl(urlStr) {
  try {
    // URL format: farmaal://auth?token=XYZ or farmaal://auth/?token=XYZ
    const match = urlStr.match(/[?&]token=([^&]+)/);
    if (match && match[1] && mainWindow) {
      const token = match[1];
      mainWindow.webContents.executeJavaScript(`
        if (window.handleDeepLinkToken) {
          window.handleDeepLinkToken("${token}");
        }
      `).catch(err => console.error("Failed to execute deep link JS:", err));
    }
  } catch (e) {
    console.error("Error parsing deep link URL:", e);
  }
}

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
