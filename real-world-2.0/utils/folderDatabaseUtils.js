const {app} = require('electron');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js/dist/sql-wasm');
const logger = require('electron-log');

const database = require('./databaseUtils');
const localDatabase = require('./localDatabaseUtils');

const databaseName = "database.sqlite";

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

function updateFolderDatabaseChecksum(folderId, checksum) {

      return new Promise((resolve, reject) => {
            logger.info("updateFolderDatabaseChecksum: Changing new checksum value in database, folder_id: " + folderId);

            var databasePath = path.join(app.getAppPath(), "./" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then((SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        db.run("UPDATE folder_location SET checksum = '" + checksum + "' WHERE _id = " + folderId + ";");

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);

                        logger.info("updateFolderDatabaseChecksum: Successful change new checksum value in database, folder_id: " + folderId);
                        resolve({ result: "success" });
                  });
            } catch (error) {
                  logger.error("updateFolderDatabaseChecksum: Failed change new checksum value in database, folder_id: " + folderId + "\n" + error);
                  reject({ result: "error", reason: error });
            }

      });

}

function checkFolderDatabaseAndFolder(folderPath, integrityError = false) {

      return new Promise(async (resolve, reject) => {
            logger.info("checkFolderDatabaseAndFolder: Creating folder database and creating necessary folders. Path: " + folderPath);

            if (!fs.existsSync(path.join(folderPath, "./appdata"))) {
                  fs.mkdirSync(path.join(folderPath, "./appdata"));
            }

            var result = await database.createDatabase(1, path.join(folderPath, "./appdata/" + databaseName));

            if (!fs.existsSync(path.join(folderPath, "./passed"))) {
                  fs.mkdirSync(path.join(folderPath, "./passed"));
            }

            if (!fs.existsSync(path.join(folderPath, "./failed"))) {
                  fs.mkdirSync(path.join(folderPath, "./failed"));
            }

            resolve({ result: "success", databaseChecksum: result.checksum });
            logger.info("checkFolderDatabaseAndFolder: Finish create folder database and creating necessary folders. Path: " + folderPath);
      });

}

function checkFolderDbIntegrity(folderPath, folderChecksum) {

      return new Promise((resolve, reject) => {
            logger.info("checkFolderDbIntegrity: Checking folder database integrity, path: " + folderPath);

            var folderDbExist = fs.existsSync(path.join(folderPath, "./appdata/" + databaseName));

            if (folderDbExist) {

                  var databaseBuffer = fs.readFileSync(path.join(folderPath, "./appdata/" + databaseName));
                  var databaseChecksum = crypto.createHash("sha256");
                  databaseChecksum.update(databaseBuffer);
                  var hex = databaseChecksum.digest("hex");

                  if (folderChecksum === hex) {
                        logger.info("checkFolderDbIntegrity: Successful checking folder database integrity");
                        resolve({ result: "success" });
                  } else {
                        logger.error("checkFolderDbIntegrity: Failed getting folder database: database checksum not same");
                        reject({ result: "error", reason: "Folder database checksum not same." });
                  }

            } else {
                  logger.error("checkFolderDbIntegrity: Failed getting folder database: file not exist");
                  reject({ result: "error", reason: "Folder database file not exist." });
            }
      });

}

function scanFolderImages(folderPath) {

      return new Promise((resolve, reject) => {
            logger.info("scanFolderImages: initializing images scanning and verify integrity of database. Folder path: " + folderPath);
            var databasePath = path.join(folderPath, "./appdata/" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then(async (SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        var statement = db.prepare(selectAllImagesFolderDb);

                        logger.info("scanFolderImages: deleting folder database images record not in folder.");

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
                                    logger.info("scanFolderImages: Image not exist in folder, deleted folder database, image record. Name: " + imageInfo.name);
                              } else {
                                    logger.info("scanFolderImages: Image exist in folder and folder database, ignore delete folder database, image record. Name: " + imageInfo.name);
                              }
                        }

                        logger.info("scanFolderImages: finish deleting folder database images record not in folder.");
                        logger.info("scanFolderImages: inserting new images info into folder database.");

                        fs.readdirSync(folderPath).forEach(file => {
                              statement.reset();
                              if (!folderIgnoreFilesName.includes(file)) {

                                    if (folderImagesFileTypes.includes(path.extname(file).toLowerCase())) {
                                          statement = db.prepare("SELECT COUNT(_id) AS count FROM images WHERE name = '" + file + "';");
                                          statement.step();

                                          if (statement.getAsObject().count === 0) {
                                                db.run("INSERT INTO images (name, path, status, defect_name, date_created) VALUES ('" + file + "', '" + path.join(folderPath, file) + "', " + imageStatus.pending + ", '', '" + getCurrentDateTime() + "')");
                                                logger.info("scanFolderImages: New image detected, inserted new image into folder database, image name: " + file);
                                          } else {
                                                logger.info("scanFolderImages: Image exist in folder and folder database, ignore insert images into folder database, image name: " + file);
                                          }
                                    }

                              }
                        });

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);
                        logger.info("scanFolderImages: finish inserting new images info into folder database.");
                        statement.reset();
                        db.close();

                        var databaseChecksum = crypto.createHash("sha256");
                        databaseChecksum.update(buffer);
                        
                        resolve({ result: "success", checksum: databaseChecksum.digest("hex") });
                  });
            } catch (error) {
                  logger.error("scanFolderImages: failed initializing images scanning and verify integrity of database. Folder path: " + folderPath + "\n" + error);
                  reject({ result: "error", reason: error });
            }
      });

}

function getAllImages(folderPath) {

      return new Promise((resolve, reject) => {
            logger.info("getAllImages: getting all images from folder database, folder path: " + folderPath);
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

                        logger.info("getAllImages: got all images from folder database, folder path: " + folderPath);
                        resolve({ result: "success", items: result });
                  });

            } catch (error) {
                  logger.error("getAllImages: failed getting all images from folder database, folder path: " + folderPath + "\n" + error);
                  reject({ result: "error", reason: error });
            }
      });

}

module.exports = folderDatabase = {
      updateFolderDatabaseChecksum,
      checkFolderDatabaseAndFolder,
      checkFolderDbIntegrity,
      scanFolderImages,
      getAllImages,
}