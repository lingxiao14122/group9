const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const url = require("url");
const path = require("path");

const fs = require('fs');

let mainWindow

function createWindow() {
      mainWindow = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                  nodeIntegration: false,
                  contextIsolation: true,
                  enableRemoteModule: false,
                  preload: path.join(__dirname, "./preload.js")
            }
      })

      mainWindow.loadURL(
            url.format({
                  pathname: path.join(__dirname, `./dist/index.html`),
                  protocol: "file:",
                  slashes: true
            })
      );
      mainWindow.on('closed', function () {
            mainWindow = null
      })
}
console.log(app);
app.on('ready', createWindow)

app.on('window-all-closed', function () {
      if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
      if (mainWindow === null) createWindow()
})

ipcMain.on('READ_FOLDER_PATH', (event, payload) => {
      console.log(payload);
      dialog.showOpenDialog({
            title: "Select a folder",
            properties: ["openDirectory"],
      }).then(result => {
            if(result.canceled){
                  console.log(result.canceled);
                  event.reply(null);
            } else {
                  console.log(result.filePaths);
                  event.reply("READ_FOLDER_PATH", { result });
            }
      });
})