const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js/dist/sql-wasm');
const logger = require('./logger');

const databaseName = "database.sqlite";

const createLocalDb = " \
                        CREATE TABLE folder_location (_id INTEGER PRIMARY KEY, name TEXT, path TEXT, date_created TEXT, checksum TEXT, soft_delete INTEGER); \
                        CREATE TABLE defect_category (_id INTEGER PRIMARY KEY, name TEXT, date_created TEXT, soft_delete INTEGER); \
                        ";

const createFolderDb = " \
                        CREATE TABLE images (_id INTEGER PRIMARY KEY, name TEXT, path TEXT, status INTEGER, date_created TEXT); \
                        CREATE TABLE image_defects (_id INTEGER PRIMARY KEY, image_id INTEGER, defect_name TEXT); \
                        ";

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

function renameDatabase(databasePathWithoutFilename) {

      return new Promise((resolve, reject) => {
            logger.info("renameDatabase: Renaming database, path: " + path.join(databasePathWithoutFilename, databaseName));
            try {
                  if (fs.existsSync(path.join(databasePathWithoutFilename, databaseName))) {
                        fs.rename(path.join(databasePathWithoutFilename, databaseName), path.join(databasePathWithoutFilename, "database_backup_" + getCurrentDateTimeNumber() + ".sqlite"), () => {
                              logger.info("renameDatabase: Renamed database from " + path.join(databasePathWithoutFilename, databaseName) + " to " + path.join(databasePathWithoutFilename, "database_backup_" + getCurrentDateTimeNumber() + ".sqlite"));
                              resolve({ result: "success" });
                        });
                  }
            } catch (error) {
                  logger.warn("renameDatabase: Failed renaming database, path: " + databasePathWithoutFilename + "/" + databaseName + "\n" + error);
                  reject(error);
            }
      });
}

function createDatabase(databaseType, databasePath) {

      return new Promise((resolve, reject) => {
            var logDatabaseType = databaseType === 0 ? "local database" : "folder database";
            logger.info("createDatabase: Creating database type: " + logDatabaseType + "; path: " + databasePath);
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
                  logger.info("createDatabase: Created database type: " + logDatabaseType + " path: " + databasePath);
                  resolve({ result: "success", checksum: checksum.digest("hex") });
            });

      });

}

module.exports = databaseUtils = {
      databaseName: databaseName,
      renameDatabase,
      createDatabase
}