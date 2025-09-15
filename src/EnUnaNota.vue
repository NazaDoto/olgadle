<template>
  <div class="container py-5">
    <div class="w-fit-content mx-auto">
      <img src="/enunanota.png" class="logo" alt="" />
    </div>
    <p class="lead text-center mt-2 mb-2 adivina-container">¡Adiviná la canción de hoy!</p>

    <div v-if="currentTrack && !cargando">
      <div v-if="terminado == 0">
        <!-- Barra de progreso -->
        <div class="progress-wrapper">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress * 100 + '%' }"></div>

            <!-- Líneas divisorias de segmentos -->
            <div
              v-for="(duration, index) in cumulativeDurations"
              :key="index"
              class="progress-marker"
              :style="{ left: (duration / totalDuration) * 100 + '%' }"
            ></div>
          </div>
        </div>

        <!-- Controles de reproducción -->
        <div class="d-flex flex-row gap-2 space-between mb-3">
          <button @click="playSegment" class="btn-ok">▶</button>
          <div class="text-center">
            <label class="c-white">Volumen: {{ Math.round(volume * 100) }}%</label>
            <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-100 mt-2" />
          </div>
          <button
            @click="nextSegment"
            :disabled="currentSegment >= durations.length"
            class="btn-ok"
          >
            {{ currentSegment == durations.length - 1 ? '⏹' : '⏭' }}
          </button>
        </div>

        <!-- Volumen -->

        <!-- Input para adivinar -->
        <div class="mb-4 mx-auto flex-col" style="max-width: 400px">
          <!-- Input y Autocomplete -->
          <div class="mb-4 position-relative" style="max-width: 400px">
            <input
              ref="inputTrack"
              v-model="guess"
              @input="mostrarOpciones = true"
              @keyup.enter="enterSeleccion()"
              type="text"
              class="form-control input-size"
              placeholder="Escribí el nombre de la canción..."
            />

            <!-- Autocomplete -->
            <ul
              v-if="mostrarOpciones && opcionesFiltradas.length"
              ref="containerRef"
              class="list-group position-absolute w-100 select-integrantes mt-1 barra-nav"
              style="z-index: 10"
            >
              <li
                v-for="(opcion, index) in opcionesFiltradas"
                :key="index"
                @click="adivinar(opcion)"
                class="list-group-item list-group-item-action cursor-pointer d-flex align-items-center flex-row gap-2 p-2"
              >
                {{ opcion.title }} - {{ opcion.artist }}
              </li>
            </ul>
          </div>

          <p class="c-white text-center mt-2" v-if="message == 'incorrecto'">
            ❌ Incorrecto, seguí intentando o reproducí el siguiente segmento
          </p>
        </div>
      </div>
      <div v-else class="c-white text-center mb-2">
        <h2 :class="terminado == -1 ? 'texto-perdiste' : 'texto-ganaste'">
          {{ terminado == -1 ? 'Perdiste' : '¡Ganaste!' }}
        </h2>
        <p class="c-white">
          {{ 'Acertaron ' + aciertos + ' de ' + intentosTotales + ' personas.' }}
        </p>
        <div class="c-white text-center">
          La canción era: {{ currentTrack.title + ' - ' + currentTrack.artist }}
          <br />
          <img :src="currentTrack.cover" alt="" class="square mt-2 mb-2" />
        </div>
        <!-- 🔥 si quedan canciones, botón siguiente -->
        <div v-if="currentGameIndex < tracksDelDia.length - 1">
          <button class="btn-ok mb-2 mx-auto" @click="siguienteCancion">Siguiente canción</button>
        </div>

        <!-- 🔥 si ya jugó todas -->
        <div v-else>Volvé en {{ tiempoRestante }}</div>
      </div>

      <div v-if="modalFin && message === 'perdiste'" class="fondoModal" @click="modalFin = false">
        <div class="containerModal" @click.stop>
          <div class="headerModal">😭 Perdiste</div>
          <div class="bodyModal">
            La canción era: {{ currentTrack.title + ' - ' + currentTrack.artist }}
            <br />
            <img :src="currentTrack.cover" alt="" class="square mt-2" />
          </div>
          <button class="btn-ok c-red mx-auto" @click="modalFin = false">Cerrar</button>
        </div>
      </div>

      <!-- Modal Ganador -->
      <div v-if="modalFin && message === 'ganaste'" class="fondoModal" @click="modalFin = false">
        <div class="containerModal" @click.stop>
          <div class="headerModal">🎉 ¡Ganaste!</div>
          <div class="bodyModal">Lo lograste en {{ currentSegment + 1 }}/5 intentos</div>
          <div class="bodyModal">
            La canción era: {{ currentTrack.title + ' - ' + currentTrack.artist }}
            <br />
            <img :src="currentTrack.cover" alt="" class="square mt-2" />
          </div>
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
    <audio ref="audioPlayer" type="audio/mpeg" hidden></audio>
    <p class="aclaracion">Las canciones se eligen aleatoriamente de la playlist de TDL.</p>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  data() {
    const savedTracks = JSON.parse(localStorage.getItem('tracksDelDia')) || []
    const savedIndex = parseInt(localStorage.getItem('currentGameIndex')) || 0
    const savedSegment = parseInt(localStorage.getItem('currentSegment')) || 0
    return {
      tiempoRestante: '00:00:00',
      tracksDelDia: savedTracks,
      currentGameIndex: savedIndex,
      currentTrack: savedTracks[savedIndex] || null,
      intentosTotales: '',
      intentos: localStorage.getItem('intentosEN') || 0,
      aciertos: '',
      audioPlayer: null,
      guess: '',
      currentSegment: savedSegment,
      durations: [1, 3, 5, 10, 30],
      totalDuration: 30,
      volume: 0.5,
      message: '',
      historial: JSON.parse(localStorage.getItem('historialEN')) || [],
      progress: localStorage.getItem('progressEN') || 0,
      terminado: localStorage.getItem('terminadoEN') || 0,
      interval: null,
      modalFin: false,
      mostrarOpciones: false,
      mostrarCopiado: false,
      playlist: JSON.parse(localStorage.getItem('playlist')) || [],
      version: localStorage.getItem('version') || null,
      cargando: false,
    }
  },
  mounted() {
    this.checkVersion()
    document.addEventListener('click', this.handleClickOutside)
    this.audioPlayer = this.$refs.audioPlayer
    this.loadRandomTracks()
    this.fetchPlaylist()
  },
  unmounted() {
    document.removeEventListener('click', this.handleClickOutside)
  },
  methods: {
    async checkVersion() {
      try {
        const response = await axios.get('/api/version')
        if (this.version != response.data.version) {
          this.version = response.data.version
          localStorage.clear()
          localStorage.setItem('version', this.version)
          location.reload()
        }
      } catch (error) {
        console.log(error)
      }
    },
    enterSeleccion() {
      if (this.opcionesFiltradas.length > 0) {
        this.adivinar(this.opcionesFiltradas[0])
      }
    },
    async postIntento(valor) {
      try {
        const response = await axios.post('/intentoEN', { intento: valor })
        this.intentosTotales = response.data.intentosTotalesEN
        this.aciertos = response.data.aciertosEN
      } catch (error) {
        console.log(error)
      }
    },
    segundosAHHMMSS(segundos) {
      const h = Math.floor(segundos / 3600)
        .toString()
        .padStart(2, '0')
      const m = Math.floor((segundos % 3600) / 60)
        .toString()
        .padStart(2, '0')
      const s = Math.floor(segundos % 60)
        .toString()
        .padStart(2, '0')
      return `${h}:${m}:${s}`
    },

    startTimer(segundos) {
      // Cancelar cualquier timer anterior
      if (this.timer) clearInterval(this.timer)

      let remaining = segundos
      this.tiempoRestante = this.segundosAHHMMSS(remaining)

      this.timer = setInterval(() => {
        remaining--
        if (remaining < 0) {
          clearInterval(this.timer)
          this.tiempoRestante = '00:00:00'
          return
        }
        this.tiempoRestante = this.segundosAHHMMSS(remaining)
      }, 1000)
    },
    async adivinar(track) {
      this.mostrarOpciones = false
      this.intentos++
      localStorage.setItem('intentosEN', this.intentos)
      if (track.id === this.currentTrack.id) {
        this.message = 'ganaste'
        this.modalFin = true
        this.terminado = 1

        localStorage.setItem('terminadoEN', 1)
        this.postIntento(1)
        this.historial.push('🟩')
        localStorage.setItem('historialEN', JSON.stringify(this.historial))
      } else {
        this.message = 'incorrecto'
        this.historial.push('🟥')
        localStorage.setItem('historialEN', JSON.stringify(this.historial))
      }

      // 🔥 Eliminar la canción del arreglo playlist
      const index = this.playlist.findIndex((cancion) => cancion.id === track.id)
      if (index !== -1) {
        this.playlist.splice(index, 1)
      }
      this.guess = ''
    },
    compartirResultado() {
      // Armamos un texto estilo Heardle
      const intentosTotales = this.durations.length
      const intentosUsados = this.currentSegment

      // Dibujamos los bloques según aciertos
      let bloques = ''
      this.historial.forEach((item) => {
        bloques += item + '\n'
      })

      const texto = `En Una Nota del día ${new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
      })} en el ${this.intentos === 1 && intentosUsados == 0 ? 'PRIMER' : `${this.intentos}º`} intento (${intentosUsados} ${intentosUsados == 1 ? 'skip' : 'skips'})\n${bloques}`

      navigator.clipboard.writeText(texto).then(() => {
        this.mostrarCopiado = true
      })
    },
    async fetchPlaylist() {
      if (!this.playlist || this.playlist.length === 0) {
        try {
          const res = await axios.get('/api/playlist')
          this.playlist = res.data // <-- Axios ya parsea el JSON
          localStorage.setItem('playlist', JSON.stringify(this.playlist))
        } catch (error) {
          console.error('Error al cargar playlist:', error)
        }
      }
    },
    async loadRandomTracks() {
      this.cargando = true
      // Si ya hay canciones en localStorage, las cargamos
      if (this.tracksDelDia.length == 0) {
        try {
          const res = await axios.get('/api/random-tracks') // 🔥 ahora endpoint devuelve 3
          this.tracksDelDia = res.data.tracks
          this.intentosTotales = res.data.intentosTotalesEN
          this.aciertos = res.data.aciertosEN
          this.terminado = 0
          this.startTimer(res.data.tiempoRestante)
          localStorage.setItem('terminadoEN', 0)
          localStorage.setItem('tracksDelDia', JSON.stringify(this.tracksDelDia))
          localStorage.setItem('currentGameIndex', 0)
          this.setCurrentTrack(0) // empieza en la primera canción
        } catch (error) {
          console.error('Error cargando tracks:', error)
        } finally {
          this.cargando = false
        }
      } else {
        try {
          const res = await axios.get('/api/random-tracks')
          const sonIguales =
            this.tracksDelDia.length === res.data.tracks.length &&
            this.tracksDelDia.every((track, i) => track.id === res.data.tracks[i].id)
          if (!sonIguales) {
            this.terminado = 0
            localStorage.setItem('terminadoEN', 0)
            localStorage.setItem('currentGameIndex', 0)
            this.setCurrentTrack(0) // empieza en la primera canción
            localStorage.setItem('tracksDelDia', JSON.stringify(res.data.tracks))
          }
          this.tracksDelDia = res.data.tracks
          this.setCurrentTrack(this.currentGameIndex)
          this.intentosTotales = res.data.intentosTotalesEN
          this.aciertos = res.data.aciertosEN
          this.startTimer(res.data.tiempoRestante)
        } catch (error) {
        } finally {
          this.cargando = false
        }
      }
    },

    async setCurrentTrack(index) {
      this.currentGameIndex = index
      this.currentTrack = this.tracksDelDia[index]
      this.message = ''
      this.historial = []
      this.intentos = 0
      localStorage.setItem('currentGameIndex', index)
      this.loadPreview(this.currentTrack)
    },

    async loadPreview(track) {
      if (!track || !track.preview) {
        console.error('Track inválido o sin preview')
        return
      }
      try {
        const response = await fetch(track.preview)
        const blob = await response.blob()
        this.audioPlayer.src = URL.createObjectURL(blob)
        this.audioPlayer.volume = this.volume
        this.audioPlayer.currentTime = 0
      } catch (error) {
        console.error('Error cargando preview:', error)
      }
    },

    async siguienteCancion() {
      if (this.currentGameIndex < this.tracksDelDia.length - 1) {
        await this.setCurrentTrack(this.currentGameIndex + 1)
        this.currentSegment = 0
        this.intentos = 0
        this.historial = []
        this.terminado = 0
        localStorage.setItem('currentGameIndex', this.currentGameIndex)
        localStorage.setItem('intentosEN', this.intentos)
        localStorage.setItem('terminadoEN', 0)
        localStorage.setItem('historialEN', JSON.stringify(this.historial))
        localStorage.setItem('currentSegment', this.currentSegment)
        this.progress = 0
        localStorage.setItem('progressEN', this.progress)
      }
    },

    async playSegment() {
      try {
        await this.audioPlayer.load() // fuerza carga
        await this.audioPlayer.play()
      } catch (err) {
        console.error('No se pudo reproducir el audio:', err)
        return
      }

      const duration = this.durations[this.currentSegment]
      const startTime = this.cumulativeDurations[this.currentSegment] - duration
      const endTime = this.cumulativeDurations[this.currentSegment]

      this.audioPlayer.currentTime = startTime

      clearInterval(this.interval)
      this.progress = startTime / this.totalDuration
      localStorage.setItem('progressEN', this.progress)

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
        this.historial.push('⏭')
        localStorage.setItem('historialEN', JSON.stringify(this.historial))
        localStorage.setItem('currentSegment', this.currentSegment)
        this.playSegment()
      } else {
        this.message = 'perdiste'
        this.modalFin = true
        this.terminado = -1
        localStorage.setItem('terminadoEN', -1)
        this.postIntento(0)
      }
    },
    handleClickOutside(event) {
      const container = this.$refs.containerRef
      if (container && !container.contains(event.target)) {
        this.mostrarOpciones = false
      }
    },
  },
  watch: {
    volume(newVol) {
      if (this.audioPlayer) this.audioPlayer.volume = newVol
    },
  },
  computed: {
    // Duraciones acumuladas: [1, 4, 9, 19]
    cumulativeDurations() {
      let sum = 0
      return this.durations.map((d) => (sum += d))
    },
    opcionesFiltradas() {
      if (!this.guess || this.guess.length < 3) return []

      const input = this.guess.toLowerCase()

      // Función para contar letras consecutivas que coinciden al inicio
      const countMatches = (str) => {
        str = str.toLowerCase()
        let count = 0
        for (let i = 0; i < input.length && i < str.length; i++) {
          if (input[i] === str[i]) count++
          else break
        }
        return count
      }

      return this.playlist
        .filter((track) => {
          const title = track.title.toLowerCase()
          const artist = track.artist.toLowerCase()

          // Coincidencia por prefijo (mínimo 3 letras)
          const prefixMatch = countMatches(title) >= 3 || countMatches(artist) >= 3

          // Coincidencia por palabra dentro del título o artista
          const wordMatch = title.includes(input) || artist.includes(input)

          return prefixMatch || wordMatch
        })
        .sort((a, b) => {
          const matchesA = Math.max(countMatches(a.title), countMatches(a.artist))
          const matchesB = Math.max(countMatches(b.title), countMatches(b.artist))

          // Si hay coincidencia exacta de palabra, le damos prioridad
          const wordA =
            a.title.toLowerCase().includes(input) || a.artist.toLowerCase().includes(input)
          const wordB =
            b.title.toLowerCase().includes(input) || b.artist.toLowerCase().includes(input)

          if (wordA && !wordB) return -1
          if (!wordA && wordB) return 1

          return matchesB - matchesA
        })
    },
  },
  beforeUnmount() {
    clearInterval(this.interval)
  },
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
