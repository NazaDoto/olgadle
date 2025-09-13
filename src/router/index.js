// src/router.js
import { createRouter, createWebHistory } from "vue-router"

// Importar vistas
import Olgadle from "../Olgadle.vue"
import EnUnaNota from "../EnUnaNota.vue"
import QuienEs from "../QuienEs.vue"

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
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
