<template>
  <div class="container py-5">
    <div class="w-fit-content mx-auto">
      <img src="/enunanota.png" class="logo" alt="" />
    </div>
    <p class="lead text-center mt-2 mb-2 adivina-container">¡Adiviná la canción en poco tiempo!</p>

    <div v-if="currentTrack">

      <!-- Barra de progreso -->
      <div class="progress-wrapper">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: (progress * 100) + '%' }"></div>

          <!-- Líneas divisorias de segmentos -->
          <div v-for="(duration, index) in cumulativeDurations" :key="index" class="progress-marker"
            :style="{ left: (duration / totalDuration * 100) + '%' }"></div>
        </div>
      </div>

      <!-- Controles de reproducción -->
      <div class="d-flex flex-row gap-2 space-between mb-3">
        <button @click="playSegment" :disabled="gameOver" class="btn-ok">▶</button>
        <div class="text-center">
          <label class="c-white">Volumen: {{ Math.round(volume * 100) }}%</label>
          <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-100 mt-2" />
        </div>
        <button @click="nextSegment" :disabled="gameOver || currentSegment >= durations.length" class="btn-ok">
          {{ currentSegment == durations.length - 1 ? '⏹' : '⏭' }}
        </button>
      </div>


      <!-- Volumen -->

      <!-- Input para adivinar -->
      <div class="mb-4 mx-auto flex-col" style="max-width: 400px;">
        <!-- Input y Autocomplete -->
        <div class="mb-4 position-relative" style="max-width: 400px;">
          <input ref="inputTrack" v-model="guess" @input="mostrarOpciones = true" @keyup.enter="checkGuess" type="text"
            class="form-control input-size" placeholder="Escribí el nombre de la canción..." :disabled="gameOver" />

          <!-- Autocomplete -->
          <ul v-if="mostrarOpciones && opcionesFiltradas.length" ref="containerRef"
            class="list-group position-absolute w-100 select-integrantes mt-1 barra-nav" style="z-index: 10;">
            <li v-for="(opcion, index) in opcionesFiltradas" :key="index" @click="adivinar(opcion)"
              class="list-group-item list-group-item-action cursor-pointer d-flex align-items-center flex-row gap-2 p-2">
              {{ opcion.title }} - {{ opcion.artist }}
            </li>
          </ul>
        </div>

        <button v-if="gameOver" @click="loadRandomTrack" class="btn btn-success mt-3 mx-auto">
          Volver a jugar
        </button>
        <p class="c-white text-center mt-2" v-if="message == 'incorrecto'">❌ Incorrecto, seguí intentando o reproducí el
          siguiente segmento</p>
      </div>

      <div v-if="modalFin && message === 'perdiste'" class="fondoModal" @click="modalFin = false">
        <div class="containerModal" @click.stop>
          <div class="headerModal">😭 Perdiste</div>
          <div class="bodyModal">La canción era: {{ currentTrack.title + ' - ' + currentTrack.artist }}
            <br>
            <img :src="currentTrack.cover" alt="" class="square mt-2">
          </div>
          <button class="btn-ok c-red mx-auto" @click="modalFin = false">Cerrar</button>
        </div>
      </div>

      <!-- Modal Ganador -->
      <div v-if="modalFin && message === 'ganaste'" class="fondoModal" @click="modalFin = false">
        <div class="containerModal" @click.stop>
          <div class="headerModal">🎉 ¡Ganaste!</div>
          <div class="bodyModal">Lo lograste en {{ currentSegment + 1 }}/5 intentos</div>
          <button class="btn-ok mb-2 mx-auto" @click="compartirResultado">Compartir</button>
          <p class="bodyModal" v-if="mostrarCopiado">Resultado copiado en el portapapeles.</p>
          <button class="btn-ok c-red mx-auto" @click="modalFin = false">Cerrar</button>
        </div>
      </div>

    </div>
    <div v-else class="loader-container">
      <div class="spinner"></div>
      <p class="c-white">Cargando canción...</p>
    </div>

    <!-- Audio oculto -->
    <audio ref="audioPlayer" :src="currentTrack?.preview" hidden></audio>
  </div>
</template>

<script>
import axios from 'axios';
export default {
  data() {
    return {
      currentTrack: null,
      audioPlayer: null,
      guess: "",
      currentSegment: 0,
      durations: [1, 3, 5, 10, 30], // los segundos de cada segmento
      totalDuration: 30, // los previews de Deezer son siempre de 30s
      volume: 0.5,
      gameOver: false,
      message: '',
      progress: 0,
      interval: null,
      modalFin: false,
      mostrarOpciones: false,
      mostrarCopiado: false,
      playlist: JSON.parse(localStorage.getItem('playlist')) || [],
    }
  },
  mounted() {
    document.addEventListener("click", this.handleClickOutside);
    this.audioPlayer = this.$refs.audioPlayer
    this.loadRandomTrack()
    this.fetchPlaylist()

  },
  unmounted() {
    document.removeEventListener("click", this.handleClickOutside);
  },
  methods: {
    adivinar(track) {
      this.guess = `${track.title}`; // o `${track.title} - ${track.artist}` si querés mostrar artista
      this.mostrarOpciones = false;
      this.checkGuess();
    },
    compartirResultado() {
      if (!this.gameOver) return

      // Armamos un texto estilo Heardle
      const intentosTotales = this.durations.length
      const intentosUsados = this.currentSegment
      const gano = this.message.includes("ganaste")

      // Dibujamos los bloques según aciertos
      let bloques = ""
      for (let i = 0; i < intentosTotales; i++) {
        if (gano && i < intentosUsados - 1) {
          bloques += "🟥" // intentos fallidos
        } else if (gano && i === intentosUsados - 1) {
          bloques += "🟩" // acierto
        } else if (!gano && i < intentosTotales) {
          bloques += "🟥" // todos fallidos
        }
      }

      const texto = `🎵 En Una Nota\n${gano ? `✅ ${intentosUsados + 1}/${intentosTotales} intentos` : "❌ No adivinó"}\n${bloques}`

      navigator.clipboard.writeText(texto).then(() => {
        this.mostrarCopiado = true;
      })
    },
    async fetchPlaylist() {
      if (!this.playlist || this.playlist.length === 0) {
        try {
          const res = await axios.get("/api/playlist");
          const data = await res.json(); // <-- convertir a JSON
          this.playlist = data;          // <-- asignar al estado
          localStorage.setItem('playlist', JSON.stringify(this.playlist));
        } catch (error) {
          console.error("Error al cargar playlist:", error);
        }
      }
    },

    async loadRandomTrack() {
      this.currentTrack = null;
      try {
        const res = await axios.get("/api/random-track")
        const track = await res.json()
        this.currentTrack = track
        this.currentSegment = 0
        this.gameOver = false
        this.guess = ""
        this.message = ""
        this.progress = 0
        if (this.audioPlayer) {
          this.audioPlayer.pause()
          this.audioPlayer.currentTime = 0
          this.audioPlayer.volume = this.volume
        }
      } catch (error) {
        console.error("Error cargando track:", error)
      }
    },
    playSegment() {
      if (!this.audioPlayer || this.currentSegment >= this.durations.length) return

      const duration = this.durations[this.currentSegment]
      const startTime = this.cumulativeDurations[this.currentSegment] - duration
      const endTime = this.cumulativeDurations[this.currentSegment]

      this.audioPlayer.currentTime = startTime
      this.audioPlayer.play()

      clearInterval(this.interval)
      this.progress = startTime / this.totalDuration

      this.interval = setInterval(() => {
        const elapsed = this.audioPlayer.currentTime
        this.progress = Math.min(elapsed / this.totalDuration, endTime / this.totalDuration)

        if (elapsed >= endTime) {
          this.audioPlayer.pause()
          clearInterval(this.interval)
          this.progress = endTime / this.totalDuration
        }
      }, 100)
    },
    nextSegment() {
      if (this.currentSegment < this.durations.length - 1) {
        this.currentSegment++
        this.playSegment()
      } else {
        this.gameOver = true
        this.message = "perdiste"
        this.modalFin = true
      }
    },
    checkGuess() {
      if (!this.guess.trim() || this.gameOver) return

      const normalizedGuess = this.guess.toLowerCase()
      const normalizedTitle = this.currentTrack.title.toLowerCase()

      if (normalizedGuess.includes(normalizedTitle) || normalizedTitle.includes(normalizedGuess)) {
        this.gameOver = true
        this.message = "ganaste"
        this.modalFin = true;
      } else {
        this.message = "incorrecto"
      }
      this.guess = ""
    },
    handleClickOutside(event) {
      const container = this.$refs.containerRef;
      if (container && !container.contains(event.target)) {
        this.mostrarOpciones = false;
      }
    },
  },
  watch: {
    volume(newVol) {
      if (this.audioPlayer) this.audioPlayer.volume = newVol
    }
  },
  computed: {
    // Duraciones acumuladas: [1, 4, 9, 19]
    cumulativeDurations() {
      let sum = 0
      return this.durations.map(d => (sum += d))
    },
    opcionesFiltradas() {
      if (!this.guess || this.guess.length < 3) return [];

      const input = this.guess.toLowerCase();

      // Función para contar letras consecutivas que coinciden al inicio
      const countMatches = (str) => {
        str = str.toLowerCase();
        let count = 0;
        for (let i = 0; i < input.length && i < str.length; i++) {
          if (input[i] === str[i]) count++;
          else break;
        }
        return count;
      }

      return this.playlist
        .filter(track =>
          countMatches(track.title) >= 3 || countMatches(track.artist) >= 3
        )
        .sort((a, b) => {
          const matchesA = Math.max(countMatches(a.title), countMatches(a.artist));
          const matchesB = Math.max(countMatches(b.title), countMatches(b.artist));
          return matchesB - matchesA;
        })
    }
  },
  beforeUnmount() {
    clearInterval(this.interval)
  }
}
</script>

<style scoped>
.select-integrantes {
  max-height: 200px;
}

.flex-col {
  display: flex;
  flex-direction: column;
}

.space-between {
  justify-content: space-between;
}

.container,
.container-lg,
.container-md,
.container-sm {
  max-width: 400px;
  padding: 0;
  margin: auto;
}

.progress-wrapper {
  width: 100%;
  margin: 1rem 0;
  position: relative;
}

.progress-bar {
  position: relative;
  width: 100%;
  height: 12px;
  box-shadow: inset 0 0 6px #2200ff;
  background: rgb(255, 47, 47);
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  transition: width 0.2s linear;
}

.progress-marker {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: white;
  opacity: 0.6;
}

.btn-ok {
  margin: 0;
}

.logo {
  width: 150px;
  height: 150px;
  object-fit: contain;
}

progress {
  width: 100%;
  height: 10px;
  border-radius: 6px;
  overflow: hidden;
  background: #333;
}

progress::-webkit-progress-bar {
  background: #333;
}

progress::-webkit-progress-value {
  background: #3b82f6;
}

progress::-moz-progress-bar {
  background: #3b82f6;
}


@media (max-width: 992px) {


  .w-744 {
    width: 744px;
  }

  .col-width {
    width: 100px;
  }

  .square {
    width: 100px;
    height: 100px;
    font-size: 16px;
  }
}



/* Pantallas medianas (≤ 768px) */
@media (max-width: 768px) {
  .w-744 {
    width: fit-content;
  }

  .square {
    width: 85px;
    height: 85px;
    font-size: 14px;
  }

  .col-width {
    font-size: 14px;
    width: 85px;
  }

  .p-1 {
    padding: 0;
  }

  .container,
  .container-lg,
  .container-md,
  .container-sm {
    max-width: fit-content;
    padding: 0;
    margin: auto;
  }
}

/* Teléfonos grandes (≤ 635px) */
@media (max-width: 635px) {
  .flecha {
    font-size: 11px;
  }

  .flecha-abajo {
    transform: translateY(calc(-50% + 12px));
  }

  .flecha-arriba {
    transform: translateY(calc(-50% - 12px));
  }

  .w-744 {
    width: fit-content;
  }

  .col-width {
    width: 70px;
    font-size: 12px;
  }

  .square {
    width: 70px;
    height: 70px;
    font-size: 11px;
  }

  .container,
  .container-lg,
  .container-md,
  .container-sm {
    max-width: fit-content;
    padding: 0;
    margin: auto;
  }
}

/* Teléfonos grandes (≤ 520px) */
@media (max-width: 520px) {
  .adivina-container {
    font-size: 15px;
  }

  .w-744 {
    width: fit-content;
  }

  .col-width {
    width: 65px;
    font-size: 11px;
  }

  .square {
    width: 65px;
    height: 65px;
    font-size: 10px;
  }

  .container,
  .container-lg,
  .container-md,
  .container-sm {
    max-width: fit-content;
    padding: 0;
    margin: auto;
  }
}

/* Teléfonos grandes (≤ 480px) */
@media (max-width: 480px) {
  .logo {
    height: 100px;
    width: 100px;
  }

  .adivina-container {
    font-size: 15px;
  }

  .w-744 {
    width: fit-content;
  }

  .col-width {
    width: 50px;
    font-size: 9px;
    padding: 0 !important;
  }



  .square {
    width: 50px;
    height: 50px;
    font-size: 9px;
    padding: 0 !important;
  }

  .container,
  .container-lg,
  .container-md,
  .container-sm {
    max-width: fit-content;
    padding: 0;
    margin: auto;
  }


}

/* Teléfonos grandes (≤ 380px) */
@media (max-width: 380px) {
  .btn-ok {
    padding: 1px 6px;
  }

  .adivina-container {
    padding: 5px 10px;
  }

  #historialContainer {
    width: 100svw;
    overflow: auto;
  }

  /* Scroll personalizado */
  #historialContainer::-webkit-scrollbar {
    width: 5px;
  }

  #historialContainer::-webkit-scrollbar-thumb {
    background-color: rgba(255, 61, 61, 0.9);
  }

  #historialContainer::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 61, 61, 1);
  }

  #historialContainer::-webkit-scrollbar-track {
    background-color: rgba(255, 61, 61, 0.3);
  }

  .adivina-container {
    font-size: 15px;
  }

  .w-744 {
    width: fit-content;
  }

  .col-width {
    width: 50px;
    font-size: 9px;
    padding: 0 !important;
  }



  .square {
    width: 50px;
    height: 50px;
    font-size: 9px;
    padding: 0 !important;
  }

  .container,
  .container-lg,
  .container-md,
  .container-sm {
    max-width: fit-content;
    padding: 0;
    margin: auto;
  }


}
</style>
