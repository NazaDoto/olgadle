<template>
  <main class="container admin-page py-4">
    <header class="admin-header d-flex justify-content-between align-items-center mb-4">
      <h1 class="game-title">Integrantes</h1>
      <div class="d-flex gap-2 flex-wrap">
        <button class="btn btn-outline-light" @click="cerrarSesion">Cerrar sesión</button>
        <button class="btn btn-success" @click="showModalNuevo = true">+ Nuevo integrante</button>
      </div>
    </header>

    <div class="card shadow-sm mb-4">
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-6">
            <input v-model="busqueda" class="form-control" aria-label="Buscar integrante" placeholder="Buscá un integrante…" />
          </div>

          <div class="col-md-6">
            <select v-model="filtroPrograma" aria-label="Filtrar por programa" class="form-select">
              <option value="">Todos los programas</option>

              <option v-for="p in programas" :key="p.id" :value="p.nombre">
                {{ p.nombre }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div v-if="cargando" class="panel-load" role="status" aria-label="Cargando integrantes">
      <div class="panel-spinner"></div>
    </div>
    <div v-else-if="errorPanel" class="card card-body mb-3" role="alert">
      <p>{{ errorPanel }}</p>
      <button class="btn btn-primary align-self-start" @click="cargarPanel">Reintentar</button>
    </div>
    <p v-else-if="!integrantesFiltrados.length" class="card card-body">No hay integrantes para esta búsqueda.</p>
    <p v-if="mensaje" class="admin-feedback" role="status">{{ mensaje }}</p>
    <div class="admin-list">
      <article v-for="i in integrantesFiltrados" :key="i.id" class="card">
        <div class="admin-summary">
          <img v-if="i.img" loading="lazy" alt="" :src="'/uploads/' + i.img" width="52" height="52" />
          <span v-else class="admin-avatar" aria-hidden="true">{{ i.nombre.charAt(0) }}</span>
          <div class="admin-person">
            <h2>{{ i.nombre }}</h2>
            <p>{{ [i.rol, ...i.programas].filter(Boolean).join(' · ') }}</p>
          </div>
          <button class="btn btn-outline-light" :aria-expanded="editorId === i.id"
            :aria-controls="'editor-' + i.id" @click="abrirEditor(i)">
            {{ editorId === i.id ? 'Cerrar' : 'Editar' }}
          </button>
        </div>
        <div v-if="editorId === i.id" :id="'editor-' + i.id" class="card-body admin-editor">
            <label class="small" :for="'nombre-' + i.id">Nombre</label>
            <input :id="'nombre-' + i.id" v-model="i.nombre" class="form-control mb-3" />

            <!-- INFO -->

            <div class="row g-2">
              <div class="col-6">
                <label class="small">Género</label>
                <select v-model="i.genero" aria-label="Género" class="form-select form-select-sm">
                  <option>Femenino</option>
                  <option>Masculino</option>
                </select>
              </div>

              <div class="col-6">
                <label class="small">Rol</label>
                <select v-model="i.rol" aria-label="Rol" class="form-select form-select-sm">
                  <option>Técnica</option>
                  <option>Producción</option>
                  <option>Conducción</option>
                </select>
              </div>

              <div class="col-6">
                <label class="small">Canta</label>
                <select v-model="i.canta" aria-label="Canta" class="form-select form-select-sm">
                  <option>Sí</option>
                  <option>No</option>
                </select>
              </div>

              <div class="col-6">
                <label class="small">Nacimiento</label>
                <input v-model="i.nacio" aria-label="Nacimiento" class="form-control form-control-sm" />
              </div>

              <div class="col-12">
                <label class="small">Trabajó en</label>
                <input v-model="i.hizo" aria-label="Trabajó en" class="form-control form-control-sm" />
              </div>
            </div>

            <hr />

            <!-- PROGRAMAS -->

            <label class="fw-semibold small mb-2">Programas</label>

            <div class="mb-2">
              <span v-for="p in i.programas" :key="p" class="badge bg-primary me-1 mb-1">
                {{ p }}

                <button class="admin-chip-remove" :aria-label="'Quitar ' + p" @click="quitarPrograma(i, p)">×</button>
              </span>
            </div>

            <!-- seleccionar existente -->
            <div>

              <select v-model="i.nuevoPrograma" aria-label="Agregar programa" class="form-select form-select-sm mb-2" @change="agregarPrograma(i)">
                <option disabled value="">Agregar programa existente</option>

                <option v-for="p in programas.filter(programa => !i.programas.includes(programa.nombre))" :key="p.id" :value="p.id">
                  {{ p.nombre }}
                </option>
              </select>

              <!-- crear nuevo -->

              <div class="input-group input-group-sm">
                <input v-model="i.programaNuevoNombre" class="form-control" placeholder="Crear programa nuevo" />

                <button class="btn btn-success" @click="crearPrograma(i)">Crear</button>
              </div>
            </div>

            <hr />

            <!-- IMAGEN -->

            <div class="border rounded p-2 text-center mb-3" @dragover.prevent @drop="dropImagen($event, i)">
              <input type="file" accept="image/*" aria-label="Foto del integrante" class="form-control form-control-sm mb-2" @change="subirImagen($event, i)" />

              <input type="text" class="form-control form-control-sm" placeholder="Ctrl+V para pegar imagen"
                @paste="pegarImagen($event, i)" />
            </div>

            <!-- ACCIONES -->

            <div class="d-flex justify-content-between">
              <button class="btn btn-danger btn-sm" @click="eliminar(i)">Eliminar</button>

              <button class="btn btn-primary btn-sm" @click="guardar(i)">Guardar cambios</button>
            </div>
        </div>
      </article>
    </div>
  </main>

  <div class="modalNuevo" role="dialog" aria-modal="true" aria-labelledby="nuevo-integrante-titulo" v-if="showModalNuevo">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="nuevo-integrante-titulo" class="modal-title h5">Nuevo integrante</h2>
          <button class="btn-close btn-close-white" aria-label="Cerrar" @click="showModalNuevo = false"></button>
        </div>

        <div class="modal-body">
          <div class="mb-2">
            <label>Nombre</label>
            <input v-model="nuevo.nombre" class="form-control" />
          </div>

          <div class="row">
            <div class="col">
              <label>Género</label>
              <select v-model="nuevo.genero" class="form-select">
                <option>Femenino</option>
                <option>Masculino</option>
              </select>
            </div>

            <div class="col">
              <label>Rol</label>
              <select v-model="nuevo.rol" class="form-select">
                <option>Técnica</option>
                <option>Producción</option>
                <option>Conducción</option>
              </select>
            </div>
          </div>

          <div class="row mt-2">
            <div class="col">
              <label>Canta</label>
              <select v-model="nuevo.canta" class="form-select">
                <option>Sí</option>
                <option>No</option>
              </select>
            </div>

            <div class="col">
              <label>Nacimiento</label>
              <input v-model="nuevo.nacio" class="form-control" />
            </div>
          </div>

          <div class="mt-2">
            <label>Trabajó en</label>
            <input v-model="nuevo.hizo" class="form-control" />
          </div>

          <label class="fw-semibold small mb-2">Programas</label>

          <div class="mb-2">
            <span v-for="p in nuevo.programas" :key="p" class="badge bg-primary me-1 mb-1">
              {{ p }}
              <button class="admin-chip-remove" :aria-label="'Quitar ' + p" @click="quitarProgramaNuevo(p)">×</button>
            </span>
          </div>
          <div class="admin-field-row">

            <select v-model="nuevo.nuevoPrograma" class="d-flex form-select form-select-sm"
              @change="agregarProgramaNuevo">
              <option disabled value="">Agregar programa existente</option>

              <option v-for="p in programas" :key="p.id" :value="p.nombre">
                {{ p.nombre }}
              </option>
            </select>

            <div class="input-group input-group-sm">
              <input v-model="nuevo.programaNuevoNombre" class="d-flex form-control"
                placeholder="Crear programa nuevo" />

              <button class="btn btn-success" @click="crearProgramaNuevo">Crear</button>
            </div>
          </div>

          <label class="fw-semibold small mb-2">Imagen</label>

          <div class="border rounded p-2 text-center " @dragover.prevent @drop="dropImagenNuevo">
            <img v-if="nuevo.img" :src="'/uploads/' + nuevo.img" class="img-fluid mb-2"
              style="max-height: 120px" />
            <div class="admin-field-row mt-2">

              <input type="file" accept="image/*" aria-label="Foto del integrante" class="form-control form-control-sm mb-2" @change="subirImagenNuevo" />

              <input type="text" class="form-control form-control-sm" placeholder="Ctrl+V para pegar imagen"
                @paste="pegarImagenNuevo" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModalNuevo = false">Cancelar</button>

          <button class="btn btn-success" @click="crearIntegrante">Crear integrante</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'AdminPanel',

  data() {
    return {
      integrantes: [],
      programas: [],
      busqueda: '',
      filtroPrograma: '',
      showModalNuevo: false,
      editorId: null,
      cargando: true,
      errorPanel: '',
      mensaje: '',
      nuevo: {
        nombre: '',
        genero: 'Masculino',
        rol: 'Producción',
        canta: 'No',
        hizo: '',
        nacio: '',
        img: '',
        programas: [],
        nuevoPrograma: '',
        programaNuevoNombre: '',
      },
    }
  },

  mounted() {
    this.cargarPanel()
  },
  computed: {
    integrantesFiltrados() {
      return this.integrantes.filter((i) => {
        const matchNombre = i.nombre.toLowerCase().includes(this.busqueda.trim().toLowerCase())

        const matchPrograma = !this.filtroPrograma || i.programas.includes(this.filtroPrograma)

        return matchNombre && matchPrograma
      })
    },
  },

  methods: {
    async cargarPanel() {
      this.cargando = true
      this.errorPanel = ''
      try {
        await Promise.all([this.cargarIntegrantes(), this.cargarProgramas()])
      } catch {
        this.errorPanel = 'No se pudo cargar el panel.'
      } finally {
        this.cargando = false
      }
    },

    abrirEditor(integrante) {
      this.mensaje = ''
      this.editorId = this.editorId === integrante.id ? null : integrante.id
      integrante.nuevoPrograma = ''
    },

    cerrarSesion() {
      sessionStorage.removeItem('adminToken')
      this.$router.push('/login')
    },

    async crearIntegrante() {
      const res = await axios.post('/integrantes', this.nuevo)

      const id = res.data.id

      for (let programa of this.nuevo.programas) {
        const prog = this.programas.find((p) => p.nombre === programa)

        if (prog) {
          await axios.post('/integrantes/programas/asignar', {
            id_integrante: id,
            id_programa: prog.id,
          })
        }
      }

      this.cargarIntegrantes()

      this.showModalNuevo = false

      this.nuevo = {
        nombre: '',
        genero: 'Masculino',
        rol: 'Producción',
        canta: 'No',
        hizo: '',
        nacio: '',
        img: '',
        programas: [],
        nuevoPrograma: '',
        programaNuevoNombre: '',
      }
    },

    async subirImagenNuevo(e) {
      const file = e.target.files[0]
      if (!file) return

      await this.enviarImagenNuevo(file)
    },

    async pegarImagenNuevo(e) {
      const items = e.clipboardData.items

      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          await this.enviarImagenNuevo(file)
        }
      }
    },

    async dropImagenNuevo(e) {
      const file = e.dataTransfer.files[0]
      if (file) await this.enviarImagenNuevo(file)
    },

    async enviarImagenNuevo(file) {
      const formData = new FormData()

      formData.append('imagen', file)
      formData.append('nombre', this.nuevo.nombre)

      const res = await axios.post('/upload', formData)

      this.nuevo.img = res.data.url
    },

    agregarProgramaNuevo() {
      if (!this.nuevo.nuevoPrograma) return

      if (!this.nuevo.programas.includes(this.nuevo.nuevoPrograma)) {
        this.nuevo.programas.push(this.nuevo.nuevoPrograma)
      }

      this.nuevo.nuevoPrograma = ''
    },

    quitarProgramaNuevo(programa) {
      this.nuevo.programas = this.nuevo.programas.filter((p) => p !== programa)
    },

    async crearProgramaNuevo() {
      if (!this.nuevo.programaNuevoNombre) return

      const res = await axios.post('/programas', {
        nombre: this.nuevo.programaNuevoNombre,
      })

      const nombre = this.nuevo.programaNuevoNombre

      this.programas.push({
        id: res.data.id,
        nombre,
      })

      this.nuevo.programas.push(nombre)

      this.nuevo.programaNuevoNombre = ''
    },
    async crearPrograma(integrante) {
      if (!integrante.programaNuevoNombre) return

      const nombre = integrante.programaNuevoNombre.trim()
      if (!nombre) return
      const res = await axios.post('/programas', { nombre })

      const nuevoProgramaId = res.data.id

      // asignar al integrante
      await axios.post('/integrantes/programas/asignar', {
        id_integrante: integrante.id,
        id_programa: nuevoProgramaId,
      })

      // limpiar campo
      integrante.programaNuevoNombre = ''

      integrante.programas.push(nombre)
      await this.cargarProgramas()
    },


    async quitarPrograma(integrante, programa) {
      await axios.post('/integrantes/programas/quitar', {
        id_integrante: integrante.id,
        programa,
      })
      integrante.programas = integrante.programas.filter((nombre) => nombre !== programa)
    },
    async eliminar(integrante) {
      if (!confirm(`¿Eliminar a ${integrante.nombre}?`)) return

      await axios.delete('/integrantes/' + integrante.id)

      this.cargarIntegrantes()
    },

    async subirImagen(e, integrante) {
      const file = e.target.files[0]
      if (!file) return

      await this.enviarImagen(file, integrante)
    },

    async pegarImagen(e, integrante) {
      const items = e.clipboardData.items

      for (let item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile()
          await this.enviarImagen(file, integrante)
        }
      }
    },

    async dropImagen(e, integrante) {
      const file = e.dataTransfer.files[0]

      if (file) await this.enviarImagen(file, integrante)
    },

    async enviarImagen(file, integrante) {
      const formData = new FormData()

      formData.append('imagen', file)
      formData.append('nombre', integrante.nombre)

      const res = await axios.post('/upload', formData)

      integrante.img = res.data.url
    },

    async borrarImagen(integrante) {
      await axios.post('/delete-image', {
        img: integrante.img,
      })

      integrante.img = ''
    },

    async cargarIntegrantes() {
      const res = await axios.get('/integrantes')

      this.integrantes = res.data
    },

    async cargarProgramas() {
      const res = await axios.get('/programas')

      this.programas = res.data
    },

    async agregarPrograma(integrante) {
      if (!integrante.nuevoPrograma) return

      const programa = this.programas.find((item) => item.id === integrante.nuevoPrograma)
      if (!programa) return
      await axios.post('/integrantes/programas/asignar', {
        id_integrante: integrante.id,
        id_programa: programa.id,
      })
      integrante.programas.push(programa.nombre)
      integrante.nuevoPrograma = ''
    },

    async guardar(integrante) {
      try {
        await axios.post('/integrantes/' + integrante.id, integrante)
        this.mensaje = 'Cambios guardados.'
      } catch {
        this.mensaje = 'No se pudieron guardar los cambios.'
      }
    },
  },
}
</script>

<style scoped>
.modalNuevo {
  position: fixed;
  top: 0;
  left: 0;

  width: 100%;
  height: 100%;

  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);

  display: flex;
  align-items: center;
  justify-content: center;


  z-index: 9999;
}

.modalNuevo .modal-dialog {
  max-width: 520px;
  width: 100%;
}

.modalNuevo .modal-content {
  border-radius: 14px;
  border: none;

  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.2),
    0 2px 6px rgba(0, 0, 0, 0.1);

  animation: modalFade 0.25s ease;

}

.modalNuevo .modal-header {
  border-bottom: 1px solid #eee;
  padding: 18px 22px;

  font-weight: 600;
  font-size: 18px;
}

.modalNuevo .modal-body {
  padding: 5px 22px 5px 22px;
  overflow: auto;
}

.modalNuevo .modal-footer {
  border-top: 1px solid #eee;
  padding: 5px 16px;
}

.modalNuevo input,
.modalNuevo select {
  border-radius: 8px !important;
  font-size: 14px;
}

.modalNuevo label {
  font-size: 13px;
  font-weight: 500;
  color: #555;

  margin-bottom: 4px;
}

.modalNuevo .btn {
  border-radius: 8px;
}

@keyframes modalFade {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
