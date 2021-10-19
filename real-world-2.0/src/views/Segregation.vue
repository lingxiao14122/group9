<template>
  <div class="appsegregation">
    <div class="container">
      <b-button class="btn" @click="returnToFiles">return</b-button>
      <h2>{{ currentImageIndex + 1 }}/{{ items.length }}</h2>
      <h2>
        All: {{ items.length }} Pending: {{ count.pending }}, Pass:
        {{ count.passed }}, Failed: {{ count.failed }}
      </h2>
      <div class="d-flex flex-column">
        <!-- Image background -->
        <div class="d-flex justify-content-center bg-custom">
          <!-- image holder -->
          <div class="d-flex image-holder">
            <b-img :src="currentImage" class="bootstrap-image" fluid></b-img>
          </div>
        </div>
        <!-- button group -->
        <div class="button-group mt-2 d-flex">
          <div>
            <b-button
              class="m-2 btn-seg-custom"
              variant="primary"
              @click="loadNextImage(-1)"
            >
              <b-icon-arrow-left-circle></b-icon-arrow-left-circle>
            </b-button>
          </div>
          <div class="flex-grow-1">
            <b-button
              class="m-2 btn-seg-custom"
              variant="primary"
              @click="loadNextImage(1)"
              >PASS</b-button
            >
            <b-button class="m-2 btn-seg-custom" 
              variant="danger"
              >FAIL</b-button
            >
          </div>
          <div>
            <b-button
              class="m-2 btn-seg-custom"
              variant="primary"
              @click="loadNextImage(1)"
            >
              <b-icon-arrow-right-circle></b-icon-arrow-right-circle>
            </b-button>
          </div>
        </div>
        <!-- button group end -->
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
      pathToFolder:
        "C:\\Users\\lingx\\Desktop\\DeepPCB\\PCBData\\group00041\\00041",
      //   https://github.com/tangsanli5201/DeepPCB
      imageCollection: [
        "00041000_temp.jpg",
        "00041000_test.jpg",
        "00041001_temp.jpg",
        "00041001_test.jpg",
        "00041002_temp.jpg",
      ],
    };
  },
  methods: {
    // purpose of this function is just to modify this.currentImage state only
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
    console.log(this.folder_id);
    console.log(this.index);
    console.log(this.items);
    this.currentImageIndex = this.index;
    this.loadNextImage(0);
    this.updateCounting();
  },
};
</script>

<style scoped>
.image-holder {
  max-height: 70vh;
  width: auto;
}

.container {
  padding-right: 0px;
  padding-left: 0px;
}

.bg-custom {
  background-color: rgb(65, 65, 65);
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
</style>