<template>
  <div v-if="modalFin && textoModal === 'Perdiste :('" class="fondoModal" @click="modalFin = false">
    <div class="containerModal" @click.stop>
      <div class="headerModal">{{ textoModal }}</div>
      <div class="bodyModal" v-if="integranteOculto && integranteOculto.nombre">
        Era {{ integranteOculto.nombre }}
        <br />
        <img v-if="integranteOculto && integranteOculto.img" :src="'/img/' + integranteOculto.img" alt=""
          class="square mt-2" />
      </div>
      <div class="bodyModal">Volvé en {{ tiempoRestante }}</div>
      <button class="btn-ok c-red" @click="modalFin = false">Cerrar</button>
    </div>
  </div>

  <!-- Modal Ganador -->
  <div v-if="modalFin && textoModal === 'GANASTE!!!'" class="fondoModal" @click="modalFin = false">
    <div class="containerModal" @click.stop>
      <div class="headerModal">🎉 ¡Ganaste!</div>
      <div class="bodyModal">Lo lograste en {{ 5 - intentos }}/5 intentos</div>
      <button class="btn-ok mb-2" @click="compartirResultado">Compartir</button>
      <p class="bodyModal" v-if="mostrarCopiado">Resultado copiado en el portapapeles.</p>
      <button class="btn-ok c-red" @click="modalFin = false">Cerrar</button>
    </div>
  </div>

  <div class="container py-5">
    <div class="w-fit-content mx-auto">
      <img src="/quienes.png" class="logo" alt="" />
    </div>
    <p class="lead text-center mt-2 mb-2 adivina-container">
      ¡Adiviná de quien es la foto del integrante de OLGA de hoy!
    </p>
    <div v-if="cargando" class="loader-container">
      <div class="spinner"></div>
    </div>

    <span v-else>
      <span v-if="terminado == 0">
        <div class="img-wrapper" v-if="integranteOculto && integranteOculto.nombre">
          <img :src="'/img/' + integranteOculto.img" :class="'img-oculta ' + estiloImagen[5 - intentos]" alt="" />
        </div>
        <div class="c-white text-center mb-2">Tenés {{ intentos }} intentos.</div>
        <!-- Input y Autocomplete -->
        <div class="mb-4 position-relative mx-auto" style="max-width: 400px">
          <input ref="inputIntegrante" v-model="intento" @input="mostrarOpciones = true" @keyup.enter="enterSeleccion"
            @keyup.esc="mostrarOpciones = false" type="text" class="form-control input-size"
            placeholder="Escribí el nombre de algún integrante..." :disabled="!(intentos > 0)" />
          <!-- Autocomplete -->
          <ul v-if="mostrarOpciones && opcionesFiltradas.length" ref="containerRef"
            class="list-group position-absolute w-100 select-integrantes mt-1 barra-nav" style="z-index: 10">
            <li v-for="(opcion, index) in opcionesFiltradas" :key="index" @click="adivinar(opcion)"
              class="list-group-item list-group-item-action cursor-pointer d-flex align-items-center flex-row gap-3">
              <img v-if="opcion.img" :src="'/img/' + opcion.img" alt="foto" class="img-square" />
              {{ opcion.nombre }}
            </li>
          </ul>
        </div>
      </span>

      <div v-else class="c-white text-center mb-2">
        <h2 :class="terminado == -1 ? 'texto-perdiste' : 'texto-ganaste'">
          {{ terminado == -1 ? 'Perdiste' : '¡Ganaste!' }}
        </h2>
        <p class="c-white">
          {{ 'Acertaron ' + aciertos + ' de ' + intentosTotales + ' personas.' }}
        </p>
        <div class="c-white" v-if="integranteOculto && integranteOculto.nombre">
          El integrante oculto era: {{ integranteOculto.nombre }}
          <br />
          <div class="img-wrapper mt-2 mb-2">
            <img v-if="integranteOculto && integranteOculto.img" :src="'/img/' + integranteOculto.img" alt=""
              class="img-5 mt-2 mb-2" />
          </div>
        </div>
        <span v-if="terminado != -1">
          <button class="btn-ok mb-2" @click="compartirResultado">Compartir</button>
          <p class="c-white" v-if="mostrarCopiado">Resultado copiado en el portapapeles.</p>
        </span>
        Volvé en {{ tiempoRestante }}
      </div>
      <!-- Historial -->
      <div class="mx-auto" id="historialContainer">
        <ul v-show="historial.length > 0" class="list-group w-fit-content mx-auto flex-col-intento">
          <li v-for="item in historial" :key="item.nombre" class="flex-col-li" :class="item.nombre === integranteOculto?.nombre
            ? 'bg-success text-white p-1 rounded'
            : 'bg-danger text-white p-1 rounded'
            ">
            <div class="square relative" v-show="item.img">
              <div class="inset-shadow absolute-100 rounded"></div>
              <img class="rounded" width="100%" height="100%" :src="'/img/' + item.img" />
            </div>

            <div class="padding-text" v-show="item.nombre">
              {{ item.nombre }}
            </div>
          </li>
        </ul>
      </div>
    </span>
  </div>
</template>

<script>
import axios from 'axios'
export default {
  name: 'OlgadleApp',
  data() {
    return {
      cargando: true,
      tiempoRestante: '00:00:00',
      timer: null,
      mostrarCopiado: false,
      estiloImagen: ['img-0', 'img-1', 'img-2', 'img-3', 'img-4', 'img-5'],
      modalFin: false,
      textoModal: '',
      historial: JSON.parse(localStorage.getItem('historialQE')) || [],
      integrantes: JSON.parse(localStorage.getItem('integrantes')) || [],
      integranteOculto: null,
      intentos: localStorage.getItem('intentosQE') || 5,
      intento: '',
      intentosTotales: 0,
      aciertos: 0,
      terminado: localStorage.getItem('terminadoQE') || 0,
      mostrarOpciones: false,
      version: localStorage.getItem('version') || null,
    }
  },

  computed: {
    opcionesFiltradas() {
      if (!this.intento) {
        return this.integrantes
      }

      const nombresHistorial = this.historial.map((i) => i.nombre)
      const input = this.intento.toLowerCase()

      return this.integrantes
        .filter((i) => !nombresHistorial.includes(i.nombre))
        .filter((i) => i.nombre.toLowerCase().includes(input))
        .sort((a, b) => {
          const nombreA = a.nombre.toLowerCase()
          const nombreB = b.nombre.toLowerCase()

          // Contar coincidencias de letras en orden
          const countMatches = (nombre) => {
            let count = 0
            for (let i = 0; i < input.length; i++) {
              if (nombre[i] === input[i]) count++
            }
            return count
          }

          return countMatches(nombreB) - countMatches(nombreA) // descendente
        })
    },
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
    compartirResultado() {
      // Crear representación tipo Wordle
      let resultado = `¿Quién es? del día ${new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
      })} en ${5 - this.intentos}/5 intentos\n`

      this.historial.forEach((item) => {
        let fila = ''
        if (item.nombre === this.integranteOculto.nombre) {
          fila = '🟩'
        } else {
          fila = '🟥'
        }
        resultado += fila + '\n'
      })

      // Copiar al portapapeles
      navigator.clipboard.writeText(resultado).then(() => {
        this.mostrarCopiado = true
      })
    },
    async fetchIntegranteQE() {
      this.cargando = true;
      try {
        const response = await axios.get('/integranteQE')
        this.integranteOculto = this.integrantes[response.data.integrante]
        this.intentosTotales = response.data.intentosTotalesQE
        this.aciertos = response.data.aciertosQE
        this.startTimer(response.data.tiempoRestante)
        if (
          localStorage.getItem('integranteQE') != response.data.integrante
        ) {
          localStorage.removeItem('integranteQE')
          localStorage.removeItem('terminadoQE')
          localStorage.removeItem('historialQE')
          localStorage.removeItem('intentosQE')
          location.reload()
        }
        localStorage.setItem('integranteQE', response.data.integrante)
      } catch (error) {
        console.log('error' + error)
      } finally {
        this.cargando = false
      }
    },
    async postIntento(valor) {
      try {
        const response = await axios.post('/intentoQE', { intento: valor })
        this.intentosTotales = response.data.intentosTotalesQE
        this.aciertos = response.data.aciertosQE
      } catch (error) {
        console.log(error)
      }
    },
    mostrarModal(texto) {
      this.modalFin = true
      this.textoModal = texto
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
    async adivinar(integrante) {
      if (!integrante) return

      if (integrante.nombre === this.integranteOculto.nombre) {
        this.mostrarModal('GANASTE!!!')
        this.terminado = 1
        localStorage.setItem('terminadoQE', this.terminado)
        this.postIntento(1)
      } else if (this.intentos - 1 <= 0) {
        this.mostrarModal('Perdiste :(')
        this.terminado = -1
        localStorage.setItem('terminadoQE', this.terminado)
        this.postIntento(0)
      }
      if (this.terminado == 0) {
        this.$refs.inputIntegrante.focus()
      }
      this.historial.push(integrante)
      localStorage.setItem('historialQE', JSON.stringify(this.historial))

      this.intentos--
      localStorage.setItem('intentosQE', this.intentos)
      this.intento = ''
      this.mostrarOpciones = false

      // Eliminar el integrante del arreglo de opciones
      const index = this.integrantes.findIndex((i) => i.nombre === integrante.nombre)
      if (index !== -1) {
        this.integrantes.splice(index, 1)
      }
    },

    enterSeleccion() {
      if (this.opcionesFiltradas.length > 0) {
        this.adivinar(this.opcionesFiltradas[0])
      }
    },
    handleClickOutside(event) {
      const container = this.$refs.containerRef
      if (container && !container.contains(event.target)) {
        this.mostrarOpciones = false
      }
    },
    async fetchIntegrantes() {
      if (this.integrantes.length > 0) return
      try {
        const response = await axios.get('/integrantes')
        this.integrantes = await response.data
        localStorage.setItem('integrantes', JSON.stringify(this.integrantes))
      } catch (error) {
        console.error('Error fetching integrantes:', error)
      }
    },
  },
  mounted() {
    document.addEventListener('click', this.handleClickOutside)
    this.fetchIntegrantes()
    this.fetchIntegranteQE()
    this.checkVersion()
  },
  unmounted() {
    document.removeEventListener('click', this.handleClickOutside)
    if (this.timer) clearInterval(this.timer)
  },
}
</script>

<style scoped>
.flex-col-intento {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.flex-col-li {
  display: flex;
  flex-direction: column;
  width: 200px;
  align-items: center;
  margin: auto;
}

.correcto {
  background-color: #4caf50;
  /* Verde */
  color: white;
}

.incorrecto {
  background-color: #f44336;
  /* Rojo */
  color: white;
}

.img-wrapper {
  width: 150px;
  height: 150px;
  border-radius: 20px;
  overflow: hidden;
  /* recorta lo que se sale */
  margin: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.img-oculta {
  position: relative;
  object-fit: cover;
  /* recorte centrado */
  object-position: center;
  /* mantener centrado */
  /* evitar selección y arrastre */
  user-select: none;
  -webkit-user-drag: none;
}

/* Niveles */
.img-0 {
  top: -150%;
  left: -150%;
  width: 400%;
  height: 400%;
  filter: grayscale(100%) blur(10px);
}

.img-1 {
  top: -140%;
  left: -140%;
  width: 380%;
  height: 380%;
  filter: grayscale(90%) blur(7px);
}

.img-2 {
  top: -120%;
  left: -120%;
  width: 350%;
  height: 350%;
  filter: grayscale(80%) blur(5px);
}

.img-3 {
  top: -100%;
  left: -100%;
  width: 300%;
  height: 300%;
  filter: grayscale(70%) blur(3px);
}

.img-4 {
  top: -75%;
  left: -75%;
  width: 250%;
  height: 250%;
  filter: grayscale(50%) blur(1px);
}

.img-5 {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  filter: grayscale(0%) blur(0px);
}
</style>
