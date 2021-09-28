<template>
  <div class="appbody">
    <div id="nav">
      <div class="d-flex flex-column p-3 text-white bg-dark c-navbar">
        <router-link to="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
          <span class="fs-4">Sidebar</span>
        </router-link>
        <hr />
        <ul class="nav nav-pills flex-column mb-auto">
          <li class="nav-item">
            <router-link to="/" active-class="active" href="#" class="nav-link text-white" aria-current="page">
              Home
            </router-link>
          </li>
          <li>
            <router-link to="/about" active-class="active" href="#" class="nav-link text-white">
              Dashboard
            </router-link>
          </li>
        </ul>
        <hr />
      </div>
    </div>
    <div id="router-view">
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

.appbody {
  display: flex;
}

#router-view {
  flex-grow: 1;
}

.c-navbar {
  width: 280px;
  min-height: 100vh;
}
</style>
