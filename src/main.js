const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
    frame: false,
    backgroundColor: '#ffffff'
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle tab creation
ipcMain.on('new-tab', (event, url) => {
  const tabWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true
    },
    frame: false,
    backgroundColor: '#ffffff'
  });

  tabWindow.loadURL(url || 'file://' + __dirname + '/renderer/homepage.html');

  tabWindow.on('closed', () => {
    tabWindow = null;
  });

  event.reply('tab-created', tabWindow.id);
});

// Handle bookmark operations
ipcMain.on('add-bookmark', (event, url, title) => {
    const bookmarks = store.get('bookmarks') || [];
    // Check if bookmark already exists
    if (!bookmarks.some(b => b.url === url)) {
        bookmarks.push({ url, title, date: new Date().toISOString() });
        store.set('bookmarks', bookmarks);
    }
    event.reply('bookmark-added');
});

ipcMain.on('get-bookmarks', (event) => {
    const bookmarks = store.get('bookmarks') || [];
    event.reply('bookmarks-list', bookmarks);
});

ipcMain.on('delete-bookmark', (event, url) => {
    const bookmarks = store.get('bookmarks') || [];
    const updatedBookmarks = bookmarks.filter(b => b.url !== url);
    store.set('bookmarks', updatedBookmarks);
    event.reply('bookmark-deleted');
});

ipcMain.on('load-url', (event, url) => {
    event.reply('url-to-load', url);
});

// Handle window controls
ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow.close();
});

// Handle settings window
let settingsWindow = null;

// Forward settings updates to main window
ipcMain.on('settings-updated', (event, settings) => {
  mainWindow.webContents.send('settings-updated', settings);
});

ipcMain.on('open-settings', () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'renderer/settings.html'));

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
});

// Handle history operations
ipcMain.on('add-history', (event, url, title) => {
  const history = store.get('history') || [];
  history.push({ url, title, date: new Date().toISOString() });
  store.set('history', history);
});

ipcMain.on('get-history', (event) => {
  const history = store.get('history') || [];
  event.reply('history-list', history);
});