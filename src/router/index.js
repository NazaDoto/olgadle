// src/router.js
import { createRouter, createWebHistory } from "vue-router"

// Vistas
import Olgadle from "../Olgadle.vue"
import EnUnaNota from "../EnUnaNota.vue"
import QuienEs from "../QuienEs.vue"
import Admin from "../Admin.vue"
import Login from "../Login.vue"

const routes = [{
        path: "/olgadle",
        name: "Olgadle",
        component: Olgadle,
    },
    {
        path: "/en-una-nota",
        name: "EnUnaNota",
        component: EnUnaNota,
    },
    {
        path: "/quien-es",
        name: "QuienEs",
        component: QuienEs,
    },
    {
        path: "/login",
        name: "Login",
        component: Login,
    },
    {
        path: "/admin",
        name: "Admin",
        component: Admin,
        meta: { requiresAuth: true },
    },
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})


// 🔐 guard de autenticación
router.beforeEach((to, from, next) => {

    const logged = localStorage.getItem("logged")

    if (to.meta.requiresAuth && !logged) {
        next("/login")
    } else {
        next()
    }

})

export default router
