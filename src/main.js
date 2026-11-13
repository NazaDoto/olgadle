import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios'

axios.defaults.baseURL = '/api'

axios.interceptors.request.use((request) => {
    const token = sessionStorage.getItem('adminToken')
    const adminWrite = /^(?:\/(?:integrantes|programas)(?:\/|$)|\/(?:upload|delete-image)$)/
    if (token && request.method !== 'get' && adminWrite.test(request.url)) {
        request.headers.Authorization = `Bearer ${token}`
    }
    return request
})

axios.interceptors.response.use(undefined, (error) => {
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
        sessionStorage.removeItem('adminToken')
        router.push('/login')
    }
    return Promise.reject(error)
})

const app = createApp(App)
app.use(router)
app.mount('#app')