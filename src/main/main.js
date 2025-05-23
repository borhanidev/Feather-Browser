// Add to top with other imports
const { nativeTheme, ipcMain } = require('electron');

// Add these handlers in createWindow() or similar
ipcMain.handle('get-system-theme', () => nativeTheme.shouldUseDarkColors);
nativeTheme.on('updated', () => {
  mainWindow.webContents.send('system-theme-changed', nativeTheme.shouldUseDarkColors);
});