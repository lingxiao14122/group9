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
            width: 1100,
            height: 850,
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

      var localDBExist = fs.existsSync(path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName));
      var localDBChecksumExist = fs.existsSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName));

      try {

            if (!localDBExist && !localDBChecksumExist) {
                  logger.info("checkLocalDBIntegrityChannel: Creating new local database and checksum value...");

                  var createResult = await database.createDatabase(0, path.join(path.dirname(app.getPath("exe")), "./database.sqlite"));
                  if (createResult.result === "success") {
                        fs.writeFileSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName), createResult.checksum);
                  } else {
                        fs.writeFileSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName), "");
                  }

                  logger.info("checkLocalDBIntegrityChannel: Successful create new local database and checksum value");
                  event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "success" });
            } else {

                  if (!localDBExist || !localDBChecksumExist) {
                        logger.warn("checkLocalDBIntegrityChannel: local database or database checksum file are missing, recreating new database and checksum...");

                        if (localDBExist) {
                              logger.warn("checkLocalDBIntegrityChannel: local database exist, backing up database and create new database and checksum");
                              var renameResult = await database.renameDatabase(path.dirname(app.getPath("exe")));
                              var createResult = await database.createDatabase(0, path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName));

                              fs.writeFileSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName), "");
                        } else {
                              var createResult = await database.createDatabase(0, path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName));

                              fs.writeFileSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName), "");
                        }

                        logger.info("checkLocalDBIntegrityChannel: Successful create new database and checksum");
                        event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 1, reason: "Database checksum not same.", solution: "Old database has backed up and recreated." });

                  } else {

                        var hash = fs.readFileSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName), "utf-8");

                        var databaseBuffer = fs.readFileSync(path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName));
                        var databaseChecksum = crypto.createHash("sha256");
                        databaseChecksum.update(databaseBuffer);

                        if (hash !== databaseChecksum.digest("hex")) {
                              logger.warn("checkLocalDBIntegrityChannel: Database checksum are different, backup old one and creating new database...");
                              var renameResult = await database.renameDatabase(path.dirname(app.getPath("exe")));
                              var createResult = await database.createDatabase(0, path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName));

                              fs.writeFileSync(path.join(path.dirname(app.getPath("exe")), "./" + localDatabase.databaseChecksumName), createResult.checksum);
                              event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 1, reason: "Database checksum not same.", solution: "Old database has backed up and recreated." });
                        } else {
                              logger.info("checkLocalDBIntegrityChannel: Successful checking local database integrity");
                              event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "success" });
                        }

                  }

            }

      } catch (error) {

            if(typeof error === "object"){
                  logger.error("checkLocalDBIntegrityChannel: Failed getting " + localDatabase.databaseChecksumName + " file: \n" + JSON.stringify(error));
            } else {
                  logger.error("checkLocalDBIntegrityChannel: Failed getting " + localDatabase.databaseChecksumName + " file: \n" + error);
            }
            
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
                  var databaseBuffer;
                  var databasePath = path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName);

                  try {
                        databaseBuffer = fs.readFileSync(databasePath);

                        var checkResult = await folderDatabase.checkFolderDatabaseAndFolder(result.filePaths.toString());

                        if (checkResult.result === "success") {
                              var insertResult = await localDatabase.insertLocalDatabaseFolder(databasePath, databaseBuffer, process.platform == 'win32' ? path.win32.basename(result.filePaths.toString()) : path.posix.basename(result.filePaths.toString()), result.filePaths, checkResult.databaseChecksum);
                              var changeResult = await localDatabase.updateLocalDatabaseChecksum();

                              if (insertResult.result === "warn") {
                                    logger.warn("readFolderPathChannel: Folder already exist in local database, path: " + result.filePaths);
                                    event.reply("READ_FOLDER_PATH", { result: "warn", reason: insertResult.reason });
                              } else {
                                    logger.info("readFolderPathChannel: Successful insert folder path into local database: " + result.filePaths);
                                    event.reply("READ_FOLDER_PATH", { result: "success" });
                              }
                        } else {
                              logger.error("readFolderPathChannel: Failed inserting folder path into local database: \n" + result.reason);
                              event.reply("READ_FOLDER_PATH", { result: "error", reason: result.reason });
                        }

                  } catch (error) {

                        if(typeof error === "object"){
                              logger.error("readFolderPathChannel: Failed inserting folder path into local database: \n" + JSON.stringify(error));
                        } else {
                              logger.error("readFolderPathChannel: Failed inserting folder path into local database: \n" + error);
                        }
                        
                        event.reply("READ_FOLDER_PATH", { result: "error", reason: error });
                  }

            }
      });

});

ipcMain.on("GET_ALL_FOLDER", async (event, payload) => {

      logger.info("getAllFolderChannel: Getting all folder from local database...");
      var databaseBuffer;
      var databasePath = path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName);

      try {
            databaseBuffer = fs.readFileSync(databasePath);

            initSqlJs().then(async (SQL) => {
                  var result = [];
                  const db = new SQL.Database(databaseBuffer);

                  const statement = db.prepare(localDatabase.selectAllFolderLocalDb);

                  while (statement.step()) {
                        var row = statement.getAsObject();
                        result.push(row);
                  }

                  db.close();

                  logger.info("getAllFolderChannel: Successfull get all folder from local database");
                  event.reply("GET_ALL_FOLDER", { result: "success", items: result });
            });

      } catch (error) {

            if(typeof error === "object"){
                  logger.error("getAllFolderChannel: Failed getting all folder from local database: \n" + JSON.stringify(error));
            } else {
                  logger.error("getAllFolderChannel: Failed getting all folder from local database: \n" + error);
            }

            event.reply("GET_ALL_FOLDER", { result: "error", reason: error });
      }

});

ipcMain.on("DELETE_FOLDER", async (event, payload) => {

      if (payload._id === undefined || payload._id === null || Number.isNaN(payload._id)) {
            logger.error("deleteFolderChannel: Failed delete folder path in local database. Reason: Unknown folder id.");
            event.reply("DELETE_FOLDER", { result: "error", code: 1, reason: "Unknown folder id." });
      } else {
            logger.info("deleteFolderChannel: Deleting folder path in local database, id: " + payload._id);
            var databaseBuffer;
            var databasePath = path.join(path.dirname(app.getPath("exe")), database.databaseName);

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  var deleteResult = await localDatabase.deleteLocalDatabaseFolder(databasePath, databaseBuffer, payload._id);
                  var changeResult = await localDatabase.updateLocalDatabaseChecksum();

                  logger.info("deleteFolderChannel: Successful delete folder path in local database, id: " + payload._id);
                  event.reply("DELETE_FOLDER", { result: "success" });
            } catch (error) {

                  if(typeof error === "object"){
                        logger.error("deleteFolderChannel: Failed delete folder in local database, id: " + payload._id + "\n" + JSON.stringify(error));
                  } else {
                        logger.error("deleteFolderChannel: Failed delete folder in local database, id: " + payload._id + "\n" + error);
                  }
                  
                  event.reply("DELETE_FOLDER", { result: "error", code: 2, reason: error });
            }
      }

});

ipcMain.on("INSERT_NEW_DEFECT", async (event, payload) => {

      if (payload.defect_name === undefined || payload.defect_name === null) {
            logger.error("insertNewDefectChannel: Failed Insert new defect category. Reason: defect name are undefined.");
            event.reply("INSERT_NEW_DEFECT", { result: "error", code: 1, reason: "Defect name are undefined." });
      } else {
            logger.info("insertNewDefectChannel: Inserting new defect category into local database...");
            var databaseBuffer;
            var databasePath = path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName);

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  var insertResult = await localDatabase.insertLocalDatabaseDefect(databasePath, databaseBuffer, payload.defect_name);
                  var changeResult = await localDatabase.updateLocalDatabaseChecksum();

                  if (insertResult.result === "warn") {
                        logger.warn("insertNewDefectChannel: Defect category already exist in local database, name: " + payload.defect_name);
                        event.reply("INSERT_NEW_DEFECT", { result: "warn", reason: insertResult.reason });
                  } else {
                        logger.info("insertNewDefectChannel: Successful insert new defect category into local database. Name: " + payload.defect_name);
                        event.reply("INSERT_NEW_DEFECT", { result: "success", });
                  }
            } catch (error) {

                  if(typeof error === "object"){
                        logger.error("insertNewDefectChannel: Failed inserting new defect category into local database: \n" + JSON.stringify(error));
                  } else {
                        logger.error("insertNewDefectChannel: Failed inserting new defect category into local database: \n" + error);
                  }
                  
                  event.reply("INSERT_NEW_DEFECT", { result: "error", reason: error });
            }

      }

});

ipcMain.on("GET_ALL_DEFECT", async (event, payload) => {

      logger.info("getAllDefectChannel: Getting defect categories from local database...");
      var databaseBuffer;
      var databasePath = path.join(path.dirname(app.getPath("exe")), "./" + database.databaseName);

      try {
            databaseBuffer = fs.readFileSync(databasePath);

            initSqlJs().then((SQL) => {
                  var result = [];
                  const db = new SQL.Database(databaseBuffer);

                  const statement = db.prepare(localDatabase.selectAllDefectLocalDb);

                  while (statement.step()) {
                        var row = statement.getAsObject();
                        result.push(row);
                  }

                  db.close();

                  logger.info("getAllDefectChannel: Successful get all defect categories from local database");
                  event.reply("GET_ALL_DEFECT", { result: "success", items: result })
            });

      } catch (error) {

            if(typeof error === "object"){
                  logger.error("getAllDefectChannel: Failed getting defect categories from local database: \n" + JSON.stringify(error));
            } else {
                  logger.error("getAllDefectChannel: Failed getting defect categories from local database: \n" + error);
            }
            
            event.reply("GET_ALL_DEFECT", { result: "error", reason: error });
      }

});

ipcMain.on("DELETE_DEFECT", async (event, payload) => {

      if (payload._id === undefined || payload._id === null || Number.isNaN(payload._id)) {
            logger.error("deleteDefectChannel: Failed delete defect category in local database. Reason: Unknown defect category id.");
            event.reply("DELETE_DEFECT", { result: "error", code: 1, reason: "Unknown defect category id." });
      } else {
            logger.info("deleteDefectChannel: Deleting defect category in local database, id: " + payload._id);
            var databaseBuffer;
            var databasePath = path.join(path.dirname(app.getPath("exe")), database.databaseName);

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  var deleteResult = localDatabase.deleteLocalDatabaseDefect(databasePath, databaseBuffer, payload._id);
                  var changeResult = await localDatabase.updateLocalDatabaseChecksum();

                  logger.info("deleteDefectChannel: Successful delete defect category in local database, id: " + payload._id);
                  event.reply("DELETE_DEFECT", { result: "success" });
            } catch (error) {
                  
                  if(typeof error === "object"){
                        logger.error("deleteDefectChannel: Failed delete defect category in local database, id: " + payload._id + "\n" + JSON.stringify(error));
                  } else {
                        logger.error("deleteDefectChannel: Failed delete defect category in local database, id: " + payload._id + "\n" + error);
                  }

                  event.reply("DELETE_FOLDER", { result: "error", code: 2, reason: error })
            }

      }

});

ipcMain.on("GET_IMAGES", async (event, payload) => {

      if (payload.folder_id === undefined || payload.folder_id === null || Number.isNaN(payload.folder_id)) {
            logger.error("getImagesChannel: Failed getting all images. Reason: Unknown folder_id.");
            event.reply("GET_IMAGES", { result: "error", code: 2, reason: "Unknown folder_id." });
      } else {
            logger.info("getImagesChannel: Getting all images from folder database. folder_id: " + payload.folder_id);

            try {
                  var getResult = await localDatabase.getFolderInfoFromLocalDB(payload.folder_id);
                  var checkIntegrityResult = await folderDatabase.checkFolderDbIntegrity(getResult.item[0].path, getResult.item[0].checksum);

                  if (checkIntegrityResult.result === "success") {
                        var scanResult = await folderDatabase.scanFolderImages(getResult.item[0].path);
                        var updateResult = await folderDatabase.updateFolderDatabaseChecksum(getResult.item[0]._id, scanResult.checksum);
                        var changeResult = await localDatabase.updateLocalDatabaseChecksum();
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

                  if(error.result === "error" && error.code === 1){
                        logger.warn("getImagesChannel: Folder database Integrity not complete. Reason: " + error.reason);
                        logger.info("getImagesChannel: Recreating new folder database and checking necessary folders..., path: " + getResult.item[0].path);
                        var checkResult = await folderDatabase.checkFolderDatabaseAndFolder(getResult.item[0].path, true);
                        var updateResult = await folderDatabase.updateFolderDatabaseChecksum(getResult.item[0]._id, checkResult.databaseChecksum);
                  } else {

                        if(typeof error === "object"){
                              logger.error("getImagesChannel: Failed getting all images failed. Reason: " + JSON.stringify(error));
                        } else {
                              logger.error("getImagesChannel: Failed getting all images failed. Reason: " + error);
                        }

                        event.reply("GET_IMAGES", { result: "error", code: 3, reason: JSON.stringify(error) });
                  }

            }

      }

});

ipcMain.on("CHECK_IMAGE_AVAILABILITY", (event, payload) => {

      if (payload.image === null || payload.image === undefined || Number.isNaN(payload.image)) {
            logger.error("checkImageAvailabilityChannel: Failed checking image availability. Reason: Unknown Image info.");
            event.reply("CHECK_IMAGE_AVAILABILITY", { result: "error", code: 1, reason: "Unknown Image info." });
      } else {
            logger.info("checkImageAvailabilityChannel: Checking image availability, image path: " + payload.image.path);

            if (fs.existsSync(payload.image.path)) {
                  logger.info("checkImageAvailabilityChannel: Successful check image availability, image path: " + payload.image.path);
                  event.reply("CHECK_IMAGE_AVAILABILITY", { result: "success", exist: true, direction: payload.direction });
            } else {
                  logger.warn("checkImageAvailabilityChannel: Image are not exist in the folder path, image path: " + payload.image.path);
                  event.reply("CHECK_IMAGE_AVAILABILITY", { result: "warn", exist: false, direction: payload.direction });
            }
      }

});

ipcMain.on("UPDATE_IMAGE_STATUS", async (event, payload) => {

      if (payload.folder_id === undefined || payload.folder_id === null || Number.isNaN(payload.folder_id)) {
            logger.error("updateImageStatusChannel: Failed updating image status. Reason: UUnknown folder_id.");
            event.reply("UPDATE_IMAGE_STATUS", { result: "error", code: 1, reason: "Unknown folder_id." })
      } else if (payload.image_id === undefined || payload.image_id === null || Number.isNaN(payload.image_id)) {
            logger.error("updateImageStatusChannel: Failed updating image status. Reason: Unknown image_id.");
            event.reply("UPDATE_IMAGE_STATUS", { result: "error", code: 1, reason: "Unknown image_id." });
      } else if (payload.image_name === undefined || payload.image_name === null || Number.isNaN(payload.image_name)){
            logger.error("updateImageStatusChannel: Failed updating image status. Reason: Unknown image_name.");
            event.reply("UPDATE_IMAGE_STATUS", { result: "error", code: 1, reason: "Unknown image_name." });
      } else if (payload.image_status === undefined || payload.image_status === null || typeof payload.image_status !== "object") {
            logger.error("updateImageStatusChannel: Failed updating image status. Reason: Unknown image_status.");
            event.reply("UPDATE_IMAGE_STATUS", { result: "error", code: 1, reason: "Unknown image_status." });
      } else {

            logger.info("updateImageStatusChannel: Updating image status...");

            try {
                  var getFolderResult = await localDatabase.getFolderInfoFromLocalDB(payload.folder_id);
                  var checkIntegrityResult = await folderDatabase.checkFolderDbIntegrity(getFolderResult.item[0].path, getFolderResult.item[0].checksum);

                  var updateResult = await folderDatabase.updateImageStatus(getFolderResult.item[0].path, payload.image_id, payload.image_name, payload.image_status);
                  var updateChecksumResult = await folderDatabase.updateFolderDatabaseChecksum(getFolderResult.item[0]._id, updateResult.checksum);
                  var changeResult = await localDatabase.updateLocalDatabaseChecksum();
                  logger.info("updateImageStatusChannel: Successful update image status.");
                  event.reply("UPDATE_IMAGE_STATUS", { result: "success", image_status: payload.image_status });
                  

            } catch (error) {

                  if(typeof error === "object"){
                        logger.error("updateImageStatusChannel: Failed updating image status. \n" + JSON.stringify(error));
                  } else {
                        logger.error("updateImageStatusChannel: Failed updating image status. \n" + error);
                  }

                  event.reply("UPDATE_IMAGE_STATUS", { result: "error", code: 2, reason: error });
            }

      }

});

ipcMain.on("TEST", (event, payload) => {

});