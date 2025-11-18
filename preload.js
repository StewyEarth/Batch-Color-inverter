const { contextBridge, ipcRenderer } = require('electron')
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  saveImage: (filePath, base64Data) => ipcRenderer.invoke('save-image', filePath, base64Data),
});