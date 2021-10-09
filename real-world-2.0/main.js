const { app, BrowserWindow, ipcMain, dialog } = require('electron');

const url = require("url");
const path = require("path");

const fs = require('fs');

const initSqlJs = require('sql.js/dist/sql-wasm');

const databaseName = "database.sqlite";

const createLocalDb = " \
                        CREATE TABLE folder_location (_id INTEGER PRIMARY KEY, name TEXT, path TEXT, date_created TEXT, soft_delete INTEGER); \
                        CREATE TABLE defect_category (_id INTEGER PRIMARY KEY, name TEXT, date_created TEXT, soft_delete INTEGER); \
                        ";

const createFolderDb = " \
                        CREATE TABLE images (_id INTEGER PRIMARY KEY, name TEXT, path TEXT, status INTEGER, defect_name TEXT, date_created TEXT, soft_delete INTEGER); \
                        ";

const selectAllFolderLocalDb = " \
                        SELECT * FROM folder_location WHERE soft_delete = 0; \
                        ";

const selectAllImagesFolderDb = " \
                        SELECT * FROM images WHERE soft_delete = 0; \
                        ";

const folderIgnoreFilesName = [
      "database.sqlite",
      "pass",
      "failed"
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
console.log(app);
app.on('ready', createWindow)

app.on('window-all-closed', function () {
      log.info("App quitting");
      if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
      if (mainWindow === null) createWindow()
})

ipcMain.on("READ_FOLDER_PATH", (event, payload) => {

      log.info("readFolderPath: User selecting folder path");

      dialog.showOpenDialog({
            title: "Select a folder",
            properties: ["openDirectory"],
      }).then(result => {
            if (result.canceled) {
                  log.info("readFolderAndImage: canceled selecting folder path");
                  event.reply("READ_FOLDER_PATH", { result: "canceled" });
            } else {
                  log.info("readFolderAndImage: User selected folder path: " + result.filePaths);
                  var fileBuffer;
                  var databasePath = path.join(app.getAppPath(), databaseName);

                  try {
                        fileBuffer = fs.readFileSync(databasePath);

                        insertLocalDatabaseFolder(databasePath, fileBuffer, process.platform == 'win32' ? path.win32.basename(result.filePaths.toString()) : path.posix.basename(result.filePaths.toString()), result.filePaths);
                        checkFolderDatabaseAndFolder(result.filePaths.toString());
                  } catch (error) {
                        log.error("readFolderPath: error inserting folder data: \n" + error);
                        event.reply("READ_FOLDER_PATH", { result: "failed" });
                  }

                  log.info("readFolderPath: Folder path saved: " + result.filePaths);
                  event.reply("READ_FOLDER_PATH", { result: "success" });
            }
      });

});

ipcMain.on("GET_ALL_FOLDER", (event, payload) => {

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
                  event.reply("GET_ALL_FOLDER", result);
            });

      } catch (error) {
            log.warn("getAllFolderChannel: Getting all folder from local database failed: \n" + error);
            createDatabase(0, databasePath);
            event.reply("GET_ALL_FOLDER", []);
      }

});

ipcMain.on("DELETE_FOLDER", (event, payload) => {

      log.info("deleteFolderChannel: Deleting folder _id: " + payload._id);
      var fileBuffer;
      var databasePath = path.join(app.getAppPath(), databaseName);

      try {
            fileBuffer = fs.readFileSync(databasePath);

            deleteLocalDatabaseFolder(databasePath, fileBuffer, payload._id);

            log.info("deleteFolderChannel: Deleting folder successful");
            event.reply("DELETE_FOLDER", { result: "success" });
      } catch (error) {
            log.error("deleteFolderChannel: Delete folder failed: \n" + error);
            event.reply("DELETE_FOLDER", { result: "failed" });
      }

});

ipcMain.on("GET_IMAGES", async (event, payload) => {

      if (payload.folder_id === undefined || payload.folder_id === null) {
            log.error("getImageChannel: Getting all images failed. Reason: unknown folder_id.");
            event.reply("GET_IMAGES", { result: "failed" });
      } else {
            log.info("getImageChannel: Getting all images from folder database. folder_id: " + payload.folder_id);

            try {
                  var result = await getFolderInfoFromLocalDB(payload.folder_id);

                  var result1 = await scanFolderImages(result[0].path);

                  if (result1.result === "success") {
                        var imagesResult = await getAllImages(result[0].path);

                        var reply = {
                              folderInfo: result[0],
                              imagesItem: imagesResult,
                        };

                        log.error("getImageChannel: Getting all images success, folder_id: " + payload.folder_id);
                        event.reply("GET_IMAGES", reply);
                  }
            } catch (error) {
                  log.error("getImageChannel: Getting all images failed. Reason: " + error);
            }

      }

});

ipcMain.on("TEST", (event, payload) => {

});

function createDatabase(databaseType, databasePath) {

      var logDatabaseType = databaseType === 0 ? "local database" : "folder database";
      log.info("createDatabase: Creating database type: " + logDatabaseType + "; path: " + databasePath);
      var buffer;

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

      });

      log.info("createDatabase: Created database type: " + logDatabaseType + " path: " + databasePath);

}

function insertLocalDatabaseFolder(databasePath, databaseBuffer, folderName, folderPath) {

      log.info("insertLocalDatabaseFolder: Inserting local database with folder path: " + folderPath);
      var buffer;
      var currentDate = getCurrentDateTime();

      initSqlJs().then((SQL) => {
            const db = new SQL.Database(databaseBuffer);

            db.run("INSERT INTO folder_location (name, path, date_created, soft_delete) \
                        VALUES ('" + folderName + "', '" + folderPath + "', '" + currentDate + "', 0);");

            buffer = new Buffer(db.export());
            fs.writeFileSync(databasePath, buffer);

            db.close();
      });

      log.info("insertLocalDatabaseFolder: Inserted local database with folder path: " + folderPath);

}

function deleteLocalDatabaseFolder(databasePath, databaseBuffer, folderId) {

      log.info("deleteLocalDatabaseFolder: Deleting local database with folder path: " + folderId);
      var buffer;

      initSqlJs().then((SQL) => {
            const db = new SQL.Database(databaseBuffer);

            db.run("DELETE FROM folder_location WHERE _id = " + folderId);

            buffer = new Buffer(db.export());
            fs.writeFileSync(databasePath, buffer);

            db.close();
      });

      log.info("deleteLocalDatabaseFolder: Deleted local database with folder path: " + folderId);

}

function checkFolderDatabaseAndFolder(folderPath) {

      log.info("initFolderDatabaseAndFolder: Start initialize folder database and creating necessary folders. Path: " + folderPath);

      if (!fs.existsSync(path.join(folderPath, "./" + databaseName))) {
            createDatabase(1, path.join(folderPath, "./" + databaseName));
      }

      if (!fs.existsSync(path.join(folderPath, "./pass"))) {
            fs.mkdirSync(path.join(folderPath, "./pass"));
      }

      if (!fs.existsSync(path.join(folderPath, "./failed"))) {
            fs.mkdirSync(path.join(folderPath, "./failed"));
      }

      log.info("initFolderDatabaseAndFolder: Finish initialize folder database and creating necessary folders. Path: " + folderPath);

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
                        resolve(result);
                  });

            } catch (error) {
                  log.error("getFolderInfoFromLocalDB: failed getting folder info from local database.\n" + error);
                  reject(error);
            }

      });

}

function scanFolderImages(folderPath) {

      return new Promise((resolve, reject) => {
            log.info("scanFolderImages: initializing images scanning and verify integrity of database. Folder path: " + folderPath);
            var databasePath = path.join(folderPath, "./" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then((SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        var statement = db.prepare(selectAllImagesFolderDb);

                        log.info("scanFolderImages: deleting folder database images data not in folder.");

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
                                    log.info("scanFolderImages: deleted folder database images. Name: " + imageInfo.name);
                              } else {
                                    log.info("scanFolderImages: ignore delete folder database images. Name: " + imageInfo.name);
                              }
                        }

                        log.info("scanFolderImages: finish deleting folder database images data not in folder.");
                        log.info("scanFolderImages: inserting new images into folder database.");

                        fs.readdirSync(folderPath).forEach(file => {
                              statement.reset();
                              if (!folderIgnoreFilesName.includes(file)) {
                                    statement = db.prepare("SELECT COUNT(_id) AS count FROM images WHERE name = '" + file + "' AND soft_delete = 0;");
                                    statement.step();

                                    if (statement.getAsObject().count === 0) {
                                          db.run("INSERT INTO images (name, path, status, defect_name, date_created, soft_delete) VALUES ('" + file + "', '" + path.join(folderPath, file) + "', " + imageStatus.pending + ", '', '" + getCurrentDateTime() + "', 0)");
                                          log.info("scanFolderImages: inserted new images into folder database, image name: " + file);
                                    } else {
                                          log.info("scanFolderImages: ignore insert images into folder database, image name: " + file);
                                    }
                              }
                        });

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);
                        log.info("scanFolderImages: finish inserting new images into folder database.");
                        statement.reset();
                        db.close();
                        resolve({ result: "success" });
                  });
            } catch (error) {
                  log.error("scanFolderImages: failed initializing images scanning and verify integrity of database. Folder path: " + folderPath + "\n" + error);
                  reject(error);
            }
      });

}

function getAllImages(folderPath) {

      return new Promise((resolve, reject) => {
            log.info("getAllImages: getting all images from folder database, folder path: " + folderPath);
            var databasePath = path.join(folderPath, "./" + databaseName);
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
                        resolve(result);
                  });

            } catch (error) {
                  log.error("getAllImages: failed getting all images from folder database, folder path: " + folderPath + "\n" + error);
                  reject(error);
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