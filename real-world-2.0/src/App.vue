<template>
  <b-overlay :show="overlayBlocking">
    <div id="app" class="d-flex">
      <div id="nav" class="sidebar d-flex flex-column">
        <router-link to="/home">Home</router-link>
        <router-link to="/about">About</router-link>
        <router-link to="/">Folders</router-link>
        <router-link to="/files">Files</router-link>
        <router-link to="/defects">Defects</router-link>
        <router-link to="/segregation">Segregation</router-link>
      </div>
      <div id="appbody" class="flex-grow-1 bg-appbody">
        <router-view />
      </div>
    </div>
  </b-overlay>
</template>

<script>
export default {
  data() {
    return {};
  },
  mounted() {
    window.ipc.on("CHECK_LOCAL_DB_INTEGRITY", (payload) => {
      if (payload.result == "error") {
        if (payload.code == 1) {
          this.toast(payload.reason + "\nSolution: " + payload.solution, "error");
        } else {
          this.toast("Failed checking local database integrity.");
        }
      }
    });

    window.ipc.send("CHECK_LOCAL_DB_INTEGRITY", {});
  },
  computed: {
    overlayBlocking() {
      return this.$store.state.overlayBlockingApp;
    },
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100vh;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #000000;
  margin-top: 10px;
  align-self: flex-start;
}

#nav a.router-link-exact-active {
  color: rgb(85, 130, 255);
}

.sidebar {
  background: #dcecfa;
  width: fit-content;
  font-size: 1.4rem;
  overflow: visible;
}

#appbody {
  overflow: auto;
}
</style>
