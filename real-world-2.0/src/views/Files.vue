<template>
  <div class="header">
    <div class="d-flex bg-header pt-5 pb-4">
      <div class="flex-column ml-5 d-flex justify-content-start">
        <h1>folder1</h1>
        <h5>10 images pending, 2 images pass, 0 images failed</h5>

        <!-- NOW TABLE DISPLAYING is for debug only! not a feature! -->
        <h5>NOW TABLE DISPLAYING: {{ tableIsDisplaying }}</h5>
        
        <button type="button" class="btn btn-primary btn-lg mt-2" @click="click_new_folder">New Images</button>
      </div>
    </div>

    <nav class="bg-dark d-flex flex-row">
      <!-- Button Tab content -->
      <!-- <b-button-group> -->
        <button class="btn btn-tabs btn-lg" type="button" @click="tabClicked(tabletab.pending)">Pending</button>

        <button class="btn btn-tabs btn-lg" type="button" @click="tabClicked(tabletab.failed)">Failed</button>

        <button class="btn btn-tabs btn-lg" type="button" @click="tabClicked(tabletab.passed)">Passed</button>

        <button class="btn btn-tabs btn-lg" type="button" @click="tabClicked(tabletab.all)">All</button>
        
      <!-- </b-button-group> -->
    </nav>

    <div id="Table">
      <b-table striped hover :items="items" :fields="fields" @row-clicked="rowClickHandler">
        <template #cell(action)>
          <b-button size="sm" @click="click_action_btn"> Delete </b-button>
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
      tableIsDisplaying: null,
      tabletab: {
        pending: "pending",
        failed: "failed",
        passed: "passed",
        all: "all",
      },
    };
  },
  methods: {
    click_new_folder() {
      alert("new image is clicked!");
    },
    click_action_btn() {
      alert("delete button clicked");
    },
    rowClickHandler() {
      alert("row clicked");
    },
    tabClicked: function (tabname) {
      console.log(tabname);
      this.tableIsDisplaying = tabname;
    },
  },
};
</script>


<style scoped>
.bg-header {
  background-color: rgb(204, 253, 237);
}

.flex-column {
  align-items: flex-start;
}

.btn-tabs {
  color: #fff;
  background-color: #ff9494;
  /* background-color: #fc8c8c; */
  border-radius: 0rem;
  width: 10rem;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.25rem;
  line-height: 1.5;
}
  
  .btn:hover {
    color: #fff;
    background-color: #fc8181;
    transform: translateY(-2px);
    transition: 0.3s;
    transition-timing-function: ease-in-out;
  }

.btn:focus {
  box-shadow: 0 0 0 0 #ffc7c7;
  background-color: #e76e6e;
}

/* .btn:focus {
  box-shadow: 0 0 0 0 ;
  background-color: #dd6060;
} */
</style>