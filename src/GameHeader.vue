<script setup>
defineProps({
  logo: { type: String, required: true },
  titulo: { type: String, required: true },
  descripcion: { type: String, required: true },
})
</script>

<template>
  <header class="game-head">
    <nav aria-label="Navegación del juego">
      <router-link class="arcade-back" to="/" aria-label="Volver a los juegos" title="Volver a los juegos">
        <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5m0 0 6-6m-6 6 6 6" />
        </svg>
      </router-link>
    </nav>
    <img :src="logo" alt="" width="48" height="48" />
    <div class="game-head-copy">
      <h1 class="game-title">{{ titulo }}</h1>
      <span class="game-head-separator" aria-hidden="true">|</span>
      <p>{{ descripcion }}</p>
    </div>
    <slot />
  </header>
</template>
