<template>
  <div class="folder">
    <div class="header">
      <div class="d-flex bg-header pt-5 pb-4">
        <div class="flex-column ml-5 d-flex justify-content-start">
          <h1>Folders</h1>
          <button type="button" class="btn btn-primary btn-lg mt-2" @click="click_new_folder">New Folder</button>
        </div>
      </div>
    </div>
    <div class="apptable">
      <b-table striped hover :items="items" :fields="fields" @row-clicked="clickHandler">
        <template #cell(action) = "row">
          <b-button size="sm" @click="click_detail_btn(row.index)"> Delete </b-button>
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
        {key: "name", label: "Folder Name"},
        {key: 'path', label: "Folder Path"},
        {key: 'date_created', label: "Date Created"},
        "action"
        ],
      items: [],
      showLoading: false,
    };
  },
  methods: {
    click_new_folder() {
      this.overlayBlocking();
      window.ipc.send("READ_FOLDER_PATH", {});
    },
    click_detail_btn(index) {
      if(confirm("Are you sure want to delete this folder?")){
        window.ipc.send("DELETE_FOLDER", {_id: this.items[index]._id});
      }
    },
    clickHandler(tablerow){
      this.$router.push({
        name: "Files",
        params: {
          folder_id: tablerow._id,
        },
      });
    },
    overlayBlocking() {
      this.showLoading = !this.showLoading;
      this.$store.commit("overlayBlockingAppSwitch", this.showLoading);
    },
  },
  mounted(){
    window.ipc.on("READ_FOLDER_PATH", (payload) => {
      if(payload.result == "success"){
        this.toast("Successful adding folder.");
      } else if(payload.result == "error"){
        this.toast("Failed adding folder info.", "error");
      }
      this.overlayBlocking();
      window.ipc.send("GET_ALL_FOLDER", {});
    });

    window.ipc.on("GET_ALL_FOLDER", (payload) => {
      if(payload.result == "success"){
        this.items = payload.items;
      } else if(payload.result == "error"){
        this.toast("Failed getting all folder info.", "error");
        this.items = [];
      }
    });

    window.ipc.on("DELETE_FOLDER", (payload) => {
      if(payload.result == "success"){
        this.toast("Successful deleting folder.");
      } else if(payload.result == "error") {
        this.toast("Failed deleting folder.", "error");
      }
      window.ipc.send("GET_ALL_FOLDER", {});
    });

    window.ipc.send("GET_ALL_FOLDER", {});
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