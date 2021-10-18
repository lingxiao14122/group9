const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const url = require("url");
const path = require("path");

const fs = require('fs');

const crypto = require("crypto");

const initSqlJs = require('sql.js/dist/sql-wasm');

const databaseName = "database.sqlite";
const databaseChecksumName = "database_checksum.dat";

const createLocalDb = " \
                        CREATE TABLE folder_location (_id INTEGER PRIMARY KEY, name TEXT, path TEXT, date_created TEXT, checksum TEXT, soft_delete INTEGER); \
                        CREATE TABLE defect_category (_id INTEGER PRIMARY KEY, name TEXT, date_created TEXT, soft_delete INTEGER); \
                        ";

const createFolderDb = " \
                        CREATE TABLE images (_id INTEGER PRIMARY KEY, name TEXT, path TEXT, status INTEGER, defect_name TEXT, date_created TEXT); \
                        ";

const selectAllFolderLocalDb = " \
                        SELECT * FROM folder_location WHERE soft_delete = 0; \
                        ";

const selectAllImagesFolderDb = " \
                        SELECT * FROM images; \
                        ";

const folderIgnoreFilesName = [
      "appdata",
      "passed",
      "failed"
];

const folderImagesFileTypes = [
      ".png",
      ".jpg",
      ".jpeg",
      ".bmp",
];

const imageStatus = {
      pending: 0,
      pass: 1,
      failed: 2,
}

const log = require("electron-log");
log.transports.file.level = "info";
log.transports.file.file = path.join(app.getAppPath(), "./log/log-" + getCurrentDateTimeNumber() + ".log");
log.catchErrors();

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
      log.info("Main Window created and showed");
}
app.on('ready', createWindow)

app.on('window-all-closed', function () {
      log.info("App quitting...");
      if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
      if (mainWindow === null) createWindow()
})

ipcMain.on("CHECK_LOCAL_DB_INTEGRITY", async (event, payload) => {
      log.info("checkLocalDBIntegrityChannel: Checking local database integrity...");

      var localDBExist = fs.existsSync(path.join(app.getAppPath(), "./" + databaseName));
      var localDBChecksumExist = fs.existsSync(path.join(app.getAppPath(), "./" + databaseChecksumName));

      try {

            if (!localDBExist && !localDBChecksumExist) {
                  log.info("checkLocalDBIntegrityChannel: Creating new local database and checksum value...");

                  var createResult = await createDatabase(0, path.join(app.getAppPath(), "./database.sqlite"));
                  if (createResult.result === "success") {
                        fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), createResult.checksum);
                  } else {
                        fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), "");
                  }

                  log.info("checkLocalDBIntegrityChannel: Successful create new local database and checksum value");
                  event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "success" });
            } else {

                  if (!localDBExist || !localDBChecksumExist) {
                        log.warn("checkLocalDBIntegrityChannel: local database or database checksum file are missing, recreating new database and checksum...");

                        if (localDBExist) {
                              log.warn("checkLocalDBIntegrityChannel: local database exist, backing up database and create new database and checksum");
                              var renameResult = await renameDatabase(app.getAppPath());
                              var createResult = await createDatabase(0, path.join(app.getAppPath(), "./" + databaseName));

                              fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), "");
                        } else {
                              var createResult = await createDatabase(0, path.join(app.getAppPath(), "./" + databaseName));

                              fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), "");
                        }

                        log.info("checkLocalDBIntegrityChannel: Successful create new database and checksum");
                        event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 1, reason: "Database checksum not same.", solution: "Old database has backed up and recreated." });

                  } else {

                        var hash = fs.readFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), "utf-8");

                        var databaseBuffer = fs.readFileSync(path.join(app.getAppPath(), "./" + databaseName));
                        var databaseChecksum = crypto.createHash("sha256");
                        databaseChecksum.update(databaseBuffer);

                        if (hash !== databaseChecksum.digest("hex")) {
                              log.warn("checkLocalDBIntegrityChannel: Database checksum are different, backup old one and creating new database...");
                              var renameResult = await renameDatabase(app.getAppPath());
                              var createResult = await createDatabase(0, path.join(app.getAppPath(), "./" + databaseName));

                              fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), createResult.checksum);
                              event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 1, reason: "Database checksum not same.", solution: "Old database has backed up and recreated." });
                        } else {
                              log.info("checkLocalDBIntegrityChannel: Successful checking local database integrity");
                              event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "success" });
                        }

                  }

            }

      } catch (error) {
            log.error("checkLocalDBIntegrityChannel: Failed getting " + databaseChecksumName + " file: \n" + error);
            event.reply("CHECK_LOCAL_DB_INTEGRITY", { result: "error", code: 2, reason: error });
      }

});

ipcMain.on("READ_FOLDER_PATH", async (event, payload) => {

      log.info("readFolderPathChannel: User selecting folder path");

      dialog.showOpenDialog({
            title: "Select a folder",
            properties: ["openDirectory"],
      }).then(async result => {
            if (result.canceled) {
                  log.info("readFolderAndImage: Canceled selecting folder path");
                  event.reply("READ_FOLDER_PATH", { result: "canceled" });
            } else {
                  log.info("readFolderAndImage: User selected folder path: " + result.filePaths);
                  var fileBuffer;
                  var databasePath = path.join(app.getAppPath(), databaseName);

                  try {
                        fileBuffer = fs.readFileSync(databasePath);

                        var checkResult = await checkFolderDatabaseAndFolder(result.filePaths.toString());

                        if (checkResult.result === "success") {
                              var insertResult = await insertLocalDatabaseFolder(databasePath, fileBuffer, process.platform == 'win32' ? path.win32.basename(result.filePaths.toString()) : path.posix.basename(result.filePaths.toString()), result.filePaths, checkResult.databaseChecksum);
                              var changeResult = await updateLocalDatabaseChecksum();

                              if(insertResult.result === "warn"){
                                    log.warn("readFolderPathChannel: Folder already exist in local database, path: " + result.filePaths);
                                    event.reply("READ_FOLDER_PATH", { result: "warn", reason: insertResult.reason });
                              } else {
                                    log.info("readFolderPathChannel: Folder path saved: " + result.filePaths);
                                    event.reply("READ_FOLDER_PATH", { result: "success" });
                              }
                        } else {
                              log.error("readFolderPathChannel: Error inserting folder data: \n" + result.reason);
                              event.reply("READ_FOLDER_PATH", { result: "error", reason: result.reason });
                        }

                  } catch (error) {
                        log.error("readFolderPathChannel: Error inserting folder data: \n" + error);
                        event.reply("READ_FOLDER_PATH", { result: "error", reason: error });
                  }

            }
      });

});

ipcMain.on("GET_ALL_FOLDER", async (event, payload) => {

      log.info("getAllFolderChannel: Getting all folder from local database");
      var fileBuffer;
      var databasePath = path.join(app.getAppPath(), databaseName);

      try {
            fileBuffer = fs.readFileSync(databasePath);

            initSqlJs().then((SQL) => {
                  var result = [];
                  const db = new SQL.Database(fileBuffer);

                  const statement = db.prepare(selectAllFolderLocalDb);

                  while (statement.step()) {
                        var row = statement.getAsObject();
                        result.push(row);
                  }

                  db.close();

                  log.info("getAllFolderChannel: Got all folder from local database");
                  event.reply("GET_ALL_FOLDER", { result: "success", items: result });
            });

      } catch (error) {
            log.warn("getAllFolderChannel: Getting all folder from local database failed: \n" + error);
            event.reply("GET_ALL_FOLDER", { result: "error", reason: error });
      }

});

ipcMain.on("DELETE_FOLDER", async (event, payload) => {

      log.info("deleteFolderChannel: Deleting folder _id: " + payload._id);
      var fileBuffer;
      var databasePath = path.join(app.getAppPath(), databaseName);

      try {
            fileBuffer = fs.readFileSync(databasePath);

            var deleteResult = await deleteLocalDatabaseFolder(databasePath, fileBuffer, payload._id);
            var changeResult = await updateLocalDatabaseChecksum();

            log.info("deleteFolderChannel: Deleting folder successful");
            event.reply("DELETE_FOLDER", { result: "success" });
      } catch (error) {
            log.error("deleteFolderChannel: Delete folder failed: \n" + error);
            event.reply("DELETE_FOLDER", { result: "error", reason: error });
      }

});

ipcMain.on("GET_IMAGES", async (event, payload) => {

      if (payload.folder_id === undefined || payload.folder_id === null) {
            log.error("getImagesChannel: Getting all images failed. Reason: unknown folder_id.");
            event.reply("GET_IMAGES", { result: "error", code: 2, reason: "Unknown folder_id" });
      } else {
            log.info("getImagesChannel: Getting all images from folder database. folder_id: " + payload.folder_id);

            try {
                  var getResult = await getFolderInfoFromLocalDB(payload.folder_id);
                  var checkIntegrityResult = await checkFolderDbIntegrity(getResult.item[0].path, getResult.item[0].checksum);

                  if (checkIntegrityResult.result === "success") {
                        var scanResult = await scanFolderImages(getResult.item[0].path);
                        var updateResult = await updateFolderDatabaseChecksum(getResult.item[0]._id, scanResult.checksum);
                        if (getResult.result === "success" && scanResult.result === "success") {
                              var imagesResult = await getAllImages(getResult.item[0].path);

                              var reply = {
                                    result: "success",
                                    folderInfo: getResult.item[0],
                                    imagesItem: imagesResult.items,
                              };

                              log.info("getImagesChannel: Getting all images success, folder_id: " + payload.folder_id);
                              event.reply("GET_IMAGES", reply);
                        }
                  }

            } catch (error) {

                  if (error.result === "error") {
                        log.warn("getImagesChannel: Folder database Integrity not complete, reason: " + error.reason);
                        log.info("getImagesChannel: Recreating new folder database and checking necessary folders..., path: " + getResult.item[0].path);
                        var checkResult = await checkFolderDatabaseAndFolder(getResult.item[0].path, true);
                        var updateResult = await updateFolderDatabaseChecksum(getResult.item[0]._id, checkResult.databaseChecksum);

                        log.info("getImagesChannel: Recreated new folder database and checking necessary folders..., path: " + getResult.item[0].path);
                        event.reply("GET_IMAGES", { result: "error", code: 1, reason: error.reason, solution: "Recreated Folder Database and checked necessary folders." });
                  } else {
                        log.error("getImagesChannel: Getting all images failed. Reason: " + JSON.stringify(error));
                        event.reply("GET_IMAGES", { result: "error", code: 3, reason: JSON.stringify(error) });
                  }
            }

      }

});

ipcMain.on("TEST", (event, payload) => {

});

function renameDatabase(databasePathWithoutFilename) {

      return new Promise((resolve, reject) => {
            log.info("renameDatabase: Renaming database, path: " + path.join(databasePathWithoutFilename, databaseName));
            try {
                  if (fs.existsSync(path.join(databasePathWithoutFilename, databaseName))) {
                        fs.rename(path.join(databasePathWithoutFilename, databaseName), path.join(databasePathWithoutFilename, "database_backup_" + getCurrentDateTimeNumber() + ".sqlite"), () => {
                              log.info("renameDatabase: Renamed database from " + path.join(databasePathWithoutFilename, databaseName) + " to " + path.join(databasePathWithoutFilename, "database_backup_" + getCurrentDateTimeNumber() + ".sqlite"));
                              resolve({ result: "success" });
                        });
                  }
            } catch (error) {
                  log.warn("renameDatabase: Failed renaming database, path: " + databasePathWithoutFilename + "/" + databaseName + "\n" + error);
                  reject(error);
            }
      });
}

function createDatabase(databaseType, databasePath) {

      return new Promise((resolve, reject) => {
            var logDatabaseType = databaseType === 0 ? "local database" : "folder database";
            log.info("createDatabase: Creating database type: " + logDatabaseType + "; path: " + databasePath);
            var buffer;
            var checksum = crypto.createHash("sha256");

            initSqlJs().then((SQL) => {
                  const db = new SQL.Database();

                  if (databaseType === 0) {
                        db.run(createLocalDb);
                  } else {
                        db.run(createFolderDb);
                  }

                  buffer = new Buffer(db.export());
                  fs.writeFileSync(databasePath, buffer);

                  db.close();

                  checksum.update(buffer);
                  log.info("createDatabase: Created database type: " + logDatabaseType + " path: " + databasePath);
                  resolve({ result: "success", checksum: checksum.digest("hex") });
            });

      });

}

function insertLocalDatabaseFolder(databasePath, databaseBuffer, folderName, folderPath, folderDbChecksum) {

      return new Promise((resolve, reject) => {
            log.info("insertLocalDatabaseFolder: Inserting local database with folder path: " + folderPath);
            var buffer;
            var currentDate = getCurrentDateTime();

            initSqlJs().then((SQL) => {
                  const db = new SQL.Database(databaseBuffer);

                  const statement = db.prepare("SELECT COUNT(_id) AS count FROM folder_location WHERE path = '" + folderPath + "' AND soft_delete = 0;");
                  statement.step();

                  if(statement.getAsObject().count === 0){
                        db.run("INSERT INTO folder_location (name, path, date_created, checksum, soft_delete) \
                              VALUES ('" + folderName + "', '" + folderPath + "', '" + currentDate + "', '" + folderDbChecksum + "', 0);");

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);

                        resolve({ result: "success" });
                        log.info("insertLocalDatabaseFolder: Inserted local database with folder path: " + folderPath);
                  } else {
                        log.warn("insertLocalDatabaseFolder: Folder already exist in local database, path: " + folderPath);
                        resolve({result: "warn", reason: "Folder already exist in local database."});
                  }

                  db.close();
            });

      });

}

function deleteLocalDatabaseFolder(databasePath, databaseBuffer, folderId) {

      return new Promise((resolve, reject) => {
            log.info("deleteLocalDatabaseFolder: Deleting local database with folder path: " + folderId);
            var buffer;

            initSqlJs().then((SQL) => {
                  const db = new SQL.Database(databaseBuffer);

                  db.run("UPDATE folder_location SET soft_delete = 1 WHERE _id = " + folderId + ";");

                  buffer = new Buffer(db.export());
                  fs.writeFileSync(databasePath, buffer);

                  db.close();
            });

            log.info("deleteLocalDatabaseFolder: Deleted local database with folder path: " + folderId);
            resolve({ result: "success" });
      });

}

function updateLocalDatabaseChecksum(){

      return new Promise((resolve, reject) => {

            log.info("updateLocalDatabaseChecksum: Changing new checksum value in " + databaseChecksumName);
            var databasePath = path.join(app.getAppPath(), "./" + databaseName);
            
            if(fs.existsSync(databasePath)){
                  var databaseBuffer = fs.readFileSync(databasePath);
                  var databaseChecksum = crypto.createHash("sha256");
                  databaseChecksum.update(databaseBuffer);

                  try {
                        fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), databaseChecksum.digest("hex"));
                        log.info("updateLocalDatabaseChecksum: Success change new checksum value in " + databaseChecksumName);
                        resolve({result: "success"});
                  } catch (error) {
                        log.error("updateLocalDatabaseChecksum: Failed change new checksum value in " + databaseChecksumName + "\n" + JSON.stringify(error));
                        reject({result: "error", reason: error});
                  }

            } else {
                  log.error("updateLocalDatabaseChecksum: Failed change new checksum value in " + databaseChecksumName + ". Reason: Database not exist.");
                  reject({result: "error", reason: "Database not exist."});
            }

      });

}

function updateFolderDatabaseChecksum(folderId, checksum) {

      return new Promise((resolve, reject) => {
            log.info("updateFolderDatabaseChecksum: Changing new checksum value in database, folder_id: " + folderId);

            var databasePath = path.join(app.getAppPath(), "./" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then((SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        db.run("UPDATE folder_location SET checksum = '" + checksum + "' WHERE _id = " + folderId + ";");

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);

                        log.info("updateFolderDatabaseChecksum: Successful change new checksum value in database, folder_id: " + folderId);
                        resolve({ result: "success" });
                  });
            } catch (error) {
                  log.error("updateFolderDatabaseChecksum: Failed change new checksum value in database, folder_id: " + folderId + "\n" + error);
                  reject({ result: "error", reason: error });
            }

      });

}

function checkFolderDatabaseAndFolder(folderPath, integrityError = false) {

      return new Promise(async (resolve, reject) => {
            log.info("checkFolderDatabaseAndFolder: Creating folder database and creating necessary folders. Path: " + folderPath);

            if (!fs.existsSync(path.join(folderPath, "./appdata"))) {
                  fs.mkdirSync(path.join(folderPath, "./appdata"));
            }

            var result = await createDatabase(1, path.join(folderPath, "./appdata/" + databaseName));

            if (!fs.existsSync(path.join(folderPath, "./passed"))) {
                  fs.mkdirSync(path.join(folderPath, "./passed"));
            }

            if (!fs.existsSync(path.join(folderPath, "./failed"))) {
                  fs.mkdirSync(path.join(folderPath, "./failed"));
            }

            resolve({ result: "success", databaseChecksum: result.checksum });
            log.info("checkFolderDatabaseAndFolder: Finish create folder database and creating necessary folders. Path: " + folderPath);
      });

}

function getFolderInfoFromLocalDB(folder_id) {

      return new Promise((resolve, reject) => {

            log.info("getFolderInfoFromLocalDB: getting folder info from local database.");
            var localDatabasePath = path.join(app.getAppPath(), "./" + databaseName);
            var databaseBuffer;

            try {
                  databaseBuffer = fs.readFileSync(localDatabasePath);

                  initSqlJs().then((SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        const statement = db.prepare("SELECT * FROM folder_location WHERE soft_delete = 0 AND _id = " + folder_id + " LIMIT 1;");
                        var result = [];

                        while (statement.step()) {
                              result.push(statement.getAsObject());
                        }

                        db.close();

                        log.info("getFolderInfoFromLocalDB: successful getting folder info from local database.");
                        resolve({ result: "success", item: result });
                  });

            } catch (error) {
                  log.error("getFolderInfoFromLocalDB: failed getting folder info from local database.\n" + error);
                  reject({ result: "error", reason: error });
            }

      });

}

function checkFolderDbIntegrity(folderPath, folderChecksum) {

      return new Promise((resolve, reject) => {
            log.info("checkFolderDbIntegrity: Checking folder database integrity, path: " + folderPath);

            var folderDbExist = fs.existsSync(path.join(folderPath, "./appdata/" + databaseName));

            if (folderDbExist) {

                  var databaseBuffer = fs.readFileSync(path.join(folderPath, "./appdata/" + databaseName));
                  var databaseChecksum = crypto.createHash("sha256");
                  databaseChecksum.update(databaseBuffer);
                  var hex = databaseChecksum.digest("hex");

                  if (folderChecksum === hex) {
                        log.info("checkFolderDbIntegrity: Successful checking folder database integrity");
                        resolve({ result: "success" });
                  } else {
                        log.error("checkFolderDbIntegrity: Failed getting folder database: database checksum not same");
                        reject({ result: "error", reason: "Folder database checksum not same." });
                  }

            } else {
                  log.error("checkFolderDbIntegrity: Failed getting folder database: file not exist");
                  reject({ result: "error", reason: "Folder database file not exist." });
            }
      });

}

function scanFolderImages(folderPath) {

      return new Promise((resolve, reject) => {
            log.info("scanFolderImages: initializing images scanning and verify integrity of database. Folder path: " + folderPath);
            var databasePath = path.join(folderPath, "./appdata/" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then((SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        var statement = db.prepare(selectAllImagesFolderDb);

                        log.info("scanFolderImages: deleting folder database images record not in folder.");

                        while (statement.step()) {
                              imageInfo = statement.getAsObject();

                              if (!fs.existsSync(imageInfo.path)) {

                                    if (imageInfo.status === 1) {
                                          var passPath = path.join(folderPath, "./pass/" + imageInfo.name);
                                          fs.unlinkSync(passPath);
                                    } else if (imageInfo.status === 2) {
                                          var failedPath = path.join(folderPath, "./failed/" + imageInfo.defect_name + "/" + imageInfo.name);
                                          fs.unlinkSync(failedPath);
                                    }

                                    db.run("DELETE FROM images WHERE _id = " + imageInfo._id);
                                    log.info("scanFolderImages: Image not exist in folder, deleted folder database, image record. Name: " + imageInfo.name);
                              } else {
                                    log.info("scanFolderImages: Image exist in folder and folder database, ignore delete folder database, image record. Name: " + imageInfo.name);
                              }
                        }

                        log.info("scanFolderImages: finish deleting folder database images record not in folder.");
                        log.info("scanFolderImages: inserting new images info into folder database.");

                        fs.readdirSync(folderPath).forEach(file => {
                              statement.reset();
                              if (!folderIgnoreFilesName.includes(file)) {

                                    if (folderImagesFileTypes.includes(path.extname(file).toLowerCase())) {
                                          statement = db.prepare("SELECT COUNT(_id) AS count FROM images WHERE name = '" + file + "';");
                                          statement.step();

                                          if (statement.getAsObject().count === 0) {
                                                db.run("INSERT INTO images (name, path, status, defect_name, date_created) VALUES ('" + file + "', '" + path.join(folderPath, file) + "', " + imageStatus.pending + ", '', '" + getCurrentDateTime() + "')");
                                                log.info("scanFolderImages: New image detected, inserted new image into folder database, image name: " + file);
                                          } else {
                                                log.info("scanFolderImages: Image exist in folder and folder database, ignore insert images into folder database, image name: " + file);
                                          }
                                    }

                              }
                        });

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);
                        log.info("scanFolderImages: finish inserting new images info into folder database.");
                        statement.reset();
                        db.close();
                        var databaseChecksum = crypto.createHash("sha256");
                        databaseChecksum.update(buffer);
                        resolve({ result: "success", checksum: databaseChecksum.digest("hex") });
                  });
            } catch (error) {
                  log.error("scanFolderImages: failed initializing images scanning and verify integrity of database. Folder path: " + folderPath + "\n" + error);
                  reject({ result: "error", reason: error });
            }
      });

}

function getAllImages(folderPath) {

      return new Promise((resolve, reject) => {
            log.info("getAllImages: getting all images from folder database, folder path: " + folderPath);
            var databasePath = path.join(folderPath, "./appdata/" + databaseName);
            var databaseBuffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then((SQL) => {
                        var result = [];
                        const db = new SQL.Database(databaseBuffer);
                        const statement = db.prepare(selectAllImagesFolderDb);

                        while (statement.step()) {
                              var row = statement.getAsObject();
                              result.push(row);
                        }

                        db.close();

                        log.info("getAllImages: got all images from folder database, folder path: " + folderPath);
                        resolve({ result: "success", items: result });
                  });

            } catch (error) {
                  log.error("getAllImages: failed getting all images from folder database, folder path: " + folderPath + "\n" + error);
                  reject({ result: "error", reason: error });
            }
      });

}

function getCurrentDateTime() {
      var currentDate = new Date();

      var date = ("0" + currentDate.getDate()).slice(-2);
      var month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
      var year = currentDate.getFullYear();
      var hours = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
      var minutes = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
      var seconds = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();

      return year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
}

function getCurrentDateTimeNumber() {
      var currentDate = new Date();

      var date = ("0" + currentDate.getDate()).slice(-2);
      var month = ("0" + (currentDate.getMonth() + 1)).slice(-2);
      var year = currentDate.getFullYear();
      var hours = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
      var minutes = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
      var seconds = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();

      return "" + year + month + date + hours + minutes + seconds;
}