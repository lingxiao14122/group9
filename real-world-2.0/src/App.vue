<template>

  <div class="window">
    <div class="window-content">
      <div class="pane-group">
        <div class="pane-sm sidebar">

          <nav class="nav-group">
            <router-link class="nav-group-item" to="/">Home</router-link>
            <router-link class="nav-group-item" to="/about">About</router-link>
          </nav>
          
        </div>
        <div class="pane">
          <router-view/>
        </div>
      </div>
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
</style>
