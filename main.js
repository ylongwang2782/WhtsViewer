const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { SerialPort } = require('serialport');
const path = require('path');
const dgram = require('dgram');

let mainWindow;
let serialPort = null;
let udpSocket = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // 隐藏菜单栏
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('dist/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Serial port operations
ipcMain.handle('listPorts', async () => {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      description: port.manufacturer || port.friendlyName || port.pnpId || ''
    }));
  } catch (error) {
    console.error('Error listing ports:', error);
    return [];
  }
});

ipcMain.handle('openPort', async (event, { path, baudRate }) => {
  try {
    if (serialPort) {
      await serialPort.close();
    }
    serialPort = new SerialPort({ path, baudRate: parseInt(baudRate) });
    
    serialPort.on('data', (data) => {
      mainWindow.webContents.send('serial-data', data);
    });

    serialPort.on('error', (err) => {
      console.error('Error:', err);
      mainWindow.webContents.send('serial-error', err.message);
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('closePort', async () => {
  try {
    if (serialPort) {
      await serialPort.close();
      serialPort = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('send-data', async (event, { data, isHex }) => {
  try {
    if (!serialPort) {
      throw new Error('Serial port not opened');
    }

    let buffer;
    if (isHex) {
      // Convert hex string to buffer
      buffer = Buffer.from(data.replace(/\s/g, ''), 'hex');
    } else {
      buffer = Buffer.from(data);
    }

    await serialPort.write(buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 添加打开外部链接的处理
ipcMain.handle('openExternal', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 添加写入串口数据的方法
ipcMain.handle('writePort', async (event, data) => {
  try {
    if (!serialPort || !serialPort.isOpen) {
      throw new Error('串口未打开');
    }
    
    await serialPort.write(Buffer.from(data));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// UDP 相关操作
ipcMain.handle('createUdpSocket', async (event, { localPort, remoteIp, remotePort }) => {
  try {
    // 如果已存在socket，先关闭
    if (udpSocket) {
      udpSocket.close();
      udpSocket = null;
    }

    // 创建新的UDP socket
    udpSocket = dgram.createSocket('udp4');

    // 绑定本地端口
    await new Promise((resolve, reject) => {
      udpSocket.bind(localPort, () => {
        resolve();
      });

      udpSocket.on('error', (error) => {
        reject(error);
      });
    });

    // 设置远程地址信息
    udpSocket.remoteIp = remoteIp;
    udpSocket.remotePort = remotePort;

    // 监听数据
    udpSocket.on('message', (msg, rinfo) => {
      mainWindow.webContents.send('udp-data', {
        data: msg,
        rinfo: rinfo
      });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('closeUdpSocket', async () => {
  try {
    if (udpSocket) {
      udpSocket.close();
      udpSocket = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('sendUdpData', async (event, data) => {
  try {
    if (!udpSocket) {
      throw new Error('UDP socket not created');
    }

    await new Promise((resolve, reject) => {
      udpSocket.send(Buffer.from(data), udpSocket.remotePort, udpSocket.remoteIp, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}); 