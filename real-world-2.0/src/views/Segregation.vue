<template>
  <div class="appsegregation d-flex flex-column flex-grow-1">
    <div class="container">
      <div class="btn-back d-flex mx-5">
        <b-button class="btn mt-3" @click="returnToFiles">Return</b-button>
      </div>

      <!-- Info bar start -->

      <div class="infobar mx-5">
        <div class="infobar-top d-flex align-items-end justify-content-between">
          <h5>Image Name: {{ items[currentImageIndex].name }}</h5>
          <h2>{{ currentImageIndex + 1 }}/{{ items.length }}</h2>
        </div>

        <div class="infobar-below d-flex justify-content-between">
          <h5>Status: Pending</h5>
          <h5>
            All: {{ items.length }} Pending: {{ count.pending }}, Pass:
            {{ count.passed }}, Failed: {{ count.failed }}
          </h5>
        </div>

        <div class="infobar-below d-flex justify-content-between">
          <h5>Defect Category: -</h5>
        </div>
      </div>

      <!-- Info bar end -->

      <div class="d-flex flex-column">
        <!-- Image background -->
        <div class="d-flex justify-content-center bg-custom">
          <div class="image-wrapper">
            <b-img
              :src="currentImage"
              style="max-height: 65vh; width: 100%"
            ></b-img>
          </div>
        </div>
      </div>
    </div>
    <div class="flex-grow-1 d-flex align-items-end">
      <div class="container mb-3 mx-5">
        <div class="button-group mt-2 d-flex align-self-end">
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
            <b-button
              class="m-2 btn-seg-custom"
              variant="primary"
              @click="checkImageAvailablity(1)"
              >PASS</b-button
            >
            <b-button class="m-2 btn-seg-custom" variant="danger"
              >FAIL</b-button
            >
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
    </div>
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
      currentImage: null,
      currentImageIndex: 0,
      count: {
        pending: 0,
        passed: 0,
        failed: 0,
      },
      prevBtnIsDisabled: false,
      nextBtnIsDisabled: false,
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
      window.ipc.send("CHECK_IMAGE_AVAILABILITY", {
        direction: direction,
        image: this.items[nextIndex],
      });
    },
    //purpose of this function is just to modify this.currentImage state only
    loadNextImage(direction) {
      if (this.currentImageIndex === 0 && direction === -1) {
        this.toast("No image at front.", "error");
      } else if (
        this.currentImageIndex === this.items.length - 1 &&
        direction === 1
      ) {
        this.toast("No image at end.", "error");
      } else {
        //direction 0 no move, direction 1 forward, direction -1 previous
        this.currentImageIndex = this.currentImageIndex + direction;
        console.log("at index : " + this.currentImageIndex);

        this.currentImage = this.items[this.currentImageIndex].path;
        console.log(this.currentImage);

        this.updateCounting();
        this.checkBtnDisable();
      }
    },
    updateCounting() {
      if (this.items.length !== 0) {
        var pending = 0,
          passed = 0,
          failed = 0;

        for (var i = 0; i < this.items.length; i++) {
          if (this.items[i].status == 0) {
            pending++;
          } else if (this.items[i].status == 1) {
            passed++;
          } else if (this.items[i].status == 2) {
            failed++;
          }
        }

        this.count.pending = pending;
        this.count.passed = passed;
        this.count.failed = failed;
      } else {
        this.count.pending = 0;
        this.count.passed = 0;
        this.count.failed = 0;
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
  },
  mounted() {
    window.ipc.on("CHECK_IMAGE_AVAILABILITY", (payload) => {
      console.log(payload);
      if (payload.result == "error") {
        if (payload.code == 1) {
          this.toast(
            "Failed getting image from the folder. Reason: " + payload.reason,
            "error"
          );
        } else {
          this.toast("Failed getting image from the folder.", "error");
        }
      } else {
        if (payload.result == "warn") {
          if (!payload.exist) {
            this.toast(
              "Failed getting image from the folder. Reason: Image are not exist in the folder.",
              "error"
            );
          } else {
            this.toast(
              "Failed getting image from the folder.",
              "error"
            );
          }
        }
        this.loadNextImage(payload.direction);
      }
    });

    console.log(this.folder_id);
    console.log(this.index);
    console.log(this.items);
    this.currentImageIndex = this.index;
    this.checkImageAvailablity(0);
    //this.loadNextImage(0);
  },
  beforeDestory() {
    let activeChannel = ["CHECK_IMAGE_AVAILABILITY"];
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

/* .bg-custom {
   background-color: rgb(65, 65, 65);
} */

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
</style>