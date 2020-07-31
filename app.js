const path = require('path');
const { app, session, BrowserWindow, Menu, MenuItem } = require('electron');

let serverReady = false;
let electronReady = false;
let mainWindowCreated = false;
let window;

console.log('creating child process');
const { fork } = require('child_process');
const serverProcess = fork(path.join(__dirname, './server/app.js'), ['args'], {
  env: {
    'ELECTRON_RUN_AS_NODE': '1',
    'PORT': '9000',
    'APP_NAME': 'synthona',
    'CLIENT_URL': 'http://localhost:9000',
    'JWT_SECRET': 'sdlkasfhi5235hjh',
    'REFRESH_TOKEN_SECRET': 'asdkjkasdfhaskfh',
    'PRODUCTION': 'false',
    'VERSION': '1.0',
  },
});

serverProcess.on('message', (message) => {
  if (message === 'server-started') {
    console.log('server started');
    serverReady = true;
    if (serverReady && electronReady && !mainWindowCreated) {
      mainWindowCreated = true;
      window.reload();
    }
  } else {
    console.log(message);
  }
});

serverProcess.on('exit', (code, sig) => {
  // finishing`
  console.log('goodbye');
});

serverProcess.on('error', (error) => {
  console.log(error);
});

const mainWindow = () => {
  console.log('creating window');
  // Create the browser window.
  window = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      spellcheck: true,
      enableRemoteModule: false,
    },
    show: false,
  });
  // clear storage data
  // window.webContents.session.clearStorageData();
  // add the spellcheck context-menu
  window.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    // add emoji picker
    menu.append(
      new MenuItem({
        label: 'emoji',
        click: () => app.showEmojiPanel(),
      })
    );

    // Add each spelling suggestion
    for (const suggestion of params.dictionarySuggestions) {
      menu.append(
        new MenuItem({
          label: suggestion,
          click: () => window.webContents.replaceMisspelling(suggestion),
        })
      );
    }
    // Allow users to add the misspelled word to the dictionary
    if (params.misspelledWord) {
      menu.append(
        new MenuItem({
          label: 'Add to dictionary',
          click: () =>
            window.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        })
      );
    }

    menu.popup();
  });
  // match the background color to the app theme
  window.setBackgroundColor('#272727');
  window.loadURL('http://localhost:9000');

  electronReady = true;
  if (serverReady && electronReady && !mainWindowCreated) {
    mainWindowCreated = true;
    window.show();
  }

  // Open the DevTools.
  // window.webContents.openDevTools();
};
// disable hardware acceleration to prevent rendering bug
app.disableHardwareAcceleration();
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', mainWindow);
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', () => {
  console.log('app is ready');
  // session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  //   callback({
  //     responseHeaders: {
  //       ...details.responseHeaders,
  //       'Content-Security-Policy': ["default-src 'self'; img-src *; object-src 'none';"],
  //     },
  //   });
  // });
});

app.on('before-quit', () => {
  console.log('before quit');
  serverProcess.kill('SIGINT');
});

app.on('activate', () => {
  console.log('activate');
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    // createLoadingWindow();
    console.log('create temporary window here');
  }
});
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
