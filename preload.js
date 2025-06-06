const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listPorts: () => ipcRenderer.invoke('listPorts'),
  openPort: (options) => ipcRenderer.invoke('openPort', options),
  closePort: () => ipcRenderer.invoke('closePort'),
  writePort: (data) => ipcRenderer.invoke('writePort', data),
  onSerialData: (callback) => ipcRenderer.on('serial-data', callback),
  removeSerialDataListener: () => ipcRenderer.removeAllListeners('serial-data'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  createUdpSocket: (options) => ipcRenderer.invoke('createUdpSocket', options),
  closeUdpSocket: () => ipcRenderer.invoke('closeUdpSocket'),
  sendUdpData: (data) => ipcRenderer.invoke('sendUdpData', data),
  onUdpData: (callback) => ipcRenderer.on('udp-data', callback),
  removeUdpDataListener: () => ipcRenderer.removeAllListeners('udp-data')
}); 