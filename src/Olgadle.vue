<template>
  <div v-if="modalFin && textoModal === 'Perdiste :('" class="fondoModal" @click="modalFin = false">
    <div class="containerModal" @click.stop>
      <div class="headerModal">{{ textoModal }}</div>
      <div class="bodyModal" v-if="integranteOculto && integranteOculto.nombre">
        Era {{ integranteOculto.nombre }}
        <br />
        <img v-if="integranteOculto && integranteOculto.img"
          :src="'https://nazadoto.com:3501/uploads/' + integranteOculto.img" alt="" class="square mt-2" />
      </div>
      <div class="bodyModal">Volvé en {{ tiempoRestante }}</div>
      <button class="btn-ok c-red" @click="modalFin = false">Cerrar</button>
    </div>
  </div>

  <!-- Modal Ganador -->
  <div v-if="modalFin && textoModal === 'GANASTE!!!'" class="fondoModal" @click="modalFin = false">
    <div class="containerModal" @click.stop>
      <div class="headerModal">🎉 ¡Ganaste!</div>
      <div class="bodyModal">Lo lograste en {{ 7 - intentos }}/7 intentos</div>
      <button class="btn-ok mb-2" @click="compartirResultado">Compartir</button>
      <p class="bodyModal" v-if="mostrarCopiado">Resultado copiado en el portapapeles.</p>
      <button class="btn-ok c-red" @click="modalFin = false">Cerrar</button>
    </div>
  </div>
  <div class="fondoModal" @click="mostrarTutorial = false" v-if="mostrarTutorial">
    <div class="containerModal" @click.stop>
      <div class="headerModal">Tutorial</div>
      <p class="bodyModal">
        Primero escribí el nombre de un integrante de OLGA (conductor, productor o técnica).<br />
        Seguí las pistas que irán apareciendo: <br />🟩Verde = correcto <br />🟨Amarillo = coincide
        una de los dos, <br />🟥Rojo = incorrecto. <br />
        Intentá hasta que todas las pistas sean verdes.
      </p>
      <button class="btn-ok" @click="mostrarTutorial = false">Entendido!</button>
    </div>
  </div>
  <div class="container py-5">
    <div class="w-fit-content mx-auto">
      <img src="/logo.png" class="logo" alt="" />
    </div>
    <p class="lead text-center mt-2 mb-2 adivina-container">
      ¡Adiviná el integrante de OLGA de hoy!
    </p>
    <div v-if="cargando" class="loader-container">
      <div class="spinner"></div>
    </div>

    <span v-else>
      <span v-if="terminado == 0">
        <button class="btn-ok mb-2 c-yellow" @click="mostrarTutorial = true">Tutorial</button>
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
              <img v-if="opcion.img" :src="'https://nazadoto.com:3501/uploads/' + opcion.img" alt="foto"
                class="img-square" />
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
        <span v-if="terminado != -1">
          <button class="btn-ok mb-2" @click="compartirResultado">Compartir</button>
          <p class="c-white" v-if="mostrarCopiado">Resultado copiado en el portapapeles.</p>
        </span>
        Volvé en {{ tiempoRestante }}
      </div>
      <!-- Historial -->
      <div class="mx-auto" id="historialContainer">
        <!-- Encabezados de atributos -->
        <div v-if="historial.length > 0"
          class="d-flex flex-row gap-1 text-center align-items-center w-744 mx-auto fs-small c-white mb-2">
          <div class="col-width">Integrante</div>
          <div class="col-width">Género</div>
          <div class="col-width">Programas</div>
          <div class="col-width">Rol</div>
          <div class="col-width">¿Canta?</div>
          <div class="col-width">Hizo</div>
          <div class="col-width">Nació</div>
        </div>

        <ul v-show="historial.length > 0" class="list-group w-fit-content mx-auto">
          <li v-for="item in historial" :key="item.nombre" class="list-group-item d-flex gap-1 bg-none w-744 mb-1">
            <div class="square relative" v-show="item.img && item.mostrar.img">
              <div class="inset-shadow absolute-100 rounded"></div>
              <img class="rounded" width="100%" height="100%" :src="'https://nazadoto.com:3501/uploads/' + item.img" />
            </div>

            <div class="square padding-text" :class="atributoColor(item, 'genero')" v-show="item.mostrar.genero">
              {{ item.genero }}
            </div>

            <div class="square padding-text" :class="atributoColor(item, 'programas')" v-show="item.mostrar.programas">
              {{ item.programas.join(' / ') }}
            </div>
            <div class="square padding-text" :class="atributoColor(item, 'rol')" v-show="item.mostrar.rol">
              {{ item.rol }}
            </div>

            <div class="square padding-text" :class="atributoColor(item, 'canta')" v-show="item.mostrar.canta">
              {{ item.canta }}
            </div>

            <div class="square padding-text" :class="atributoColor(item, 'hizo')" v-show="item.mostrar.hizo">
              {{ item.hizo }}
            </div>

            <div class="square padding-text nacio-box" :class="atributoColor(item, 'nacio')"
              v-show="item.mostrar.nacio">
              <!-- Flechita arriba -->
              <span v-if="integranteOculto && item.nacio < integranteOculto.nacio" class="flecha flecha-arriba">{{ integranteOculto.nacio ==
                'No sé' ? '-' : '▲' }}</span>

              <!-- Año de nacimiento -->
              <div class="nacio-text">{{ item.nacio }}</div>

              <!-- Flechita abajo -->
              <span v-if="integranteOculto && item.nacio > integranteOculto.nacio" class="flecha flecha-abajo">{{ integranteOculto.nacio ==
                'No sé' ? '-' : '▼' }}</span>
            </div>
          </li>
        </ul>
      </div>
      <p class="aclaracion">Si sabés alguno de los datos faltantes avisame @nazadoto</p>
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
      mostrarTutorial: false,
      mostrarCopiado: false,
      modalFin: false,
      textoModal: '',
      historial: JSON.parse(localStorage.getItem('historial')) || [],
      integrantes: JSON.parse(localStorage.getItem('integrantes')) || [],
      integranteOculto: null,
      intentos: Number(localStorage.getItem('intentos')) || 7,
      version: localStorage.getItem('version') || null,
      intento: '',
      intentosTotales: 0,
      aciertos: 0,
      terminado: Number(localStorage.getItem('terminado')) || 0,
      mostrarOpciones: false,
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
    async reset() {
      this.historial = [];
      this.intentos = 7;
      this.terminado = 0;
      this.fetchIntegrante();
    },
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
    async fetchIntegrantes() {
      this.cargando = true;
      try {
        const response = await axios.get('/integrantes')
        this.integrantes = await response.data
        localStorage.setItem('integrantes', JSON.stringify(this.integrantes))
      } catch (error) {
        console.error('Error fetching integrantes:', error)
      } finally {
        this.cargando = false;
      }
    },
    compartirResultado() {
      // Crear representación tipo Wordle
      let resultado = `Olgadle del día ${new Date().toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
      })} en ${7 - this.intentos}/7 intentos\n`

      this.historial.forEach((item) => {
        let fila = ''

        // Recorremos atributos importantes
        const atributos = ['genero', 'programas', 'rol', 'canta', 'hizo', 'nacio']
        atributos.forEach((attr) => {
          const valorOculto = this.integranteOculto[attr]

          if (Array.isArray(item[attr])) {
            const intersect = item[attr].filter((v) => valorOculto.includes(v))
            if (intersect.length === valorOculto.length && intersect.length === item[attr].length) {
              fila += '🟩'
            } else if (intersect.length > 0) {
              fila += '🟨'
            } else {
              fila += '🟥'
            }
          } else {
            if (item[attr] === valorOculto) {
              fila += '🟩'
            } else {
              fila += '🟥'
            }
          }
        })

        resultado += fila + '\n'
      })

      // Copiar al portapapeles
      navigator.clipboard.writeText(resultado).then(() => {
        this.mostrarCopiado = true
      })
    },
    async fetchIntegrante() {
      this.cargando = true;
      try {
        const response = await axios.get('/integrante')
        this.integranteOculto = this.integrantes[response.data.integrante]
        this.intentosTotales = response.data.intentosTotales
        this.aciertos = response.data.aciertos
        this.startTimer(response.data.tiempoRestante)
        if (
          localStorage.getItem('integranteOculto') &&
          localStorage.getItem('integranteOculto') != response.data.integrante
        ) {
          localStorage.removeItem('integranteOculto')
          localStorage.removeItem('terminado')
          localStorage.removeItem('historial')
          localStorage.removeItem('intentos')
          this.reset();
        }
        localStorage.setItem('integranteOculto', response.data.integrante)
      } catch (error) {
        console.log('error' + error)
      } finally {
        this.cargando = false
      }
    },
    revelarAtributos(item) {
      const atributos = ['img', 'genero', 'programas', 'rol', 'canta', 'hizo', 'nacio']

      atributos.forEach((attr, index) => {
        setTimeout(() => {
          item.mostrar[attr] = true
        }, index * 600)
      })
      setTimeout(async () => {
        this.$refs.inputIntegrante.placeholder = 'Escribí el nombre de algún integrante...'
        this.$refs.inputIntegrante.disabled = false
        this.$refs.inputIntegrante.focus()
        if (item.nombre == this.integranteOculto.nombre) {
          this.mostrarModal('GANASTE!!!')
          this.terminado = 1
          localStorage.setItem('terminado', this.terminado)
          this.postIntento(1)
        } else if (this.intentos == 0) {
          this.mostrarModal('Perdiste :(')
          this.terminado = -1
          this.intentosTotales++
          localStorage.setItem('terminado', this.terminado)
          this.postIntento(0)
        }
      }, atributos.length * 600)
    },
    async postIntento(valor) {
      try {
        const response = await axios.post('/intento', { intento: valor })
        console.log(response)
        this.intentosTotales = response.data.intentosTotales
        this.aciertos = response.data.aciertos
      } catch (error) {
        console.log(error)
      }
    },
    revelarAtributosSinIntento(item) {
      const atributos = ['img', 'genero', 'programas', 'rol', 'canta', 'hizo', 'nacio']

      atributos.forEach((attr, index) => {
        setTimeout(() => {
          item.mostrar[attr] = true
        }, index * 600)
      })
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

      this.$refs.inputIntegrante.placeholder = 'Verificando...'
      this.$refs.inputIntegrante.disabled = true

      const correcto = integrante.id === this.integranteOculto.id

      // Crear un objeto con los atributos, todos ocultos al principio
      const nuevoItem = {
        ...integrante,
        correcto,
        mostrar: {
          img: false,
          genero: false,
          rol: false,
          canta: false,
          hizo: false,
          programas: false,
          nacio: false,
        },
      }

      this.historial.push(nuevoItem)
      localStorage.setItem('historial', JSON.stringify(this.historial))

      this.intentos--
      localStorage.setItem('intentos', this.intentos)
      this.intento = ''
      this.mostrarOpciones = false

      // Eliminar el integrante del arreglo de opciones
      const index = this.integrantes.findIndex((i) => i.nombre === integrante.nombre)
      if (index !== -1) {
        this.integrantes.splice(index, 1)
      }
      // Mostrar los atributos uno a uno
      this.revelarAtributos(this.historial[this.historial.length - 1])
    },

    enterSeleccion() {
      if (this.opcionesFiltradas.length > 0) {
        this.adivinar(this.opcionesFiltradas[0])
      }
    },

    atributoColor(item, atributo) {
      if (!this.integranteOculto) return 'bg-danger text-white p-1 rounded'
      const valorOculto = this.integranteOculto[atributo]
      if (valorOculto === undefined || valorOculto === null) return 'bg-danger text-white p-1 rounded'

      if (Array.isArray(item[atributo])) {
        const intersect = item[atributo].filter((v) => valorOculto.includes(v))
        if (intersect.length === valorOculto.length && intersect.length === item[atributo].length)
          return 'bg-success text-white p-1 rounded'
        if (intersect.length > 0) return 'bg-warning text-dark p-1 rounded'
        return 'bg-danger text-white p-1 rounded'
      }

      if (item[atributo] === valorOculto) return 'bg-success text-white p-1 rounded'
      if (atributo === 'rol' || atributo === 'programas') {
        if (Array.isArray(valorOculto) && valorOculto.includes(item[atributo]))
          return 'bg-warning text-dark p-1 rounded'
      }
      return 'bg-danger text-white p-1 rounded'
    },
    handleClickOutside(event) {
      const container = this.$refs.containerRef
      if (container && !container.contains(event.target)) {
        this.mostrarOpciones = false
      }
    },
  },
  async mounted() {
    this.checkVersion()
    document.addEventListener('click', this.handleClickOutside)
    await this.fetchIntegrantes()
    await this.fetchIntegrante()
    if (this.historial.length > 0) {
      this.historial.forEach((item) => {
        // Asegurarse de que todos los atributos estén visibles
        this.revelarAtributosSinIntento(item)
      })
    }
  },
  unmounted() {
    document.removeEventListener('click', this.handleClickOutside)
    if (this.timer) clearInterval(this.timer)
  },
}
</script>

<style>
/* =====================
   ESTILOS BASE (DESKTOP FIRST)
   ===================== */
.nacio-box {
  display: flex;
  position: relative;
  flex-direction: column;
  /* organiza arriba → centro → abajo */
  justify-content: center;
  align-items: center;
}

.aclaracion {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  font-style: italic;
  text-align: center;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px;
  letter-spacing: 0.02em;
}

.c-yellow {
  background-color: rgb(255, 212, 82) !important;
  color: black !important;
}

.c-yellow:hover {
  background-color: rgb(235, 190, 56) !important;
}

.flecha {
  font-size: 14px;
  font-weight: bold;
  text-shadow: 1px 1px 2px black;
  line-height: 1;
}

.flecha-arriba {
  position: absolute;
  top: 50%;
  transform: translateY(calc(-50% - 20px));
  color: white;
}

.flecha-abajo {
  position: absolute;
  top: 50%;
  transform: translateY(calc(-50% + 20px));
  color: white;
}

.loader-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  color: white;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: girar 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes girar {
  to {
    transform: rotate(360deg);
  }
}

.texto-ganaste {
  font-weight: 800;
  color: #64f38a;
  text-shadow: 0 2px 10px rgba(43, 221, 96, 0.35);
}

.texto-perdiste {
  font-weight: 800;
  color: #ff6b6b;
  text-shadow: 0 2px 10px rgba(255, 74, 74, 0.35);
}

.m-auto {
  margin: auto;
}

/* Animaciones de slide */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.5s ease;
}

.slide-leave-active {
  position: absolute;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(-100%);
}

.slide-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

/* Scroll personalizado */
.barra-nav::-webkit-scrollbar {
  width: 30px;
}

.barra-nav::-webkit-scrollbar-thumb {
  background-color: rgba(255, 61, 61, 0.9);
}

.barra-nav::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 61, 61, 1);
}

.barra-nav::-webkit-scrollbar-track {
  background-color: rgba(255, 61, 61, 0.3);
}

.inset-shadow {
  box-shadow: inset 0 0 6px #000;
}

.select-integrantes {
  max-height: 280px;
  overflow: auto;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
}

.input-size {
  height: 50px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(20, 20, 28, 0.9);
  color: #fff;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
}

.input-size:focus {
  border-color: #ff6060;
  box-shadow: 0 0 0 3px rgba(255, 96, 96, 0.22);
  background: rgba(20, 20, 28, 0.95);
  color: #fff;
}

.input-size::placeholder {
  color: rgba(255, 255, 255, 0.62);
}

.adivina-container {
  color: #fff;
  background: linear-gradient(135deg, #ff4e4e 0%, #c72eff 100%);
  border-radius: 12px;
  padding: 14px 16px;
  font-weight: 800;
  box-shadow: 0 10px 30px rgba(120, 50, 255, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.5);
  width: fit-content;
  margin: auto;
}

.c-white {
  color: white;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}

.logo {
  width: 150px;
  height: 150px;
}

.list-group,
.form-control {
  border-radius: 0;
}

.relative {
  position: relative;
}

.absolute-100 {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.c-red {
  background: linear-gradient(180deg, #ff5858 0%, #d93636 100%) !important;
}

/* Fondo principal */

/* Modal */
.fondoModal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.containerModal {
  background: #f9f9fb;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  animation: aparecer 0.3s ease;
}

.headerModal {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 12px;
  text-align: center;
  color: #21232a;
}

.bodyModal {
  font-size: 1rem;
  color: #4a4f5d;
  text-align: center;
  text-justify: justify;
  margin-bottom: 20px;
}

.btn-ok {
  display: block;
  margin: 0 auto;
  padding: 10px 20px;
  background: linear-gradient(180deg, #5c8dff 0%, #3f6fe2 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(56, 95, 200, 0.3);
  transition: transform 0.15s ease, filter 0.2s ease;
}

.btn-ok:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

@keyframes aparecer {
  from {
    opacity: 0;
    transform: scale(0.9);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

img {
  object-fit: cover;
}

/* Tablas/columnas */
.col-width {
  width: 100px;
  position: relative;
}

.col-width::after {
  display: block;
  position: absolute;
  bottom: -5px;
  left: 0;
  border-bottom: white 3px solid;
  content: '';
  width: calc(100% - 10px);
  margin: 0 5px;
}

.fs-small {
  font-weight: bold;
  font-size: 0.9rem;
}

body {
  font-family: 'Inter', sans-serif;
}

.text-sm {
  font-size: 0.875rem;
}

.list-group {
  gap: 1px;
}

.list-group-item {
  border: none;
  padding: 0;
}

.select-integrantes .list-group-item {
  padding: 8px 10px;
  color: #ececf1;
  background: rgba(24, 24, 34, 0.97);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.select-integrantes .list-group-item:hover {
  background: rgba(72, 72, 98, 0.95);
}

.w-744 {
  width: 744px;
  align-items: start;
  justify-content: start;
  text-align: left;
}

.bg-none {
  background: none;
}

.img-square {
  width: 60px;
  height: 60px;
  object-fit: cover;
}

.square {
  width: 100px;
  height: 100px;
  align-content: center;
  text-align: center;
  vertical-align: middle;
  object-fit: cover;
}

.padding-text {
  padding: 0 5px;
}

.list-group-item .col {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.cursor-pointer:hover {
  cursor: pointer;
}

.w-fit-content {
  width: fit-content;
}

.bg-danger {
  background-color: #e64646 !important;
  box-shadow: inset 0 0 6px #000;
}

.bg-success {
  background-color: #28a745 !important;
  box-shadow: inset 0 0 6px #000;
}

.bg-warning {
  background-color: #d8a92f !important;
  box-shadow: inset 0 0 6px #000;
}

/* =====================
   MEDIA QUERIES (DESKTOP → MOBILE)
   ===================== */

/* Tablets (≤ 992px) */
@media (max-width: 992px) {

  .container,
  .container-lg,
  .container-md,
  .container-sm {
    max-width: 960px;
  }

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
    width: 635px;
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
    width: 520px;
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
    width: 480px;
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
    width: 380px;
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
    padding: 0 5px;
    margin: auto;
  }
}
</style>
