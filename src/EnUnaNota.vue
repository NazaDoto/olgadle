<template>
  <div class="p-6 space-y-6 max-w-lg mx-auto bg-gray-100 rounded-xl shadow-lg">
    <h1 class="text-2xl font-bold text-center mb-6">🎵 En Una Nota (Heardle)</h1>

    <div v-if="currentTrack">
      <!-- Carátula solo al final -->
      <div v-if="gameOver" class="mb-4">
        <img :src="currentTrack.cover" alt="Cover" class="w-full h-48 object-contain rounded-lg" />
      </div>

      <!-- Reproductor personalizado -->
      <div class="flex items-center justify-between space-x-2 mb-4">
        <button
          v-for="(duration, index) in durations"
          :key="index"
          @click="playSegment(index)"
          :disabled="gameOver || currentSegment > index"
          class="flex-1 p-2 rounded bg-green-500 text-white hover:bg-green-600 disabled:bg-gray-300"
        >
          {{ duration }}s
        </button>
      </div>

      <!-- Volumen -->
      <div class="mb-4">
        <label class="block mb-1">Volumen: {{ Math.round(volume * 100) }}%</label>
        <input type="range" min="0" max="1" step="0.01" v-model="volume" class="w-full" />
      </div>

      <!-- Input para adivinar -->
      <div class="space-y-2 mb-4">
        <input
          v-model="guess"
          type="text"
          placeholder="Escribí el nombre de la canción"
          class="w-full p-2 border rounded"
          :disabled="gameOver"
        />
        <button
          @click="checkGuess"
          class="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          :disabled="gameOver"
        >
          Adivinar
        </button>
      </div>

      <!-- Mensaje de resultado -->
      <p class="mt-4 text-center text-lg font-semibold" v-if="message">{{ message }}</p>
    </div>
    <div v-else>
      <p class="text-center">Cargando canción...</p>
    </div>

    <!-- Audio oculto controlado manualmente -->
    <audio ref="audioPlayer" :src="currentTrack?.preview" hidden></audio>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentTrack: null,
      audioPlayer: null,
      guess: "",
      currentSegment: 0,
      durations: [1, 3, 5, 10],
      volume: 0.5,
      gameOver: false,
      message: "",
    }
  },
  mounted() {
    this.audioPlayer = this.$refs.audioPlayer
    this.loadRandomTrack()
  },
  methods: {
    async loadRandomTrack() {
      try {
        const res = await fetch("http://localhost:3501/api/random-track/14297920541")
        const track = await res.json()
        this.currentTrack = track
        this.currentSegment = 0
        this.gameOver = false
        this.guess = ""
        this.message = ""
        if (this.audioPlayer) {
          this.audioPlayer.pause()
          this.audioPlayer.currentTime = 0
          this.audioPlayer.volume = this.volume
        }
      } catch (error) {
        console.error("Error cargando track:", error)
      }
    },
    playSegment(index) {
      if (!this.audioPlayer || this.gameOver) return

      // No dejar reproducir segmentos adelantados
      if (index > this.currentSegment) return

      const duration = this.durations[index]
      this.audioPlayer.currentTime = 0
      this.audioPlayer.volume = this.volume
      this.audioPlayer.play()

      setTimeout(() => {
        this.audioPlayer.pause()
        this.currentSegment = Math.max(this.currentSegment, index + 1)

        if (this.currentSegment >= this.durations.length) {
          this.gameOver = true
          this.message = `😢 Perdiste! La canción era: ${this.currentTrack.title} - ${this.currentTrack.artist}`
        }
      }, duration * 1000)
    },
    checkGuess() {
      if (!this.guess.trim() || this.gameOver) return

      const normalizedGuess = this.guess.toLowerCase()
      const normalizedTitle = this.currentTrack.title.toLowerCase()

      if (normalizedGuess.includes(normalizedTitle) || normalizedTitle.includes(normalizedGuess)) {
        this.gameOver = true
        this.message = `🎉 ¡Correcto! Era: ${this.currentTrack.title} - ${this.currentTrack.artist}`
      } else {
        this.message = "❌ Incorrecto, seguí intentando o reproducí el siguiente segmento"
      }
      this.guess = ""
    }
  },
  watch: {
    volume(newVol) {
      if (this.audioPlayer) this.audioPlayer.volume = newVol
    }
  }
}
</script>

<style scoped>
/* Botones con transición y hover */
button {
  transition: background-color 0.2s;
}

/* Input focus personalizado */
input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

/* Range input personalizado */
input[type="range"] {
  accent-color: #3b82f6;
}
</style>
