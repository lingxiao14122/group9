import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    overlayBlockingApp: false,
  },
  mutations: {
    overlayBlockingAppSwitch(state, payload) {
      state.overlayBlockingApp = payload;
    }
  },
  actions: {
  },
  modules: {
  }
})
