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
    toast(toastBody, toastType) {

      const toastVariant = toastType === 'error' ? 'danger' : 'default';
      const toastTitle = toastType === 'error' ? 'Error' : 'Information';

      const vNodesMsg = this.$createElement(
        'p',
        {class: ['text-break bg-red']},
        [toastBody]
      )

      this.$bvToast.toast([vNodesMsg], {
        title: toastTitle,
        // title: toastTitle,
        autoHideDelay: 5000,
        solid: true,
        variant: toastVariant,
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
