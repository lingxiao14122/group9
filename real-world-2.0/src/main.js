import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import { BootstrapVue, BootstrapVueIcons } from 'bootstrap-vue'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.use(BootstrapVue)
Vue.use(BootstrapVueIcons)

Vue.config.productionTip = false

// global function
Vue.mixin({
  methods: {
    toast(toastBody) {
      const vNodesMsg = this.$createElement(
        'p',
        {class: ['text-break']},
        [toastBody]
      )

      this.$bvToast.toast([vNodesMsg], {
        title: "Information",
        // title: toastTitle,
        autoHideDelay: 5000,
        solid: true,
        appendToast: false,
      });
    },
  }
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
