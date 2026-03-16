<template>
  <div class="container d-flex justify-content-center align-items-center">

    <div class="card shadow p-4" style="width: 350px;">

      <h3 class="text-center mb-4">Admin Login</h3>

      <form @submit.prevent="login">

        <div class="mb-3">
          <label class="form-label">Usuario</label>
          <input
            v-model="username"
            type="text"
            class="form-control"
            placeholder="Ingrese usuario"
          >
        </div>

        <div class="mb-3">
          <label class="form-label">Contraseña</label>
          <input
            v-model="password"
            type="password"
            class="form-control"
            placeholder="Ingrese contraseña"
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
export default {
  name: "Login",

  data() {
    return {
      username: "",
      password: ""
    }
  },

  methods: {
    login() {

      if (this.username === "admin" && this.password === "olgadle@4pp") {

        localStorage.setItem("logged", "true")

        this.$router.push("/admin")

      } else {

        alert("Credenciales incorrectas")

      }

    }
  }
}
</script>
