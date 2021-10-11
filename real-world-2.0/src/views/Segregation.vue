<template>
  <div class="appsegregation">
    <div class="container">
      <h2>1/4</h2>
      <h2>All: 4 Pending: 4, Pass: 0, Failed: 0</h2>
      <div class="d-flex flex-column">
        <!-- Image background -->
        <div class="d-flex justify-content-center bg-custom">
          <!-- image holder -->
          <div class="d-flex image-holder">
            <b-img
              :src="currentImage"
              style="max-width: 100% !important; max-height: 100% !important; width: auto; height: auto; margin: auto"
            ></b-img>
          </div>
        </div>
        <!-- button group -->
        <div class="button-group mt-2 d-flex">
          <div>
            <b-button class="m-2 btn-seg-custom" variant="primary" @click="loadNextImage(-1)">
              <b-icon-arrow-left-circle></b-icon-arrow-left-circle>
            </b-button>
          </div>
          <div class="flex-grow-1">
            <b-button class="m-2 btn-seg-custom" variant="primary" @click="loadNextImage(1)">PASS</b-button>
            <b-button class="m-2 btn-seg-custom" variant="danger">FAIL</b-button>
          </div>
          <div>
            <b-button class="m-2 btn-seg-custom" variant="primary" @click="loadNextImage(1)">
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
  data() {
    return {
      currentImage: null,
      currentImageIndex: 0,
      pathToFolder: "C:\\Users\\lingx\\Desktop\\DeepPCB\\PCBData\\group00041\\00041",
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
      //direction 0 no move, direction 1 forward, direction -1 previous
      this.currentImageIndex = this.currentImageIndex + direction;
      console.log("at index : " + this.currentImageIndex);

      let currentImageName = this.imageCollection[this.currentImageIndex];
      console.log("image name" + currentImageName);

      let completeImagePath = this.pathToFolder + "\\" + currentImageName;
      console.log(completeImagePath);
      this.currentImage = completeImagePath;
    },
  },
  mounted() {
    this.loadNextImage(0);
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
</style>