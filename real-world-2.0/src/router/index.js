import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import Folders from '../views/Folders.vue'
import Files from '../views/Files.vue'
import Defects from '../views/Defects.vue'
import Segregation from '../views/Segregation.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/home',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import(/* webpackChunkName: "about" */ '../views/About.vue')
  },
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
    component: Segregation
  },
]

const router = new VueRouter({
  routes
})

export default router
