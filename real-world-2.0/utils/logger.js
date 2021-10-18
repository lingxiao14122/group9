const path = require("path");
const {app} = require("electron");
const log = require("electron-log");
log.transports.file.level = "info";
log.transports.file.file = path.join(app.getAppPath(), "./log/log-" + getCurrentDateTimeNumber() + ".log");
log.catchErrors();

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

function info(msg){
      log.info(msg);
}

function error(msg){
      log.error(msg);
}

function warn(msg){
      log.warn(msg);
}

module.exports = logger = {
      info,
      error,
      warn,
}