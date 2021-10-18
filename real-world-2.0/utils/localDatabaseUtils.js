const {app} = require('electron');
const path = require("path");
const fs = require('fs');

const crypto = require('crypto');

const logger = require("./logger");
const initSqlJs = require('sql.js/dist/sql-wasm');

const databaseName = "database.sqlite";
const databaseChecksumName = "database_checksum.dat";

const selectAllFolderLocalDb = " \
                        SELECT * FROM folder_location WHERE soft_delete = 0; \
                        ";

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

function insertLocalDatabaseFolder(databasePath, databaseBuffer, folderName, folderPath, folderDbChecksum) {

      return new Promise((resolve, reject) => {
            logger.info("insertLocalDatabaseFolder: Inserting local database with folder path: " + folderPath);
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
                        logger.info("insertLocalDatabaseFolder: Inserted local database with folder path: " + folderPath);
                  } else {
                        logger.warn("insertLocalDatabaseFolder: Folder already exist in local database, path: " + folderPath);
                        resolve({result: "warn", reason: "Folder already exist in local database."});
                  }

                  db.close();
            });

      });

}

function deleteLocalDatabaseFolder(databasePath, databaseBuffer, folderId) {

      return new Promise((resolve, reject) => {
            logger.info("deleteLocalDatabaseFolder: Deleting local database with folder path: " + folderId);
            var buffer;

            initSqlJs().then((SQL) => {
                  const db = new SQL.Database(databaseBuffer);

                  db.run("UPDATE folder_location SET soft_delete = 1 WHERE _id = " + folderId + ";");

                  buffer = new Buffer(db.export());
                  fs.writeFileSync(databasePath, buffer);

                  db.close();
            });

            logger.info("deleteLocalDatabaseFolder: Deleted local database with folder path: " + folderId);
            resolve({ result: "success" });
      });

}

function updateLocalDatabaseChecksum(){

      return new Promise((resolve, reject) => {

            logger.info("updateLocalDatabaseChecksum: Changing new checksum value in " + databaseChecksumName);
            var databasePath = path.join(app.getAppPath(), "./" + databaseName);
            
            if(fs.existsSync(databasePath)){
                  var databaseBuffer = fs.readFileSync(databasePath);
                  var databaseChecksum = crypto.createHash("sha256");
                  databaseChecksum.update(databaseBuffer);

                  try {
                        fs.writeFileSync(path.join(app.getAppPath(), "./" + databaseChecksumName), databaseChecksum.digest("hex"));
                        logger.info("updateLocalDatabaseChecksum: Success change new checksum value in " + databaseChecksumName);
                        resolve({result: "success"});
                  } catch (error) {
                        logger.error("updateLocalDatabaseChecksum: Failed change new checksum value in " + databaseChecksumName + "\n" + JSON.stringify(error));
                        reject({result: "error", reason: error});
                  }

            } else {
                  logger.error("updateLocalDatabaseChecksum: Failed change new checksum value in " + databaseChecksumName + ". Reason: Database not exist.");
                  reject({result: "error", reason: "Database not exist."});
            }

      });

}

function getFolderInfoFromLocalDB(folder_id) {

      return new Promise((resolve, reject) => {

            logger.info("getFolderInfoFromLocalDB: getting folder info from local database.");
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

                        logger.info("getFolderInfoFromLocalDB: successful getting folder info from local database.");
                        resolve({ result: "success", item: result });
                  });

            } catch (error) {
                  logger.error("getFolderInfoFromLocalDB: failed getting folder info from local database.\n" + error);
                  reject({ result: "error", reason: error });
            }

      });

}

exports.databaseChecksumName = databaseChecksumName;
exports.selectAllFolderLocalDb = selectAllFolderLocalDb;

module.exports = localDatabase = {
      insertLocalDatabaseFolder,
      deleteLocalDatabaseFolder,
      updateLocalDatabaseChecksum,
      getFolderInfoFromLocalDB,
}