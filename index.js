const { app, BrowserWindow, session, dialog, ipcMain } = require('electron')
const path = require('node:path');
const fs = require('fs');
const createWindow = () => {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: 'assets/img/colorInverterIcon.ico',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
    // expose window controls in Windows/Linux
    ...(process.platform !== 'darwin' ? { titleBarOverlay: true } : {})
  })
  
    // win.removeMenu();
    win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
}
})

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"]
  });

  if (result.canceled) {
    return { filePath: null };
  }

  return { filePath: result.filePaths[0] };
});

ipcMain.handle("save-image", async (event, filePath, base64Data) => {
  try {
    fs.writeFileSync(filePath, base64Data, "base64");
    return { success: true };
  } catch (error) {
    console.error("Failed to save image:", error);
    return { success: false, error: error.message };
  }
});
