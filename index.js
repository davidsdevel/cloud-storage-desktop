const {updateAuthFile, getConfigData, login, existsAuthFile} = require('./lib/auth');
const {startSync} = require('./lib/sync');
const {app, BrowserWindow, ipcMain} = require('electron');
const {join} = require('path');

async function initSync(mainWindow) {
  const {socket} = await startSync();
    
  socket.on('storage:update', size => mainWindow.webContents.send('update-storage', size))
}

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

  ipcMain.handle('isLogged', async () => {
    const {token} = await getConfigData();

    return token; 
  });

  ipcMain.handle('login', async (_, {email, password}) => {
    try {
      const data = await login(email, password);

      if (!data)
        return null;

      await updateAuthFile(data);

      initSync(mainWindow);

      return data.token;
    } catch(err) {
      return null;
    }
  });

  const {token} = await getConfigData();

  if (token)
    initSync(mainWindow);

  mainWindow.loadFile(join(__dirname, 'static/index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().lenght === 0)
      createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit();
})