<template>
  <div class="fondo-img"></div>
  <div class="inicio-container" v-if="$route.path == '/'">
    <div class="flex-col gap-4 mt-5">
      <!-- Botón Olgadle -->
      <router-link to="/olgadle" class="flex-row boton-container gap-2">
        <img src="/logo.png" alt="Olgadle" class="img-boton" />
        <div class="content-boton flex-col">
          <h1 class="titulo-boton">OLGAdle</h1>
          <span class="text-boton">Adiviná el integrante de OLGA con pistas.</span>
        </div>
      </router-link>

      <!-- Botón En Una Nota -->
      <router-link to="/en-una-nota" class="flex-row boton-container gap-2">
        <img src="/enunanota.png" alt="En Una Nota" class="img-boton" />
        <div class="content-boton flex-col">
          <h1 class="titulo-boton">En una nota</h1>
          <span class="text-boton">Adiviná la canción en pocos segundos.</span>
        </div>
      </router-link>

      <!-- Botón Quien Es -->
      <router-link to="/quien-es" class="flex-row boton-container gap-2">
        <img src="/quienes.png" alt="¿Quién Es?" class="img-boton" />
        <div class="content-boton flex-col">
          <h1 class="titulo-boton">¿Quién Es?</h1>
          <span class="text-boton">Adiviná de quién es la foto del integrante de OLGA.</span>
        </div>
      </router-link>
      <!-- Vista dinámica -->
    </div>

  </div>
  <router-link v-else to="/" class="boton-container btn-volver square-34">
    <span class="text-boton"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg></span>
  </router-link>
  <router-view />
</template>

<script setup>
// No necesitas lógica todavía
</script>

<style scoped>
.square-34 {
  display: flex;
  width: 34px;
  justify-content: center;
  align-items: center;
  height: 34px;
}

.btn-volver {
  position: sticky;
  top: 5px;
  left: 5px;
  border-radius: 100% !important;
}

.boton-container {
  background-color: rgba(255, 255, 255, 0.8);
  padding: 10px 5px;
  border-radius: 10px;
  text-decoration: none;
}

.boton-container:hover {
  background-color: rgba(212, 212, 212, 0.8);
}

.inicio-container {
  display: flex;
  margin: auto;
  max-width: calc(100svw - 10px);
  height: 100svh;
  justify-content: center;
}

.content-boton {
  color: black;
}

.titulo-boton {
  font-size: 2rem;
}

.text-boton {
  font-size: 1.3rem;
  color: black;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.flex-row {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.fondo-img {
  position: fixed;
  z-index: -1;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image:
    linear-gradient(to bottom, rgba(0, 0, 0, 0.2), rgba(50, 50, 50, 0.5), rgba(0, 0, 0, 0.9)),
    url('/bg.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.img-boton {
  height: 100px;
  width: 100px;
  object-fit: contain;
}
</style>
