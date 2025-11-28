const { shell } = require('electron');
const { app, BrowserWindow, session, dialog, ipcMain } = require('electron');
const os = require('os');
const path = require('node:path');
const fs = require('fs');
const { execFile } = require('child_process');
// Expose temp file path logic to renderer via IPC
ipcMain.handle('get-temp-file-path', (event, filename) => {
  return path.join(os.tmpdir(), filename);
});
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
  
    // win.removeMenu(); // HIDE MENU BAR
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

// AI Upscale handler
ipcMain.handle('upscale-image', async (event, inputPath, outputPath, modelName = 'realesrgan-x4plus') => {
  try {
    return await new Promise((resolve) => {
      // Handle path resolution for both dev and packaged (production) environments
      const isPackaged = app.isPackaged;
      const basePath = isPackaged
        ? path.join(process.resourcesPath, 'upscaler-bin')
        : path.join(__dirname, 'upscaler-bin');
      const exePath = path.join(basePath, 'realesrgan-ncnn-vulkan.exe');
      const modelDir = path.join(basePath, 'models');
      const args = [
        '-i', inputPath,
        '-o', outputPath,
        '-n', modelName,
        '-m', modelDir
      ];
      execFile(exePath, args, (error, stdout, stderr) => {
        if (error) {
          resolve({ success: false, error: stderr ? String(stderr) : String(error) });
        } else {
          resolve({ success: true, outputPath: String(outputPath) });
        }
      });
    });
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

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

ipcMain.handle('delete-temp-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    } else {
      return { success: false, error: 'File does not exist' };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Open external links in user's default browser
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});
