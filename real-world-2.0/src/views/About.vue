<template>
  <div class="about">
    <h1>This is an about page</h1>
    <h1>Beef Taco</h1>
    <button type="button" class="btn btn-primary">test</button>
    <button type="button" @click="openFolder">Open Folder</button>
    <b-img src="../assets/logo.png"></b-img>
    <b-table striped hover :items="items" selectable @row-clicked="clickHandler"></b-table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      items: [
        { age: 40, first_name: "Dickerson", last_name: "Macdonald" },
        { age: 21, first_name: "Larsen", last_name: "Shaw" },
        { age: 89, first_name: "Geneva", last_name: "Wilson" },
        { age: 38, first_name: "Jami", last_name: "Carney" },
      ],
    };
  },
  methods: {
    clickHandler(item, index) {
      alert("Row is clicked at index " + index + " the age is " + item.age);
    },
    openFolder: function () {
      window.ipc.send("READ_FOLDER_PATH", { test: "test" });
    },
  },
  mounted() {
    window.ipc.on("READ_FOLDER_PATH", (payload) => {
      console.log(payload);
      alert(payload.result.filePaths);
    });
  },
};
</script>