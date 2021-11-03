<template>
  <div class="appsegregation d-flex flex-column flex-grow-1">
    <div class="container">
      <div class="btn-back d-flex mx-5">
        <b-button class="btn mt-3" @click="returnToFiles">Return</b-button>
      </div>

      <!-- Info bar start -->
      <div class="infobar mx-5">
        <!-- row 1 -->
        <div class="infobar-1 d-flex align-items-end justify-content-between">
          <h5>Image Name: {{ items[currentImageIndex].name }}</h5>
          <h2>{{ currentImageIndex + 1 }}/{{ items.length }}</h2>
        </div>
        <!-- row 2 -->
        <div class="infobar-2 d-flex justify-content-between">
          <h5>Status: {{ transformStatusToString(items[currentImageIndex].status) }}</h5>
          <h5>
            All: {{ items.length }}, Pending: {{ count.pending }}, Passed: {{ count.passed }}, Failed:
            {{ count.failed }}
          </h5>
        </div>
        <!-- row 3 -->
        <div class="infobar-3 d-flex align-items-start justify-content-between">
          <h5 class="w-75">Defect Category: {{ getImageDefectsString() }}</h5>
          <div class="d-flex">
            <b-button class="btn ml-2" size="sm" @click="$bvModal.show('modal-fail-percent')">
              <b-icon-percent></b-icon-percent>
            </b-button>
          </div>
        </div>
      </div>

      <!-- Image start -->
      <div class="d-flex flex-column">
        <div class="d-flex justify-content-center bg-custom">
          <div class="image-wrapper">
            <b-img :src="currentImage" class="c-image1"></b-img>
          </div>
        </div>
      </div>

      <!-- Btn group start -->
      <div class="button-group mt-2 mx-5 d-flex align-self-end">
        <div>
          <b-button
            class="m-2 btn-seg-custom"
            variant="primary"
            @click="checkImageAvailablity(-1)"
            :disabled="prevBtnIsDisabled"
          >
            <b-icon-arrow-left-circle></b-icon-arrow-left-circle>
          </b-button>
        </div>
        <div class="flex-grow-1">
          <b-button class="m-2 btn-seg-custom" variant="primary" @click="passBtnClicked()">PASS</b-button>
          <b-button class="m-2 btn-seg-custom" variant="danger" @click="showingDefectModal()">FAIL</b-button>
        </div>
        <div>
          <b-button
            class="m-2 btn-seg-custom"
            variant="primary"
            @click="checkImageAvailablity(1)"
            :disabled="nextBtnIsDisabled"
          >
            <b-icon-arrow-right-circle></b-icon-arrow-right-circle>
          </b-button>
        </div>
      </div>
    </div>

    <!-- Modal choose defect start -->
    <div class="modal-defect">
      <b-modal id="choose-defect-modal" title="Choose Defect" v-model="showDefectModal" :hide-footer="isDefectNotEmpty">
        <b-form-group v-slot="{ ariaDescribedby }">
          <h6 v-if="isDefectNotEmpty">Defect Category are empty.</h6>
          <b-form-checkbox-group
            v-model="defectSelected"
            :options="defectOptions"
            :aria-describedby="ariaDescribedby"
            stacked
            size="lg"
          ></b-form-checkbox-group>
        </b-form-group>
        <template #modal-footer>
          <div class="d-flex flex-grow-1 justify-content-between">
            <b-button v-b-modal.new-defect-modal>Add New Defect</b-button>
            <div class="d-flex">
              <b-button class="mx-1" @click="$bvModal.hide('choose-defect-modal')">Cancel</b-button>
              <b-button @click="defectModalOk" variant="primary">OK</b-button>
            </div>
          </div>
        </template>
      </b-modal>
    </div>

    <!-- Modal New Defect start -->
    <div class="new-defect">
      <b-modal v-model="showNewDefectModal" id="new-defect-modal" title="New Defect Category">
        <b-form id="new-defect-form" @submit="onNewDefectSubmit" @reset="onNewDefectReset">
          <b-form-group id="input-group-1" label="Defect Name:" label-for="input-1">
            <b-form-input
              id="input-1"
              v-model="newDefectForm.defectName"
              placeholder="Enter defect name"
              :state="validateState('defectName')"
            >
            </b-form-input>

            <b-form-invalid-feedback id="input-1-live-feedback">This is a required field.</b-form-invalid-feedback>
          </b-form-group>
        </b-form>
        <template #modal-footer>
          <b-button type="reset" form="new-defect-form">Reset</b-button>
          <b-button type="submit" form="new-defect-form" variant="primary">Submit</b-button>
        </template>
      </b-modal>
    </div>

    <!-- Modal fail percent start -->
    <b-modal id="modal-fail-percent" scrollable title="Progress Percentage" hide-footer>
      <div v-for="item in modalFailTop" :key="item" style="margin-bottom: 1rem">
        <p style="margin: 0px">
          {{ item.title + ": " }}
          {{ parseFloat(item.percent).toFixed(2) + "%" }}
        </p>
        <b-progress :value="item.percent" max="100" :variant="item.variant" show-progress></b-progress>
      </div>
      <hr />
      <h6>Defect Categories</h6>
      <div v-for="item in modalFailBottom" :key="item" style="margin-bottom: 1rem">
        <p style="margin: 0px">
          {{ item.title + ": " }}
          {{ parseFloat(item.percent).toFixed(2) + "%" }}
        </p>
        <b-progress :value="item.percent" max="100" variant="info" show-progress></b-progress>
      </div>
    </b-modal>
  </div>
</template>

<script>
export default {
  props: {
    folder_id: {
      type: Number,
      require: true,
    },
    index: {
      type: Number,
      require: true,
    },
    items: {
      type: Array,
      require: true,
    },
  },
  data() {
    return {
      brokenImage: require("../assets/broken_image.png"),
      currentImage: null,
      currentImageIndex: 0,
      count: {
        pending: 0,
        passed: 0,
        failed: 0,
      },
      // Button state
      prevBtnIsDisabled: false,
      nextBtnIsDisabled: false,
      // Defect Modal state
      showDefectModal: false,
      isDefectNotEmpty: false,
      //New Defect Modal state
      showNewDefectModal: false,
      newDefectForm: {
        defectName: "",
      },
      // Fail Percentage Modal state
      modalFailTop: [
        { index: 0, title: "Overall Percentage", percent: 0.0, variant: "" },
        { index: 1, title: "Passed Percentage", percent: 0.0, variant: "success" },
        { index: 2, title: "Failed Percentage", percent: 0.0, variant: "danger" },
      ],
      modalFailBottom: [
      ],
      //example of defectOptions
      // [
      //   { text: "Orange", value: "orange" },
      //   { text: "Apple", value: "apple" },
      //   { text: "Pineapple", value: "pineapple" },
      //   { text: "Grape", value: "grape" },
      // ]
      defectOptions: [],
      defectSelected: [],
      // pathToFolder: "C:\\Users\\lingx\\Desktop\\DeepPCB\\PCBData\\group00041\\00041",
      // //   https://github.com/tangsanli5201/DeepPCB
      // imageCollection: [
      //   "00041000_temp.jpg",
      //   "00041000_test.jpg",
      //   "00041001_temp.jpg",
      //   "00041001_test.jpg",
      //   "00041002_temp.jpg",
      // ],
    };
  },
  methods: {
    checkBtnDisable() {
      if (this.items.length === 1) {
        this.prevBtnIsDisabled = true;
        this.nextBtnIsDisabled = true;
      } else if (this.currentImageIndex === 0) {
        this.prevBtnIsDisabled = true;
        this.nextBtnIsDisabled = false;
      } else if (this.currentImageIndex === this.items.length - 1) {
        this.prevBtnIsDisabled = false;
        this.nextBtnIsDisabled = true;
      } else {
        this.prevBtnIsDisabled = false;
        this.nextBtnIsDisabled = false;
      }
    },
    checkImageAvailablity(direction) {
      var nextIndex = this.currentImageIndex + direction;

      if (nextIndex < 0) {
        this.toast("No image at front.", "error");
      } else if (nextIndex === this.items.length) {
        this.toast("No image at end.", "error");
      } else {
        window.ipc.send("CHECK_IMAGE_AVAILABILITY", {
          direction: direction,
          image: this.items[nextIndex],
        });
      }
    },
    //purpose of this function is just to modify this.currentImage state only
    loadNextImage(iamgeExist, direction) {
      if (this.currentImageIndex === 0 && direction === -1) {
        this.toast("No image at front.", "error");
      } else if (this.currentImageIndex === this.items.length - 1 && direction === 1) {
        this.toast("No image at end.", "error");
      } else {
        //direction 0 no move, direction 1 forward, direction -1 previous
        this.currentImageIndex = this.currentImageIndex + direction;

        if (iamgeExist) {
          this.currentImage = this.items[this.currentImageIndex].path;
        } else {
          this.currentImage = this.brokenImage;
        }

        this.updateCounting();
        this.checkBtnDisable();
      }
    },
    updateCounting() {
      if (this.items.length !== 0) {
        var pending = 0,
          passed = 0,
          failed = 0;
        var defectsCount = [];
        var defectFound;
        var temp;

        for (var i = 0; i < this.items.length; i++) {
          if (this.items[i].status == 0) {
            pending++;
          } else if (this.items[i].status == 1) {
            passed++;
          } else if (this.items[i].status == 2) {
            failed++;

            for (var j = 0; j < this.items[i].defects.length; j++) {
              defectFound = defectsCount.findIndex((obj) => {
                return obj.title === this.items[i].defects[j].defect_name;
              });

              if (defectFound === -1) {
                defectsCount.push({
                  _id: this.items[i].defects[j]._id,
                  title: this.items[i].defects[j].defect_name,
                  count: 1,
                  percent: 1,
                });
              } else {
                temp = defectsCount[defectFound].count;
                defectsCount[defectFound].count = temp + 1;
              }
            }
          }
        }

        defectsCount.forEach((defect) => {
          defect.percent = (defect.count / failed) * 100;
        });

        this.count.pending = pending;
        this.count.passed = passed;
        this.count.failed = failed;
        this.modalFailTop[0].percent = 100 - (pending / this.items.length) * 100;
        this.modalFailTop[1].percent = (passed / this.items.length) * 100;
        this.modalFailTop[2].percent = (failed / this.items.length) * 100;
        this.modalFailBottom = defectsCount;
      } else {
        this.count.pending = 0;
        this.count.passed = 0;
        this.count.failed = 0;
        this.modalFailTop[0].percent = 0;
        this.modalFailTop[1].percent = 0;
        this.modalFailTop[2].percent = 0;
      }
    },
    passBtnClicked() {
      this.sendIpcAndUpdateImageStatus(0);
    },
    showingDefectModal() {
      this.showDefectModal = true;
      window.ipc.send("GET_ALL_DEFECT", {});
    },
    defectModalOk() {
      // when ok button on modal is clicked
      this.sendIpcAndUpdateImageStatus(1);
      // manually hide the modal
      this.$bvModal.hide("defect-modal-form");
    },
    //if status = 0 means image pass, status = 1 means image failed,
    sendIpcAndUpdateImageStatus(status) {
      var request;
      switch (status) {
        case 0: {
          request = {
            folder_id: this.folder_id,
            image_id: this.items[this.currentImageIndex]._id,
            image_name: this.items[this.currentImageIndex].name,
            image_status: {
              status: 1,
              defects: [],
            },
          };
          window.ipc.send("UPDATE_IMAGE_STATUS", request);
          break;
        }
        case 1: {
          request = {
            folder_id: this.folder_id,
            image_id: this.items[this.currentImageIndex]._id,
            image_name: this.items[this.currentImageIndex].name,
            image_status: {
              status: 2,
              defects: this.defectSelected,
            },
          };
          window.ipc.send("UPDATE_IMAGE_STATUS", request);
          break;
        }
      }
    },
    returnToFiles() {
      this.$router.push({
        name: "Files",
        params: {
          folder_id: this.folder_id,
        },
      });
    },
    transformStatusToString(data) {
      if (data === 0) {
        return "Pending";
      }
      if (data === 1) {
        return "Passed";
      }
      if (data === 2) {
        return "Failed";
      }

      return "err_no_status";
    },
    getImageDefectsString() {
      if (this.items[this.currentImageIndex].status == 2) {
        var defectList = this.items[this.currentImageIndex].defects;
        var defectString = "";

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
    // Modal New Defect methods start
    // form state is "newDefectForm", please refractor
    validateState() {
    },
    onNewDefectSubmit(event) {
      event.preventDefault();
    },
    onNewDefectReset() {
    },
    // Modal New Defect methods end
  },
  mounted() {
    window.ipc.on("CHECK_IMAGE_AVAILABILITY", (payload) => {
      if (payload.result == "error") {
        if (payload.code == 1) {
          this.toast("Failed getting image from the folder. Reason: " + payload.reason, "error");
        } else {
          this.toast("Failed getting image from the folder.", "error");
        }
      } else {
        if (payload.result == "warn") {
          if (!payload.exist) {
            this.toast("Failed getting image from the folder. Reason: Image are not exist in the folder.", "error");
          } else {
            this.toast("Failed getting image from the folder.", "error");
          }
        }
        this.loadNextImage(payload.exist, payload.direction);
      }
    });

    window.ipc.on("GET_ALL_DEFECT", (payload) => {
      if (payload.result == "error") {
        this.toast("Failed getting all defect categories.", "error");
        this.isDefectNotEmpty = true;
      } else {
        if (payload.items.length == 0) {
          this.isDefectNotEmpty = true;
        } else {
          this.isDefectNotEmpty = false;
        }

        var defects = [];

        for (var i = 0; i < payload.items.length; i++) {
          defects.push({ text: payload.items[i].name, value: payload.items[i]._id });
        }

        this.defectOptions = defects;
      }
    });

    window.ipc.on("UPDATE_IMAGE_STATUS", (payload) => {
      if (payload.result == "success") {
        this.items[this.currentImageIndex].status = payload.image_status.status;
        if (payload.image_status.status == 2) {
          this.items[this.currentImageIndex].defects = payload.image_status.defects;
        }
        this.updateCounting();
        this.checkImageAvailablity(1);
      } else if (payload.result == "error") {
        this.toast("Failed updating current image status.", "error");
      }
    });

    this.currentImageIndex = this.index;
    this.checkImageAvailablity(0);
  },
  beforeDestroy() {
    let activeChannel = ["CHECK_IMAGE_AVAILABILITY", "GET_ALL_DEFECT", "UPDATE_IMAGE_STATUS"];
    window.ipc.removeAllListeners(activeChannel);
  },
};
</script>

<style scoped>
.image-holder {
  max-height: 70vh;
  width: auto;
}

.container {
  height: 100%;
  padding-right: 0px;
  padding-left: 0px;
}

.btn-seg-custom {
  padding: 0.75rem 2rem;
  font-size: 1.5rem;
  line-height: 1.5;
}

.bootstrap-image {
  max-width: 100% !important;
  max-height: 100% !important;
  width: auto;
  height: auto;
  margin: auto;
}

.image-wrapper {
  min-height: calc(100vh - 270px);
}

.c-image1 {
  max-height: calc(100vh - 270px);
  max-width: calc(100vw - 270px);
}

.c-image {
  max-height: 100px;
  min-height: 100px;
}

.infobar-3 h5 {
  text-align: start;
  word-break: break-word;
}
</style>