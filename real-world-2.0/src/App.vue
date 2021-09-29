<template>
  <div class="appcontainer flex flex-row">
    <div class="sidebar flex-initial bg-gray-100 ">
      <div class="flex-col mt-5">
        <div class="text-xl m-3">
          <router-link active-class="font-bold py-2 px-4 rounded bg-blue-500 text-white" class="" to="/">Home</router-link>
        </div>
        <div class="text-xl m-3">
          <router-link active-class="font-bold py-2 px-4 rounded bg-blue-500 text-white" class="" to="/about">About</router-link>
        </div>
        <div class="text-xl m-3">
          <router-link active-class="font-bold py-2 px-4 rounded bg-blue-500 text-white" class="" to="/folder">Folder</router-link>
        </div>
        <div class="text-xl m-3">
          <router-link active-class="font-bold py-2 px-4 rounded bg-blue-500 text-white" class="" to="/defect">Defect</router-link>
        </div>
      </div>
    </div>
    <div class="appbody flex-1">
      <router-view />
    </div>
  </div>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

#nav {
  padding: 30px;
}

#nav a {
  font-weight: bold;
  color: #2c3e50;
}

#nav a.router-link-exact-active {
  color: #42b983;
}

.sidebar {
  min-width: 200px;
  min-height: 100vh;
}

.backred {
  background: red;
}
</style>
