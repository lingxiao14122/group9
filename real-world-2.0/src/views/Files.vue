<template>
  <div class="header">
    <div class="d-flex bg-header pt-5 pb-4">
      <div class="flex-column ml-5 d-flex justify-content-start">
        <h1>{{ folderInfo.name }}</h1>
        <h5>Folder Location: {{ folderInfo.path }}</h5>
        <h5>
          {{ count.pending }} images pending, {{ count.passed }} images pass,
          {{ count.failed }} images failed, total {{ count.all }} images
        </h5>

        <!-- NOW TABLE DISPLAYING is for debug only! not a feature! -->
        <h5>NOW TABLE DISPLAYING: {{ tableIsDisplaying }}</h5>

        <div class="d-flex mt-2">
          <button type="button" class="btn btn-primary" @click="clickRefresh">Refresh</button>
        </div>
      </div>
    </div>

    <nav class="bg-dark d-flex flex-row">
      <!-- Button Tab content -->
      <!-- <b-button-group> -->
      <button
        class="btn btn-tabs btn-tabs-lg"
        type="button"
        @click="tabClicked(tabletab.pending)"
      >
        Pending
      </button>

      <button
        class="btn btn-tabs btn-tabs-lg"
        type="button"
        @click="tabClicked(tabletab.failed)"
      >
        Failed
      </button>

      <button
        class="btn btn-tabs btn-tabs-lg"
        type="button"
        @click="tabClicked(tabletab.passed)"
      >
        Passed
      </button>

      <button
        class="btn btn-tabs btn-tabs-lg"
        type="button"
        @click="tabClicked(tabletab.all)"
      >
        All
      </button>

      <!-- </b-button-group> -->
    </nav>

    <div id="Table">
      <b-table
        striped
        hover
        :items="items"
        :fields="fields"
        @row-clicked="clickHandler"
      >
        <template #cell(status)="data">
          {{ transformStatusToString(data) }}
        </template>

        <template #cell(defects)="data">
          {{ getImageDefectsString(data) }}
        </template>

        <template #cell(action)="row">
          <b-button size="sm" @click="clickOpenExplorer(row)">
            <b-icon-folder-symlink></b-icon-folder-symlink>
          </b-button>

          <b-button class="ml-2" size="sm" @click="clickPreviewImage(row)">
            <b-icon-image-fill></b-icon-image-fill>
          </b-button>
        </template>
      </b-table>
    </div>
    <div class="image-preview">
      <b-modal v-model="showImagePreviewModal" id="image-preview-modal" :title="currentImagePreviewName" hide-footer>
        <div class="d-flex justify-content-center">
          <img :src="currentImagePreview" alt="" style="max-width: 100%;">
        </div>
      </b-modal>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: [
        { key: "name", label: "Image Name" },
        { key: "date_created", label: "Date Created" },
        "action",
      ],
      defaultFields: [
        { key: "name", label: "Image Name" },
        { key: "date_created", label: "Date Created" },
        "action",
      ],
      allFields: [
        { key: "name", label: "Image Name" },
        { key: "status", label: "Status" },
        { key: "defects", label: "Defect Categories" },
        { key: "date_created", label: "Date Created" },
        "action",
      ],
      failedFields: [
        { key: "name", label: "Image Name" },
        { key: "defects", label: "Defect Categories" },
        { key: "date_created", label: "Date Created" },
        "action",
      ],
      items: [],
      allItems: [],
      pendingItems: [],
      passedItems: [],
      failedItems: [],
      count: {
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
      //image preview modal
      showImagePreviewModal: false,
      currentImagePreviewName: "",
      currentImagePreview: null,
    };
  },
  props: {
    folder_id: {
      type: Number,
      require: true,
    },
  },
  methods: {
    clickRefresh() {
      window.ipc.send("GET_IMAGES", { folder_id: this.folder_id });
    },
    clickHandler(tablerow, index) {
      if (this.tableIsDisplaying === this.tabletab.all) {
        this.$router.push({
          name: "Segregation",
          params: {
            folder_id: this.folder_id,
            index: index,
            items: this.allItems,
          },
        });
      } else {
        let items = this.allItems;
        let index = items.findIndex((x) => x._id === tablerow._id);

        this.$router.push({
          name: "Segregation",
          params: {
            folder_id: this.folder_id,
            index: index,
            items: this.allItems,
          },
        });
      }
    },
    clickOpenExplorer(row) {
      window.ipc.send("REVEAL_FOLDER_IN_EXPLORER", { path: row.item.path });
    },
    clickPreviewImage(row){
      this.currentImagePreviewName = row.item.name;
      this.currentImagePreview = row.item.path;
      this.showImagePreviewModal = true;
    },
    tabClicked: function (tabname) {
      this.tableIsDisplaying = tabname;
      this.switchTable();
    },
    switchTable() {
      if (this.tableIsDisplaying === this.tabletab.pending) {
        this.fields = this.defaultFields;
        this.items = this.pendingItems;
      }
      if (this.tableIsDisplaying === this.tabletab.passed) {
        this.fields = this.defaultFields;
        this.items = this.passedItems;
      }
      if (this.tableIsDisplaying === this.tabletab.failed) {
        this.fields = this.failedFields;
        this.items = this.failedItems;
      }
      if (this.tableIsDisplaying === this.tabletab.all) {
        this.fields = this.allFields;
        this.items = this.allItems;
      }
    },
    transformStatusToString(data) {
      let receiveStatusCodeFromTable = data.item.status;

      if (receiveStatusCodeFromTable === 0) {
        return "Pending";
      }
      if (receiveStatusCodeFromTable === 1) {
        return "Passed";
      }
      if (receiveStatusCodeFromTable === 2) {
        return "Failed";
      }

      return "err_no_status";
    },
    getImageDefectsString(data) {
      let status = data.item.status;
      let defectList = data.item.defects;
      let defectString = "";

      if (status === 2) {
        for (var i = 0; i < defectList.length; i++) {
          defectString = defectString + defectList[i].defect_name;
          if (i < defectList.length - 1) {
            defectString = defectString + ", ";
          }
        }

        return defectString;
      } else {
        return "-";
      }
    },
  },
  mounted() {
    window.ipc.on("GET_IMAGES", (payload) => {
      if (payload.result === "success") {
        this.allItems = payload.imagesItem;
        this.folderInfo = payload.folderInfo;

        var count = {
          all: 0,
          pending: 0,
          passed: 0,
          failed: 0,
        };

        var images = {
          pending: [],
          passed: [],
          failed: [],
        };

        this.allItems.forEach(function (item) {
          count.all++;
          if (item.status === 0) {
            images.pending.push(item);
            count.pending++;
          } else if (item.status === 1) {
            images.passed.push(item);
            count.passed++;
          } else if (item.status === 2) {
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
      } else if (payload.result == "error") {
        this.folderInfo = {
          name: "",
          path: "",
        };

        this.count.all = 0;
        this.count.pending = 0;
        this.count.passed = 0;
        this.count.failed = 0;

        this.allItems = [];
        this.pendingItems = [];
        this.passedItems = [];
        this.failedItems = [];

        if (payload.code == 1) {
          this.toast("Failed getting folder images info. Reason: " + payload.reason + " " + payload.solution, "error");
          this.toast("Getting folder images info again.");
          window.ipc.send("GET_IMAGES", { folder_id: this.folder_id });
        } else if (payload.code == 2) {
          this.toast("Failed getting folder images info. Reason: " + payload.reason, "error");
        } else {
          this.toast("Failed getting folder images info.", "error");
        }
      }
    });

    window.ipc.on("REVEAL_FOLDER_IN_EXPLORER", (payload) => {
      if(payload.result == "error"){
        this.toast("Failed revealing file in explorer. Reason: " + payload.reason);
      }
    });

    window.ipc.send("GET_IMAGES", { folder_id: this.folder_id });
  },
  beforeDestroy() {
    let activeChannel = ["GET_IMAGES", "REVEAL_FOLDER_IN_EXPLORER"];
    window.ipc.removeAllListeners(activeChannel);
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
  background-color: #2e6fbf;
  transform: translateY(-2px);
  transition: 0.3s;
  transition-timing-function: ease-in-out;
}

.btn-tabs:focus {
  box-shadow: 0 0 0 0;
  background-color: #1f4a80;
}
</style>