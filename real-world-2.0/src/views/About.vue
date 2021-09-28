<template>
  <div class="about">
    <h1>This is an about page</h1>
    <button type="button" @click="openFolder">Open Folder</button>
  </div>
</template>

<script>
export default {
  mounted() {
    window.ipc.on("READ_FOLDER_PATH", (payload) => {
      console.log(payload);
    });
  },
  methods: {
      openFolder: function () {
        window.ipc.send("READ_FOLDER_PATH", {"test": "test"} );
      }
  }
}
</script>
