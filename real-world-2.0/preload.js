const { contextBridge, ipcRenderer } = require('electron');

const validChannels = [
      "CHECK_LOCAL_DB_INTEGRITY",
      "READ_FOLDER_PATH", 
      "GET_ALL_FOLDER", 
      "DELETE_FOLDER",
      "GET_IMAGES",
      "TEST"];

contextBridge.exposeInMainWorld(
      'ipc', {
      send: (channel, data) => {
            if (validChannels.includes(channel)) {
                  ipcRenderer.send(channel, data);
            }
      },
      on: (channel, func) => {
            if (validChannels.includes(channel)) {
                  // Strip event as it includes `sender` and is a security risk
                  ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
      },
      removeAllListeners: (channel) => {
            channel.map((singleChannel) => {
                  ipcRenderer.removeAllListeners(singleChannel);
            })

      }
},
);