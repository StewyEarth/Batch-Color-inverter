const { contextBridge, ipcRenderer, shell } = require('electron')
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveImage: (filePath, base64Data) => ipcRenderer.invoke('save-image', filePath, base64Data),
  upscaleImage: (inputPath, outputPath, modelName) => ipcRenderer.invoke('upscale-image', inputPath, outputPath, modelName),
  getTempFilePath: (filename) => ipcRenderer.invoke('get-temp-file-path', filename),
  deleteTempFile: (filePath) => ipcRenderer.invoke('delete-temp-file', filePath),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
});