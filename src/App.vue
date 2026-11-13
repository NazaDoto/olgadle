<script setup>
const juegos = [
  { ruta: '/olgadle', titulo: 'OLGAdle', imagen: '/logo.png', pista: 'Adiviná al integrante con pistas.', color: 'lime' },
  { ruta: '/en-una-nota', titulo: 'En una nota', imagen: '/enunanota.png', pista: 'Reconocé la canción de oído.', color: 'pink' },
  { ruta: '/quien-es', titulo: '¿Quién es?', imagen: '/quienes.png', pista: 'Descubrí quién está en la foto.', color: 'blue' },
  { ruta: '/sqp', titulo: 'Soñé que pintaba', imagen: '/sqp.png', pista: 'Pintá con la gentuza.', color: 'orange' },
]
</script>

<template>
  <div class="arcade" :class="juegos.find(juego => juego.ruta === $route.path)?.color">
    <router-link v-if="$route.path !== '/'" class="arcade-back" to="/" aria-label="Volver a los juegos">←</router-link>

    <main v-if="$route.path === '/'" class="arcade-home" aria-label="Juegos">
      <div class="game-grid">
        <router-link v-for="juego in juegos" :key="juego.ruta" :to="juego.ruta" class="game-card" :class="juego.color">
          <div class="game-card-art"><img :src="juego.imagen" alt="" width="148" height="148" /></div>
          <div class="game-card-info">
            <div><h2>{{ juego.titulo }}</h2><p>{{ juego.pista }}</p></div>
            <span class="game-card-arrow" aria-hidden="true">↗</span>
          </div>
        </router-link>
      </div>
    </main>
    <router-view v-else />
  </div>
</template>
