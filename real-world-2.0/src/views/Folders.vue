<template>
  <div class="folder">
    <div class="header">
      <div class="d-flex bg-header pt-5 pb-4">
        <div class="flex-column ml-5 d-flex justify-content-start">
          <h1>Folders</h1>
          <button
            type="button"
            class="btn btn-primary btn-lg mt-2"
            @click="clickNewFolder"
          >
            New Folder
          </button>
        </div>
      </div>
    </div>
    <div class="apptable">
      <b-table
        striped
        hover
        :items="items"
        :fields="fields"
        @row-clicked="clickHandler"
      >
        <template #cell(exist)="row">
          <b-icon-exclamation-triangle-fill v-if="!row.item.exist" variant="warning" v-b-tooltip.hover title="Folder not exist."></b-icon-exclamation-triangle-fill>
        </template>
        <template #cell(action)="row">
          <b-button size="sm" @click="clickDelete(row.index)">
            <b-icon-trash></b-icon-trash>
          </b-button>
          <b-button class="ml-2" size="sm" @click="clickOpenExplorer(row.item)">
            <b-icon-folder-symlink></b-icon-folder-symlink>
          </b-button>
        </template>
      </b-table>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: [
        { key: "exist", label: "" },
        { key: "name", label: "Folder Name" },
        { key: "path", label: "Folder Path" },
        { key: "date_created", label: "Date Created" },
        "action",
      ],
      items: [],
      showLoading: false,
    };
  },
  methods: {
    clickNewFolder() {
      this.overlayBlocking();
      window.ipc.send("READ_FOLDER_PATH", {});
    },
    clickDelete(index) {
      if (confirm("Are you sure want to delete this folder?")) {
        window.ipc.send("DELETE_FOLDER", { _id: this.items[index]._id });
      }
    },
    clickOpenExplorer(item) {
      if(item.exist){
        window.ipc.send("REVEAL_FOLDER_IN_EXPLORER", { path: item.path });
      } else {
        this.toast("The folder are not exist.", "error");
      }
    },
    clickHandler(tablerow) {
      if(tablerow.exist){
        this.$router.push({
          name: "Files",
          params: {
            folder_id: tablerow._id,
          },
        });
      } else {
        this.toast("The folder are not exist.", "error");
      }
    },
    overlayBlocking() {
      this.showLoading = !this.showLoading;
      this.$store.commit("overlayBlockingAppSwitch", this.showLoading);
    },
  },
  mounted() {
    window.ipc.on("READ_FOLDER_PATH", (payload) => {
      if (payload.result == "success") {
        this.toast("Successful adding folder.");
      } else if (payload.result == "error") {
        this.toast("Failed adding folder info.", "error");
      } else if (payload.result == "warn") {
        this.toast(
          "Failed adding folder info. Reason: " + payload.reason,
          "error"
        );
      }
      this.overlayBlocking();
      window.ipc.send("GET_ALL_FOLDER", {});
    });

    window.ipc.on("GET_ALL_FOLDER", (payload) => {
      if (payload.result == "success") {
        this.items = payload.items;
      } else if (payload.result == "error") {
        this.toast("Failed getting all folder info.", "error");
        this.items = [];
      }
    });

    window.ipc.on("DELETE_FOLDER", (payload) => {
      if (payload.result == "success") {
        this.toast("Successful deleting folder.");
      } else if (payload.result == "error") {
        if (payload.code == 1) {
          this.toast("Failed deleting folder. Reason: " + payload.reason, "error");
        } else {
          this.toast("Failed deleting folder.", "error");
        }
      }
      window.ipc.send("GET_ALL_FOLDER", {});
    });

    window.ipc.on("REVEAL_FOLDER_IN_EXPLORER", (payload) => {
      if(payload.result == "error"){
        this.toast("Failed revealing folder in explorer. Reason: " + payload.reason);
      }
    });

    window.ipc.send("GET_ALL_FOLDER", {});
  },
  beforeDestroy() {
    let activeChannel = ["READ_FOLDER_PATH", "GET_ALL_FOLDER", "DELETE_FOLDER", "REVEAL_FOLDER_IN_EXPLORER"];
    window.ipc.removeAllListeners(activeChannel);
  },
};
</script>

<style scoped>
.btn:hover {
  cursor: pointer;
}

.bg-header {
  background-color: rgb(182, 201, 253);
}

.flex-column {
  align-items: flex-start;
}
</style>