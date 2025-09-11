<template>
  <div class="fondo-img"></div>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 text-white">

        <!-- Botón Olgadle -->
        <router-link to="/olgadle">
          <img src="/logo.png" alt="Olgadle" class="img-boton" />
        </router-link>

        <!-- Botón En Una Nota -->
        <router-link to="/en-una-nota">
          <img src="/enunanota.png" alt="En Una Nota" class="img-boton" />
        </router-link>
    <!-- Vista dinámica -->
    <router-view class="p-6" />
  </div>
</template>

<script setup>
// No necesitas lógica todavía
</script>

<style>
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
  width:100px;
}
</style>
