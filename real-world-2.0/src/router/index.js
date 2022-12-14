import Vue from 'vue'
import VueRouter from 'vue-router'
import Folders from '../views/Folders.vue'
import Files from '../views/Files.vue'
import Defects from '../views/Defects.vue'
import Segregation from '../views/Segregation.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/folders',
    name: 'Folders',
    component: Folders
  },
  {
    path: '/files',
    name: 'Files',
    component: Files,
    props: true
  },
  {
    path: '/defects',
    name: 'Defects',
    component: Defects
  },
  {
    path: '/segregation',
    name: 'Segregation',
    component: Segregation,
    props: true
  },
]

const router = new VueRouter({
  routes
})

export default router
