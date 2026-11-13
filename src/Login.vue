<template>
  <div class="container login-page d-flex justify-content-center align-items-center">

    <div class="card shadow p-4">

      <h3 class="text-center mb-4">Administración</h3>

      <form @submit.prevent="login">

        <div class="mb-3">
          <label for="admin-username" class="form-label">Usuario</label>
          <input
            id="admin-username" v-model="username"
            type="text"
            class="form-control"
            autocomplete="username"
          >
        </div>

        <div class="mb-3">
          <label for="admin-password" class="form-label">Contraseña</label>
          <input
            id="admin-password" v-model="password"
            type="password"
            class="form-control"
            autocomplete="current-password"
          >
        </div>

        <button class="btn btn-primary w-100">
          Ingresar
        </button>

      </form>

    </div>

  </div>
</template>

<script>
import axios from "axios"

export default {
  name: "AdminLogin",

  data() {
    return {
      username: "",
      password: ""
    }
  },

  methods: {
    async login() {
      try {
        const { data } = await axios.post("/login", {
          username: this.username,
          password: this.password,
        })
        sessionStorage.setItem("adminToken", data.token)
        await this.$router.push("/admin")
      } catch (error) {
        alert(error.response?.data?.error || "No se pudo iniciar sesión")
      }
    }
  }
}
</script>
