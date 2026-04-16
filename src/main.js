import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// En dev apunta al backend local, en prod las rutas son relativas (nginx las proxea)
axios.defaults.baseURL = import.meta.env.DEV ? 'http://localhost:3501' : '/api'

const app = createApp(App)
app.use(router)
app.mount('#app')