const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const url = require("url");
const path = require("path");
const fs = require('fs');

const crypto = require("crypto");

const initSqlJs = require('sql.js/dist/sql-wasm');

const logger = require("./utils/logger");
const database = require('./utils/databaseUtils');
const localDatabase = require("./utils/localDatabaseUtils");
const folderDatabase = require('./utils/folderDatabaseUtils');

let mainWindow

function createWindow() {
      mainWindow = new BrowserWindow({
            width: 1000,
            height: 700,
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
      logger.info("Main Window created and showed");
}
app.on('ready', createWindow)

app.on('window-all-closed', function () {
      logger.info("App quitting...");
      if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
      if (mainWindow === null) createWindow()
})

ipcMain.on("CHECK_LOCAL_DB_INTEGRITY", async (event, payload) => {
      logger.info("checkLocalDBIntegrityChannel: Checking local database integrity...");
      
      var localDBExist = fs.existsSync(path.join(app.getAppPath(), "./" + database.databaseName));
      var localDBChecksumExist = fs.existsSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName));

      try {

            if (!localDBExist && !localDBChecksumExist) {
                  logger.info("checkLocalDBIntegrityChannel: Creating new local database and checksum value...");

                  var createResult = await database.createDatabase(0, path.join(app.getAppPath(), "./database.sqlite"));
                  if (createResult.result === "success") {
                        fs.writeFileSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName), createResult.checksum);
                  } else {
                        fs.writeFileSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName), "");
                  }

                  logger.info("checkLocalDBIntegrityChannel: Successful create new local database and checksum value");
                  event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "success" });
            } else {

                  if (!localDBExist || !localDBChecksumExist) {
                        logger.warn("checkLocalDBIntegrityChannel: local database or database checksum file are missing, recreating new database and checksum...");

                        if (localDBExist) {
                              logger.warn("checkLocalDBIntegrityChannel: local database exist, backing up database and create new database and checksum");
                              var renameResult = await database.renameDatabase(app.getAppPath());
                              var createResult = await database.createDatabase(0, path.join(app.getAppPath(), "./" + database.databaseName));

                              fs.writeFileSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName), "");
                        } else {
                              var createResult = await database.createDatabase(0, path.join(app.getAppPath(), "./" + database.databaseName));

                              fs.writeFileSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName), "");
                        }

                        logger.info("checkLocalDBIntegrityChannel: Successful create new database and checksum");
                        event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 1, reason: "Database checksum not same.", solution: "Old database has backed up and recreated." });

                  } else {

                        var hash = fs.readFileSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName), "utf-8");

                        var databaseBuffer = fs.readFileSync(path.join(app.getAppPath(), "./" + database.databaseName));
                        var databaseChecksum = crypto.createHash("sha256");
                        databaseChecksum.update(databaseBuffer);

                        if (hash !== databaseChecksum.digest("hex")) {
                              logger.warn("checkLocalDBIntegrityChannel: Database checksum are different, backup old one and creating new database...");
                              var renameResult = await database.renameDatabase(app.getAppPath());
                              var createResult = await database.createDatabase(0, path.join(app.getAppPath(), "./" + database.databaseName));

                              fs.writeFileSync(path.join(app.getAppPath(), "./" + localDatabase.databaseChecksumName), createResult.checksum);
                              event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 1, reason: "Database checksum not same.", solution: "Old database has backed up and recreated." });
                        } else {
                              logger.info("checkLocalDBIntegrityChannel: Successful checking local database integrity");
                              event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "success" });
                        }

                  }

            }

      } catch (error) {
            logger.error("checkLocalDBIntegrityChannel: Failed getting " + localDatabase.databaseChecksumName + " file: \n" + error);
            event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 2, reason: error });
      }

});

ipcMain.on("READ_FOLDER_PATH", async (event, payload) => {

      logger.info("readFolderPathChannel: User selecting folder path");

      dialog.showOpenDialog({
            title: "Select a folder",
            properties: ["openDirectory"],
      }).then(async result => {
            if (result.canceled) {
                  logger.info("readFolderAndImage: Canceled selecting folder path");
                  event.reply("READ_FOLDER_PATH", { result: "canceled" });
            } else {
                  logger.info("readFolderAndImage: User selected folder path: " + result.filePaths);
                  var fileBuffer;
                  var databasePath = path.join(app.getAppPath(), database.databaseName);

                  try {
                        fileBuffer = fs.readFileSync(databasePath);

                        var checkResult = await folderDatabase.checkFolderDatabaseAndFolder(result.filePaths.toString());

                        if (checkResult.result === "success") {
                              var insertResult = await localDatabase.insertLocalDatabaseFolder(databasePath, fileBuffer, process.platform == 'win32' ? path.win32.basename(result.filePaths.toString()) : path.posix.basename(result.filePaths.toString()), result.filePaths, checkResult.databaseChecksum);
                              var changeResult = await localDatabase.updateLocalDatabaseChecksum();

                              if(insertResult.result === "warn"){
                                    logger.warn("readFolderPathChannel: Folder already exist in local database, path: " + result.filePaths);
                                    event.reply("READ_FOLDER_PATH", { result: "warn", reason: insertResult.reason });
                              } else {
                                    logger.info("readFolderPathChannel: Folder path saved: " + result.filePaths);
                                    event.reply("READ_FOLDER_PATH", { result: "success" });
                              }
                        } else {
                              logger.error("readFolderPathChannel: Error inserting folder data: \n" + result.reason);
                              event.reply("READ_FOLDER_PATH", { result: "error", reason: result.reason });
                        }

                  } catch (error) {
                        logger.error("readFolderPathChannel: Error inserting folder data: \n" + error);
                        event.reply("READ_FOLDER_PATH", { result: "error", reason: error });
                  }

            }
      });

});

ipcMain.on("GET_ALL_FOLDER", async (event, payload) => {

      logger.info("getAllFolderChannel: Getting all folder from local database");
      var fileBuffer;
      var databasePath = path.join(app.getAppPath(), database.databaseName);

      try {
            fileBuffer = fs.readFileSync(databasePath);

            initSqlJs().then(async (SQL) => {
                  var result = [];
                  const db = new SQL.Database(fileBuffer);

                  const statement = db.prepare(localDatabase.selectAllFolderLocalDb);

                  while (statement.step()) {
                        var row = statement.getAsObject();
                        result.push(row);
                  }

                  db.close();

                  logger.info("getAllFolderChannel: Got all folder from local database");
                  event.reply("GET_ALL_FOLDER", { result: "success", items: result });
            });

      } catch (error) {
            logger.warn("getAllFolderChannel: Getting all folder from local database failed: \n" + error);
            event.reply("GET_ALL_FOLDER", { result: "error", reason: error });
      }

});

ipcMain.on("DELETE_FOLDER", async (event, payload) => {

      logger.info("deleteFolderChannel: Deleting folder _id: " + payload._id);
      var fileBuffer;
      var databasePath = path.join(app.getAppPath(), database.databaseName);

      try {
            fileBuffer = fs.readFileSync(databasePath);

            var deleteResult = await localDatabase.deleteLocalDatabaseFolder(databasePath, fileBuffer, payload._id);
            var changeResult = await localDatabase.updateLocalDatabaseChecksum();

            logger.info("deleteFolderChannel: Deleting folder successful");
            event.reply("DELETE_FOLDER", { result: "success" });
      } catch (error) {
            logger.error("deleteFolderChannel: Delete folder failed: \n" + error);
            event.reply("DELETE_FOLDER", { result: "error", reason: error });
      }

});

ipcMain.on("GET_IMAGES", async (event, payload) => {

      if (payload.folder_id === undefined || payload.folder_id === null) {
            logger.error("getImagesChannel: Getting all images failed. Reason: unknown folder_id.");
            event.reply("GET_IMAGES", { result: "error", code: 2, reason: "Unknown folder_id" });
      } else {
            logger.info("getImagesChannel: Getting all images from folder database. folder_id: " + payload.folder_id);

            try {
                  var getResult = await localDatabase.getFolderInfoFromLocalDB(payload.folder_id);
                  var checkIntegrityResult = await folderDatabase.checkFolderDbIntegrity(getResult.item[0].path, getResult.item[0].checksum);

                  if (checkIntegrityResult.result === "success") {
                        var scanResult = await folderDatabase.scanFolderImages(getResult.item[0].path);
                        var updateResult = await folderDatabase.updateFolderDatabaseChecksum(getResult.item[0]._id, scanResult.checksum);
                        if (getResult.result === "success" && scanResult.result === "success") {
                              var imagesResult = await folderDatabase.getAllImages(getResult.item[0].path);

                              var reply = {
                                    result: "success",
                                    folderInfo: getResult.item[0],
                                    imagesItem: imagesResult.items,
                              };

                              logger.info("getImagesChannel: Getting all images success, folder_id: " + payload.folder_id);
                              event.reply("GET_IMAGES", reply);
                        }
                  }

            } catch (error) {

                  if (error.result === "error") {
                        logger.warn("getImagesChannel: Folder database Integrity not complete, reason: " + error.reason);
                        logger.info("getImagesChannel: Recreating new folder database and checking necessary folders..., path: " + getResult.item[0].path);
                        var checkResult = await folderDatabase.checkFolderDatabaseAndFolder(getResult.item[0].path, true);
                        var updateResult = await folderDatabase.updateFolderDatabaseChecksum(getResult.item[0]._id, checkResult.databaseChecksum);

                        logger.info("getImagesChannel: Recreated new folder database and checking necessary folders..., path: " + getResult.item[0].path);
                        event.reply("GET_IMAGES", { result: "error", code: 1, reason: error.reason, solution: "Recreated Folder Database and checked necessary folders." });
                  } else {
                        logger.error("getImagesChannel: Getting all images failed. Reason: " + JSON.stringify(error));
                        event.reply("GET_IMAGES", { result: "error", code: 3, reason: JSON.stringify(error) });
                  }
            }

      }

});

ipcMain.on("TEST", (event, payload) => {

});