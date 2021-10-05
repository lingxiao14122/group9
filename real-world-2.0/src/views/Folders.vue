<template>
  <div class="folder">
    <div>
      <b-overlay :show="showLoading">
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
            <template #cell(action)>
              <b-button size="sm" @click="click_detail_btn"> Delete </b-button>
            </template>
          </b-table>
        </div>
      </b-overlay>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: ["folder_name", "path", "created_date", "action"],
      items: [
        { folder_name: "folder1", path: "c:/sasaa/sasas/asasas/", created_date: "01/01/2012", action: "" },
        { folder_name: "folder2", path: "c:/sasaa/sasas/asasas/", created_date: "01/01/2012", action: "" },
      ],
      showLoading: false,
    };
  },
  methods: {
    click_new_folder() {
      alert("new folder is clicked! this should open a dialog for user to select folder");
      this.showLoading = true
    },
    click_detail_btn: () => {
      alert("YO 🥒🥒🥒🥒🥒🥒");
    },
  },
};
</script>

<style scoped>
.btn:hover {
  cursor: pointer;
}

.bg-header {
  background-color: rgb(204, 253, 237);
}

.flex-column {
  align-items: flex-start;
}
</style>