<template>
    <div class="header">
      <div class="d-flex bg-header pt-5 pb-4">
        <div class="flex-column ml-5 d-flex justify-content-start">
          <h1>folder1</h1>
          <button type="button" class="btn btn-primary btn-lg mt-2" @click="click_new_folder">New Images</button>
        </div>
      </div>

<nav class="navbar navbar-dark bg-dark">
  <!-- Navbar content -->
   <button class="btn btn-success me-2 btn-lg" type="button" data-target="#Table" >Pending</button>
   
          <button class="btn btn-success me-2 btn-lg" type="button">Failed</button>
          
          <button class="btn btn-success me-2 btn-lg" type="button">Passed</button>
          
          <button class="btn btn-success me-2 btn-lg" type="button">All</button>
  
 

</nav>
   
       <div id="Table">
      <b-table striped hover :items="items" :fields="fields" @row-clicked="clickHandler">
        <template #cell(action)>
          <b-button size="sm" @click="click_detail_btn"> Delete </b-button>
        </template>
      </b-table>
    </div>
    </div>
</template>

<script>
       export default {
  data() {
    return {
      fields: ["Number", "IMAGE_NAME", "CREATED_DATE", "ACTION"],
      items: [
        { Number: "1", IMAGE_NAME: "savadika.png", CREATED_DATE: "01/01/2012", ACTION: "bi bi-trash" },
        { Number: "2", IMAGE_NAME: "view.jpg", CREATED_DATE: "01/01/2012", ACTION: "bi bi-trash" },
      ],
      showLoading: false,
    };
  },
  methods: {
    click_new_folder() {
      alert("new folder is clicked! this should open a dialog for user to select folder");
      this.overlayBlocking()
    },
    click_detail_btn: () => {
      alert("YO 🥒🥒🥒🥒🥒🥒");
    },
    overlayBlocking() {
      this.showLoading = !this.showLoading;
      this.$store.commit("overlayBlockingAppSwitch", this.showLoading);
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