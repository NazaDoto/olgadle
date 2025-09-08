import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import axios from 'axios';

const url = 'http://localhost:3501';
const env = 'dev';
if (env == 'dev') {
    axios.defaults.baseURL = url;
} else {
    axios.defaults.baseURL = 'https://nazadoto.com:3700';
}

const app = createApp(App)
app.use(router)

app.mount('#app')
