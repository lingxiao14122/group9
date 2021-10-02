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
      <b-table striped hover :items="items" :fields="fields" @row-clicked="clickHandler"></b-table>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: ['no', 'folder_name', 'details', 'created_date', 'action'],
      items: [
        { no: 1, folder_name: "folder1", details: "details_text", created_date: "01/01/2012", action: "" },
        { no: 2, folder_name: "folder2", details: "details_text", created_date: "01/01/2012", action: "" },
      ],
    };
  },
  methods: {
    click_new_folder() {
      alert("new folder is clicked! this should open a dialog for user to select folder")
    }
  }
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