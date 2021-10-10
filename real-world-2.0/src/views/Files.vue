<template>
  <div class="header">
    <div class="d-flex bg-header pt-5 pb-4">
      <div class="flex-column ml-5 d-flex justify-content-start">
        <h1>{{folderInfo.name}}</h1>
        <h5>Folder Location: {{folderInfo.path}}</h5>
        <h5>{{count.pending}} images pending, {{count.passed}} images pass, {{count.failed}} images failed, total {{count.all}} images</h5>

        <!-- NOW TABLE DISPLAYING is for debug only! not a feature! -->
        <h5>NOW TABLE DISPLAYING: {{ tableIsDisplaying }}</h5>
        
        <button type="button" class="btn btn-primary btn-lg mt-2" @click="refresh_btn_clicked">Refresh</button>
      </div>
    </div>

    <nav class="bg-dark d-flex flex-row">
      <!-- Button Tab content -->
      <!-- <b-button-group> -->
      <button class="btn btn-tabs btn-tabs-lg" type="button" @click="tabClicked(tabletab.pending)">Pending</button>

      <button class="btn btn-tabs btn-tabs-lg" type="button" @click="tabClicked(tabletab.failed)">Failed</button>

      <button class="btn btn-tabs btn-tabs-lg" type="button" @click="tabClicked(tabletab.passed)">Passed</button>

      <button class="btn btn-tabs btn-tabs-lg" type="button" @click="tabClicked(tabletab.all)">All</button>

      <!-- </b-button-group> -->
    </nav>

    <div id="Table">
      <b-table striped hover :items="items" :fields="fields" @row-clicked="clickHandler">
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
      fields: [
        {key: "name", label: "Image Name"},
        {key: "date_created", label: "Date Created"}
      ],
      defaultFields: [
        {key: "name", label: "Image Name"},
        {key: "date_created", label: "Date Created"}
      ],
      allFields: [
        {key: "name", label: "Image Name"},
        {key: "status", label: "Status"},
        {key: "date_created", label: "Date Created"}
      ],
      items: [],
      allItems: [],
      pendingItems: [],
      passedItems: [],
      failedItems: [],
      count:{
        pending: 0,
        passed: 0,
        failed: 0,
        all: 0,
      },
      folderInfo: {},
      showLoading: false,
      tableIsDisplaying: "pending",
      tabletab: {
        pending: "pending",
        failed: "failed",
        passed: "passed",
        all: "all",
      },
    };
  },
  props: {
    folder_id: {
      type: Number,
      require: true,
    }
  },
  mounted(){
    window.ipc.on("GET_IMAGES", (payload) => {
      this.allItems = payload.imagesItem;
      this.folderInfo = payload.folderInfo;

      var count = {
        all: 0,
        pending: 0,
        passed: 0,
        failed: 0
      }

      var images = {
        pending: [],
        passed: [],
        failed: [],
      }

      this.allItems.forEach(function(item) {
        count.all++;
        if(item.status === 0){
          images.pending.push(item);
          count.pending++;
        } else if(item.status === 1){
          images.passed.push(item);
          count.passed++;
        } else if(item.status === 2){
          images.failed.push(item);
          count.failed++;
        }
      });

      this.pendingItems = images.pending;
      this.passedItems = images.passed;
      this.failedItems = images.failed;

      this.count.all = count.all;
      this.count.pending = count.pending;
      this.count.passed = count.passed;
      this.count.failed = count.failed;

      this.switchTable();
    });

    window.ipc.send("GET_IMAGES", {folder_id: this.folder_id});
  },
  methods: {
    refresh_btn_clicked() {
      window.ipc.send("GET_IMAGES", {folder_id: this.folder_id});
    },
    clickHandler(tablerow, index) {
      alert("row clicked index: " + index);
      console.log(tablerow);
    },
    tabClicked: function (tabname) {
      console.log(tabname);
      this.tableIsDisplaying = tabname;
      this.switchTable();
    },
    switchTable(){
      if(this.tableIsDisplaying === this.tabletab.pending){
        this.fields = this.defaultFields;
        this.items = this.pendingItems;
      }
      if(this.tableIsDisplaying === this.tabletab.passed){
        this.fields = this.defaultFields;
        this.items = this.passedItems;
      }
      if(this.tableIsDisplaying === this.tabletab.failed){
        this.fields = this.defaultFields;
        this.items = this.failedItems;
      }
      if(this.tableIsDisplaying === this.tabletab.all){
        this.fields = this.allFields;
        this.items = this.allItems;
      }
    }
  },
};
</script>


<style scoped>
.bg-header {
  background-color: rgb(182, 201, 253);
}

.flex-column {
  align-items: flex-start;
}

.btn-tabs {
  color: #fff;
  background-color: #398bf0;
  /* background-color: #fc8c8c; */
  border-radius: 0rem;
  width: 10rem;
}

.btn-tabs-lg {
  padding: 1rem 2rem;
  font-size: 1.25rem;
  line-height: 1.5;
}

.btn-tabs:hover {
  color: #fff;
  background-color: #2E6FBF;
  transform: translateY(-2px);
  transition: 0.3s;
  transition-timing-function: ease-in-out;
}

.btn-tabs:focus {
  box-shadow: 0 0 0 0;
  background-color: #1F4A80;
}

</style>