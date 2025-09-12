import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios';

const url = 'http://192.168.1.182:3501';
const env = 'prod';
if (env == 'dev') {
    axios.defaults.baseURL = url;
} else {
    axios.defaults.baseURL = 'https://nazadoto.com:3501';
}

const app = createApp(App)
app.use(router)

app.mount('#app')
