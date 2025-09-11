// src/router.js
import { createRouter, createWebHistory } from "vue-router"

// Importar vistas
import Olgadle from "../Olgadle.vue"
import EnUnaNota from "../EnUnaNota.vue"

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
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
