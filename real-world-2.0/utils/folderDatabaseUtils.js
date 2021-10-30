const {app} = require('electron');
const fs = require('fs');
const path = require('path');
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
      passed: 1,
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

function checkFolderDatabaseAndFolder(folderPath) {

      return new Promise(async (resolve, reject) => {
            logger.info("checkFolderDatabaseAndFolder: Checking folder database and necessary folders. Path: " + folderPath);

            if (!fs.existsSync(path.join(folderPath, "./appdata"))) {
                  logger.info("checkFolderDatabaseAndFolder: appdata folder not exist, creating directory...");
                  fs.mkdirSync(path.join(folderPath, "./appdata"));
                  logger.info("checkFolderDatabaseAndFolder: Successful create appdata folder");
            }

            if(!fs.existsSync(path.join(folderPath, "./appdata/" + databaseName))){
                  logger.info("checkFolderDatabaseAndFolder: database.sqlite are not exist in appdata folder, creating database...");
                  var result = await database.createDatabase(1, path.join(folderPath, "./appdata/" + databaseName));
                  logger.info("checkFolderDatabaseAndFolder: Successful create database.sqlite in appdata folder");
            }

            if (!fs.existsSync(path.join(folderPath, "./passed"))) {
                  logger.info("checkFolderDatabaseAndFolder: passed folder not exist, creating directory...");
                  fs.mkdirSync(path.join(folderPath, "./passed"));
                  logger.info("checkFolderDatabaseAndFolder: Successful create passed folder");
            }

            if (!fs.existsSync(path.join(folderPath, "./failed"))) {
                  logger.info("checkFolderDatabaseAndFolder: failed folder not exist, creating directory...");
                  fs.mkdirSync(path.join(folderPath, "./failed"));
                  logger.info("checkFolderDatabaseAndFolder: Successful create failed folder");
            }

            resolve({ result: "success" });
            logger.info("checkFolderDatabaseAndFolder: Successful check folder database and necessary folders. Path: " + folderPath);
      });

}

function scanFolderImages(folderPath) {

      return new Promise((resolve, reject) => {
            logger.info("scanFolderImages: Initializing images scanning and verify integrity of database. Folder path: " + folderPath);
            var databasePath = path.join(folderPath, "./appdata/" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then(async (SQL) => {
                        const db = new SQL.Database(databaseBuffer);
                        var statement = db.prepare(selectAllImagesFolderDb);

                        logger.info("scanFolderImages: Deleting folder database images record not in folder...");

                        while (statement.step()) {
                              var imageInfo = statement.getAsObject();

                              if (!fs.existsSync(imageInfo.path)) {

                                    if (imageInfo.status === 1) {
                                          var passPath = path.join(folderPath, "./pass/" + imageInfo.name);
                                          fs.unlinkSync(passPath);
                                    } else if (imageInfo.status === 2) {

                                          var defectStatement = db.prepare("SELECT * FROM image_defects WHERE image_id = " + imageInfo._id + ";");

                                          while(defectStatement.step()){
                                                var failedPath = path.join(folderPath, "./failed/" + defectStatement.getAsObject().defect_name + "/" + imageInfo.name);
                                                fs.unlinkSync(failedPath);
                                          }

                                          defectStatement.reset();
                                          
                                    }

                                    db.run("DELETE FROM images WHERE _id = " + imageInfo._id + "; DELETE FROM image_defects WHERE image_id = " + imageInfo._id + ";");
                                    logger.info("scanFolderImages: Image not exist in folder, deleted folder database image record. Name: " + imageInfo.name);
                              } else {
                                    logger.info("scanFolderImages: Image exist in folder and folder database, ignore delete folder database image record. Name: " + imageInfo.name);
                              }
                        }

                        logger.info("scanFolderImages: Finish deleting folder database images record not in folder");
                        logger.info("scanFolderImages: Inserting new images info into folder database...");

                        fs.readdirSync(folderPath).forEach(file => {
                              statement.reset();
                              if (!folderIgnoreFilesName.includes(file)) {

                                    if (folderImagesFileTypes.includes(path.extname(file).toLowerCase())) {
                                          statement = db.prepare("SELECT COUNT(_id) AS count FROM images WHERE name = '" + file + "';");
                                          statement.step();

                                          if (statement.getAsObject().count === 0) {
                                                db.run("INSERT INTO images (name, path, status, date_created) VALUES ('" + file + "', '" + path.join(folderPath, file) + "', " + imageStatus.pending + ", '" + getCurrentDateTime() + "')");
                                                logger.info("scanFolderImages: New image detected, inserted new image into folder database, image name: " + file);
                                          } else {
                                                logger.info("scanFolderImages: Image exist in folder and folder database, ignore insert images into folder database, image name: " + file);
                                          }

                                          statement.reset();
                                    }

                              }
                        });

                        logger.info("scanFolderImages: Finish inserting new images info into folder database");
                        
                        if(fs.readdirSync(path.join(folderPath, "./passed")).length !== 0){
                              logger.info("scanFolderImages: Updating passed images info from passed folder into folder database...");

                              fs.readdirSync(path.join(folderPath, "./passed")).forEach(file => {
                                    db.run("UPDATE images SET status = " + imageStatus.passed + " WHERE name = '" + file + "';");
                                    logger.info("scanFolderImages: Image detected in passed folder, updated image info, image name: " + file);
                              });
                              
                              logger.info("scanFolderImages: Finish updating passed images info from passed folder info into folder database");
                        }

                        if(fs.readdirSync(path.join(folderPath, "./failed")).length !== 0){
                              logger.info("scanFolderImages: Updating failed images info from failed folder into folder database...");
                              var newDefects = [];

                              fs.readdirSync(path.join(folderPath, "./failed")).forEach(file => {
                                    var stats = fs.statSync(path.join(folderPath, "./failed/" + file));
                                    if(stats.isDirectory()){
                                          newDefects.push(file);

                                          fs.readdirSync(path.join(folderPath, "./failed/" + file)).forEach(file1 => {
                                                var statement = db.prepare("SELECT * FROM images WHERE name = '" + file1 + "' LIMIT 1;");
                                                statement.step();
                                                var imageInfo = statement.getAsObject();

                                                db.run("UPDATE images SET status = " + imageStatus.failed + " WHERE name = '" + file1 + "';");

                                                var defectStatement = db.prepare("SELECT COUNT(_id) as count FROM image_defects WHERE image_id = " + imageInfo._id + " AND defect_name = '" + file + "';");
                                                defectStatement.step();

                                                if(defectStatement.getAsObject().count === 0){
                                                      db.run("INSERT INTO image_defects (image_id, defect_name) VALUES (" + imageInfo._id + ", '" + file + "');");
                                                      logger.info("scanFolderImages: Image detected in ./failed/" + file + " folder, updating image info image name: " + file1);
                                                } else {
                                                      logger.info("scanFolderImages: Image detected in ./failed/" + file + " folder but already exist in database, image name: " + file1);
                                                }

                                                defectStatement.reset();
                                                statement.reset();
                                          });

                                    } else {
                                          logger.warn("scanFolderImages: Inside failed directory no allow file exist, ignoring file name: " + file);
                                    }
                                    
                              });

                              logger.info("scanFolderImages: Finish updating failed images info from failed folder into folder database...");
                        }

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);
                        
                        statement.reset();
                        db.close();

                        
                        resolve({ result: "success", newDefects: newDefects });
                  });
            } catch (error) {
                  logger.error("scanFolderImages: Failed initializing images scanning and verify integrity of database. Folder path: " + folderPath + "\n" + error);
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

                              if(row.status === imageStatus.failed){
                                    var defectStatement = db.prepare("SELECT * FROM image_defects WHERE image_id = " + row._id + ";");
                                    var defectName = [];
                                    while(defectStatement.step()){
                                          defectName.push(defectStatement.getAsObject());
                                    }
                                    row.defects = defectName;
                              }

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

function getImageDefects(folderPath, imageId){

      return new Promise((resolve, reject) => {
            logger.info("getImageDefects: getting image defect categories list...");
            var databasePath = path.join(folderPath, "./appdata/" + databaseName);
            var databaseBuffer, buffer;
            var result = [];

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then((SQL) => {
                        const db = new SQL.Database(databaseBuffer);

                        var statement = db.prepare("SELECT * FROM image_defects WHERE image_id = " + imageId + ";");

                        while(statement.step()){
                              result.push(statement.getAsObject());
                        }

                        logger.info("getImageDefects: Successful get image defect categories list");
                        resolve({ result: "success", items: result });
                  });

            } catch (error) {
                  logger.error("getImageDefects: Failed getting image defect categories list. Reason: " + error);
                  reject({ result: "error", reason: error });
            }
      });

}

async function updateImageStatus(folderPath, imageId, imageName, image_status){

      return new Promise(async (resolve, reject) => {
            logger.info("updateImageStatus: updating image status. Folder path: " + folderPath + ", Image name: " + imageName + ", Image status: " + JSON.stringify(image_status));
            var databasePath = path.join(folderPath, "./appdata/" + databaseName);
            var databaseBuffer, buffer;

            try {
                  databaseBuffer = fs.readFileSync(databasePath);

                  initSqlJs().then(async (SQL) => {
                        const db = new SQL.Database(databaseBuffer);

                        var statement = db.prepare("SELECT status FROM images WHERE _id = " + imageId + ";");
                        statement.step();

                        if(statement.getAsObject().status === 1){
                              logger.info("updateImageStatus: The image status in last modified are passed, deleting iamge from passed folder. Image name: " + imageName);
                              fs.unlinkSync(path.join(folderPath, "./passed/" + imageName));
                              logger.info("updateImageStatus: Successful deleted image in passed folder. Image name: " + imageName);
                        } else if(statement.getAsObject().status === 2){
                              logger.info("updateImageStatus: The image status in last modified are failed, deleting iamge from failed folder. Image name: " + imageName);
                              var defectStatement = db.prepare("SELECT defect_name from image_defects WHERE image_id = " + imageId + ";");
                              var defectName;
                              while(defectStatement.step()){
                                    defectName = defectStatement.getAsObject().defect_name;
                                    logger.info("updateImageStatus: Deleting image from path: ./failed/" + defectName + "/" + imageName);
                                    fs.unlinkSync(path.join(folderPath, "./failed/" + defectName + "/" + imageName));
                                    logger.info("updateImageStatus: Successful deleted image from path: ./failed/" + defectName + "/" + imageName);
                              }

                              defectStatement.reset();
                              db.run("DELETE FROM image_defects WHERE image_id = " + imageId + ";");
                              logger.info("updateImageStatus: Successful deleted image in failed folder. Image name: " + imageName);
                        }

                        statement.reset();

                        db.run("UPDATE images SET status = " + image_status.status + " WHERE _id = " + imageId + ";");

                        if(image_status.status === imageStatus.passed){
                              logger.info("updateImageStatus: Copying image into passed folder. Image Name: " + imageName);
                              fs.copyFileSync(path.join(folderPath, "./" + imageName), path.join(folderPath, "./passed/" + imageName));
                              logger.info("updateImageStatus: Successful copied image info passed folder. Image Name: " + imageName);
                        } else if(image_status.status === imageStatus.failed){
                              logger.info("updateImageStatus: Copying image into failed folder. Image Name: " + imageName);
                              var defectList = await localDatabase.getAllDefectInfo();
                              var defectValue;

                              for(var i = 0; i < image_status.defects.length; i++){
                                    defectValue = defectList.items.find(o => o._id === image_status.defects[i]);
                                    db.run("INSERT INTO image_defects (image_id, defect_name) VALUES (" + imageId + ", '" + defectValue.name + "');");

                                    if(!fs.existsSync(path.join(folderPath, "./failed/" + defectValue.name))){
                                          fs.mkdirSync(path.join(folderPath, "./failed/" + defectValue.name));
                                    }
                                    
                                    logger.info("updateImageStatus: Copying image into path: ./failed/" + defectValue.name + "/" + imageName);
                                    fs.copyFileSync(path.join(folderPath, "./" + imageName), path.join(folderPath, "./failed/" + defectValue.name + "/" + imageName));
                                    logger.info("updateImageStatus: Successful copied image into path: ./failed/" + defectValue.name + "/" + imageName);
                              }

                              logger.info("updateImageStatus: Successful copied image into failed folder. Image Name: " + imageName);
                        }

                        buffer = new Buffer(db.export());
                        fs.writeFileSync(databasePath, buffer);
                        logger.info("updateImageStatus: Successful update iamge status. Folder path: " + folderPath + ", Image id: " + imageId + ", Image status: " + JSON.stringify(image_status));
                        db.close();

                        resolve({ result: "success" });
                  });
            } catch(error) {
                  logger.error("updateImageStatus: Failed update image status. \n" + error);
            }

      });

}

module.exports = folderDatabase = {
      imageStatus: imageStatus,
      checkFolderDatabaseAndFolder,
      scanFolderImages,
      getAllImages,
      getImageDefects,
      updateImageStatus,
}