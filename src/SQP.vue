<template>
    <main class="container sqp-page py-4">
        <header class="game-head">
            <img src="/sqp.png" alt="" width="68" height="68" />
            <div><h1 class="game-title">Soñé que pintaba</h1><p>Se reinicia en <strong>{{ tiempoRestanteFormateado }}</strong></p></div>
        </header>

        <div class="place-layout" ref="placeLayout">
            <section class="canvas-section" aria-label="Lienzo">
                <div class="toolbar mb-2">
                    <div class="color-palette" role="group" aria-label="Paleta">
                        <button v-for="c in paleta" :key="c" type="button" class="color-swatch"
                            :class="{ selected: colorSeleccionado === c }" :style="{ background: c }"
                            :aria-label="c" :aria-pressed="colorSeleccionado === c"
                            @click="colorSeleccionado = c"></button>
                    </div>
                    <label class="color-picker-rainbow" title="Color personalizado">
                        <input type="color" v-model="colorPersonalizado" aria-label="Color personalizado"
                            @input="onColorPersonalizado" @change="addColorPersonalizado" />
                    </label>
                    <div class="color-actual" :style="{ background: colorSeleccionado }" title="Color actual" />
                    <button type="button" class="fullscreen-btn" @click="toggleFullscreen" aria-label="Pantalla completa" title="Pantalla completa">⛶</button>
                </div>

                <div class="canvas-stage">
                <div class="canvas-viewport" ref="canvasViewport" @wheel.prevent="handleCanvasWheel"
                    @mousedown="startPanDrag" @mousemove="panDragMove" @mouseup="stopPanDrag" @mouseleave="stopPanDrag"
                    :class="{ dragging: isDragging }">
                    <div class="canvas-wrapper" :style="canvasWrapperStyle">
                        <canvas ref="canvas" :width="CANVAS_SIZE" :height="CANVAS_SIZE" class="place-canvas"
                            @click="handleCanvasClick" @mousemove="handleCanvasHover"
                            @mouseleave="cursorInfo = null; hoverPixel = null" />
                        <div v-if="hoverPixel" class="pixel-hover-outline" :style="hoverOutlineStyle" />
                        <!-- Cursor info tooltip -->
                        <div v-if="cursorInfo" class="cursor-tooltip"
                            :style="{ left: cursorInfo.px + 'px', top: cursorInfo.py + 'px' }">
                            ({{ cursorInfo.x }}, {{ cursorInfo.y }})
                        </div>
                    </div>
                </div>


                <div v-if="cargando" class="place-overlay panel-load" role="status" aria-label="Cargando lienzo">
                    <div class="panel-spinner"></div>
                </div>
                <div v-else-if="errorLienzo" class="place-overlay">
                    <button class="btn-ok" @click="cargarLienzo">Reintentar</button>
                </div>
                </div>
                <p class="aclaracion mt-2">Zoom con la rueda · Pintá con clic o <kbd>F</kbd></p>
            </section>

            <aside class="chat-section" aria-label="Chat en vivo">
                <div class="chat-header"><h2 class="chat-title">Chat en vivo</h2></div>
                <div class="chat-tabs">
                    <button class="chat-tab-btn" :class="{ active: activeChatTab === 'twitch' }"
                        :aria-pressed="activeChatTab === 'twitch'" @click="activeChatTab = 'twitch'">
                        Twitch
                    </button>
                    <button class="chat-tab-btn" :class="{ active: activeChatTab === 'youtube' }"
                        :aria-pressed="activeChatTab === 'youtube'" @click="activeChatTab = 'youtube'">
                        YouTube
                    </button>
                </div>

                <div class="chat-embed-area">
                    <iframe v-show="activeChatTab === 'twitch'" class="chat-embed-frame" :src="twitchChatUrl"
                        @load="twitchListo = true" title="Chat de Twitch" />
                    <iframe v-if="youtubeChatUrl" v-show="activeChatTab === 'youtube'"
                        :key="youtubeChatUrl" class="chat-embed-frame" :src="youtubeChatUrl"
                        @load="youtubeListo = true" title="Chat de YouTube" />

                    <div v-if="cargandoChat" class="place-overlay panel-load" role="status" aria-label="Cargando chat">
                        <div class="panel-spinner"></div>
                    </div>
                    <div v-else-if="activeChatTab === 'youtube' && !youtubeChatUrl" class="chat-embed-fallback">
                        <p>{{ youtubeStatusMessage }}</p>
                        <a class="chat-open-link" href="https://www.youtube.com/@olgaenvivo_/live" target="_blank"
                            rel="noopener noreferrer">Abrir en YouTube ↗</a>
                    </div>
                </div>
            </aside>
        </div>
    </main>
</template>

<script>
import axios from 'axios'
import { io } from 'socket.io-client'

const CANVAS_SIZE = 1000
const BASE_RENDER_SIZE = 600

const PALETA = [
    '#FFFFFF', '#CCCCCC', '#808080', '#000000',
    '#FF66CC', '#FF0000', '#FF9900', '#8B4513',
    '#FFFF00', '#66FF00', '#00FF00', '#00FFFF',
    '#0099FF', '#0000FF', '#CC66FF', '#8000FF',
]

export default {
    name: 'SonePintaba',

    data() {
        return {
            CANVAS_SIZE,
            isFPressed: false,
            cargando: true,
            errorLienzo: false,
            lienzoRequest: null,
            pixelesPendientes: [],
            socketConectado: false,
            fullscreenHandler: null,
            socket: null,
        lastFPixel: null, // 🔥 agregar esto

            // Canvas
            paleta: PALETA,
            colorSeleccionado: '#FF0000',
            colorPersonalizado: '#E50000',
            ctx: null,
            zoom: 1,
            viewportWidth: 0,
            viewportHeight: 0,
            viewportResizeObserver: null,
            cursorInfo: null,
            hoverPixel: null,
            isDragging: false,
            dragStartX: 0,
            dragStartY: 0,
            dragStartScrollLeft: 0,
            dragStartScrollTop: 0,
            suppressNextClick: false,

            // Chat embeds
            activeChatTab: 'twitch',
            twitchListo: false,
            youtubeListo: false,
            buscandoYoutube: false,
            youtubeLiveVideoId: '',
            youtubeRefreshInterval: null,
            youtubeStatusMessage: '',
            proximoResetAt: null,
            relojCiclo: Date.now(),
            cicloTickerInterval: null,
            cicloRefreshInterval: null,
            externalEmbedErrorHandler: null,
        }
    },

    methods: {
        onColorPersonalizado() {
    this.colorSeleccionado = this.colorPersonalizado

    
},
addColorPersonalizado(){
    if (!this.paleta.includes(this.colorPersonalizado)) {
        this.paleta.push(this.colorPersonalizado)
    }
},
        handleKeyDown(e) {
        if (e.key.toLowerCase() !== 'f' || !this.puedePintar) return
        this.isFPressed = true

        if (this.hoverPixel) {
            const { x, y } = this.hoverPixel

            // Solo pintar si cambió de pixel
            if (this.lastFPixel?.x === x && this.lastFPixel?.y === y) return

            this.lastFPixel = { x, y }
            this.socket.emit('place:pixel', { x, y, color: this.colorSeleccionado })
            this.dibujarPixel(x, y, this.colorSeleccionado)
        }
    },

    handleKeyUp(e) {
        if (e.key.toLowerCase() === 'f') {
            this.isFPressed = false
            this.lastFPixel = null // resetear al soltar
        }
    },
        toggleFullscreen() {
    const el = this.$refs.placeLayout

    if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
            el.requestFullscreen()
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen()
        }
    }
},
        // ── Canvas ────────────────────────────────────────────────────────────
        iniciarCanvas(flatPixels) {
            const canvas = this.$refs.canvas
            this.ctx = canvas.getContext('2d')
            const img = this.ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE)

            const pixels = new Uint32Array(img.data.buffer)
            pixels.fill(0xffffffff)
            for (let i = 0; i < flatPixels.length; i++) {
                const hex = flatPixels[i]
                if (hex === '#FFFFFF') continue
                const rgb = Number.parseInt(hex.slice(1), 16)
                const offset = i * 4
                img.data[offset] = rgb >> 16
                img.data[offset + 1] = (rgb >> 8) & 255
                img.data[offset + 2] = rgb & 255
            }
            this.ctx.putImageData(img, 0, 0)
        },

        dibujarPixel(x, y, color) {
            if (!this.ctx) return
            const [r, g, b] = this.hexToRgb(color)
            const img = this.ctx.createImageData(1, 1)
            img.data[0] = r; img.data[1] = g; img.data[2] = b; img.data[3] = 255
            this.ctx.putImageData(img, x, y)
        },

        handleCanvasClick(e) {
            if (!this.puedePintar) return
            if (this.suppressNextClick) {
                this.suppressNextClick = false
                return
            }
            const { x, y } = this.canvasCoords(e)
            if (x === null) return

            this.socket.emit('place:pixel', {
                x, y,
                color: this.colorSeleccionado,
            })

            // Optimistic update
            this.dibujarPixel(x, y, this.colorSeleccionado)
        },

         handleCanvasHover(e) {
        const rect = this.$refs.canvas.getBoundingClientRect()
        const { x, y } = this.canvasCoords(e)
        if (x === null) {
            this.cursorInfo = null
            this.hoverPixel = null
            return
        }
        this.cursorInfo = {
            x, y,
            px: e.clientX - rect.left + 12,
            py: e.clientY - rect.top + 12,
        }
        this.hoverPixel = { x, y }

        // 🔥 Si F está apretada y nos movimos a un nuevo pixel, pintar
        if (this.puedePintar && this.isFPressed && (this.lastFPixel?.x !== x || this.lastFPixel?.y !== y)) {
            this.lastFPixel = { x, y }
            this.socket.emit('place:pixel', { x, y, color: this.colorSeleccionado })
            this.dibujarPixel(x, y, this.colorSeleccionado)
        }
    },

        handleCanvasWheel(e) {
            const viewport = this.$refs.canvasViewport
            if (!viewport) return

            const oldZoom = this.zoom
            const step = e.deltaY < 0 ? 0.2 : -0.2
            const newZoom = Math.min(8, Math.max(1, +(this.zoom + step).toFixed(2)))
            if (newZoom === oldZoom) return

            const rect = viewport.getBoundingClientRect()
            const relativeX = e.clientX - rect.left
            const relativeY = e.clientY - rect.top
            const worldX = viewport.scrollLeft + relativeX
            const worldY = viewport.scrollTop + relativeY
            const scaleFactor = newZoom / oldZoom

            this.zoom = newZoom
            this.$nextTick(() => {
                viewport.scrollLeft = worldX * scaleFactor - relativeX
                viewport.scrollTop = worldY * scaleFactor - relativeY
            })
        },

        startPanDrag(e) {
                if (this.isFPressed) return // 🔥 clave

            if (e.button !== 0) return
            const viewport = this.$refs.canvasViewport
            if (!viewport) return
            this.isDragging = true
            this.dragStartX = e.clientX
            this.dragStartY = e.clientY
            this.dragStartScrollLeft = viewport.scrollLeft
            this.dragStartScrollTop = viewport.scrollTop
            this.suppressNextClick = false
        },

        panDragMove(e) {
            if (!this.isDragging) return
            const viewport = this.$refs.canvasViewport
            if (!viewport) return

            const deltaX = e.clientX - this.dragStartX
            const deltaY = e.clientY - this.dragStartY
            viewport.scrollLeft = this.dragStartScrollLeft - deltaX
            viewport.scrollTop = this.dragStartScrollTop - deltaY

            if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 8) {
                this.suppressNextClick = true
            }
        },

        stopPanDrag() {
            this.isDragging = false
        },

        centrarViewport() {
            const viewport = this.$refs.canvasViewport
            if (!viewport) return
            viewport.scrollLeft = Math.max(0, (this.renderSize - viewport.clientWidth) / 2)
            viewport.scrollTop = Math.max(0, (this.renderSize - viewport.clientHeight) / 2)
        },

        actualizarViewportMedidas() {
            const viewport = this.$refs.canvasViewport
            if (!viewport) return
            this.viewportWidth = viewport.clientWidth
            this.viewportHeight = viewport.clientHeight
        },

        iniciarObserverViewport() {
            const viewport = this.$refs.canvasViewport
            if (!viewport || typeof ResizeObserver === 'undefined') return
            this.viewportResizeObserver = new ResizeObserver(() => {
                this.actualizarViewportMedidas()
            })
            this.viewportResizeObserver.observe(viewport)
        },

        async cargarYoutubeLiveVideoId() {
            if (this.buscandoYoutube) return
            this.buscandoYoutube = true
            try {
                const { data } = await axios.get('/place/youtube-live-id', { timeout: 8000 })
                const videoId = data?.videoId || ''
                if (videoId !== this.youtubeLiveVideoId) this.youtubeListo = false
                this.youtubeLiveVideoId = videoId
                this.youtubeStatusMessage = 'Sin vivo en YouTube.'
            } catch {
                this.youtubeStatusMessage = 'No se pudo cargar YouTube.'
            } finally {
                this.buscandoYoutube = false
            }
        },

        async cargarTiempoRestanteCiclo() {
            try {
                const { data } = await axios.get('/place/reset-info')
                this.proximoResetAt = data.proximoResetAt
                this.relojCiclo = Date.now()
            } catch {
                // Si falla, dejamos que el contador local siga.
            }
        },

        instalarFiltroErroresEmbeds() {
            this.externalEmbedErrorHandler = (event) => {
                const msg = String(event?.message || '')
                if (msg.includes('web_emulated_idle_callback_delay')) {
                    event.preventDefault()
                }
            }
            window.addEventListener('error', this.externalEmbedErrorHandler)
        },

        canvasCoords(e) {
            const canvas = this.$refs.canvas
            const rect = canvas.getBoundingClientRect()
            const scaleX = CANVAS_SIZE / rect.width
            const scaleY = CANVAS_SIZE / rect.height
            const x = Math.floor((e.clientX - rect.left) * scaleX)
            const y = Math.floor((e.clientY - rect.top) * scaleY)
            if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return { x: null, y: null }
            return { x, y }
        },

        hexToRgb(hex) {
            const n = parseInt(hex.slice(1), 16)
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
        },


        // ── Socket ────────────────────────────────────────────────────────────
        async cargarLienzo() {
            this.lienzoRequest?.abort()
            const request = new AbortController()
            this.lienzoRequest = request
            this.cargando = true
            this.errorLienzo = false
            this.pixelesPendientes = []
            try {
                const { data } = await axios.get('/place/canvas', { signal: request.signal, timeout: 20000 })
                if (request.signal.aborted) return
                this.iniciarCanvas(data.canvas)
                for (const { x, y, color } of this.pixelesPendientes) this.dibujarPixel(x, y, color)
            } catch {
                if (!request.signal.aborted) this.errorLienzo = true
            } finally {
                if (!request.signal.aborted) {
                    this.cargando = false
                    this.pixelesPendientes = []
                    this.lienzoRequest = null
                }
            }
        },

        conectarSocket() {
            this.socket = io({ path: '/place-socket', transports: ['websocket'] })
            this.socket.on('connect', () => {
                this.socketConectado = true
                this.cargarLienzo()
            })
            this.socket.on('disconnect', () => {
                this.socketConectado = false
                this.isFPressed = false
                this.lastFPixel = null
            })
            this.socket.on('place:pixel', (pixel) => {
                if (this.cargando) this.pixelesPendientes.push(pixel)
                else this.dibujarPixel(pixel.x, pixel.y, pixel.color)
            })
            this.socket.on('place:canvas-reset', () => {
                this.cargarTiempoRestanteCiclo()
                this.cargarLienzo()
            })
        },
    },
    watch: {
        activeChatTab(tab) {
            if (tab === 'youtube' && !this.youtubeLiveVideoId) this.cargarYoutubeLiveVideoId()
        },
    },
    computed: {
        puedePintar() {
            return this.socketConectado && !this.cargando && !this.errorLienzo
        },
        cargandoChat() {
            if (this.activeChatTab === 'twitch') return !this.twitchListo
            return this.youtubeChatUrl ? !this.youtubeListo : this.buscandoYoutube
        },
        renderSize() {
            return this.renderBaseSize * this.zoom
        },
        renderBaseSize() {
            return Math.max(this.viewportWidth || 0, this.viewportHeight || 0, BASE_RENDER_SIZE)
        },
        canvasWrapperStyle() {
            const size = `${this.renderSize}px`
            return { width: size, height: size }
        },
        hoverOutlineStyle() {
            if (!this.hoverPixel) return {}
            const pixelSize = this.renderSize / CANVAS_SIZE
            return {
                width: `${pixelSize}px`,
                height: `${pixelSize}px`,
                left: `${this.hoverPixel.x * pixelSize}px`,
                top: `${this.hoverPixel.y * pixelSize}px`,
            }
        },
        currentHost() {
            return window.location.hostname || 'localhost'
        },
        twitchChatUrl() {
            const parent = encodeURIComponent(this.currentHost)
            return `https://www.twitch.tv/embed/olgaenvivo/chat?parent=${parent}&darkpopout`
        },
        youtubeChatUrl() {
            if (!this.youtubeLiveVideoId) return ''
            const domain = encodeURIComponent(this.currentHost)
            return `https://www.youtube.com/live_chat?v=${this.youtubeLiveVideoId}&embed_domain=${domain}`
        },
        tiempoRestanteFormateado() {
            if (!this.proximoResetAt) return '—'
            const total = Math.max(0, Math.ceil((this.proximoResetAt - this.relojCiclo) / 1000))
            if (total >= 86400) {
                const dias = Math.ceil(total / 86400)
                return dias === 1 ? '1 día' : `${dias} días`
            }
            const h = Math.floor(total / 3600)
            const m = Math.floor((total % 3600) / 60)
            const s = total % 60
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        },
    },

    mounted() {
        this.instalarFiltroErroresEmbeds()
        this.actualizarViewportMedidas()
        this.iniciarObserverViewport()
        this.centrarViewport()
        this.cargarTiempoRestanteCiclo()
        this.cargarLienzo()
        this.conectarSocket()
        this.youtubeRefreshInterval = setInterval(() => {
            if (this.activeChatTab === 'youtube') this.cargarYoutubeLiveVideoId()
        }, 60000)
        this.cicloTickerInterval = setInterval(() => {
            this.relojCiclo = Date.now()
        }, 1000)
        this.cicloRefreshInterval = setInterval(() => this.cargarTiempoRestanteCiclo(), 60000)
        window.addEventListener('keydown', this.handleKeyDown)
        window.addEventListener('keyup', this.handleKeyUp)
        this.fullscreenHandler = () => {
            this.actualizarViewportMedidas()
            this.centrarViewport()
        }
        document.addEventListener('fullscreenchange', this.fullscreenHandler)
    },

    unmounted() {
        this.lienzoRequest?.abort()
        document.removeEventListener('fullscreenchange', this.fullscreenHandler)
        if (this.socket) this.socket.disconnect()
        if (this.youtubeRefreshInterval) clearInterval(this.youtubeRefreshInterval)
        if (this.cicloTickerInterval) clearInterval(this.cicloTickerInterval)
        if (this.cicloRefreshInterval) clearInterval(this.cicloRefreshInterval)
        if (this.viewportResizeObserver) this.viewportResizeObserver.disconnect()
        if (this.externalEmbedErrorHandler) {
            window.removeEventListener('error', this.externalEmbedErrorHandler)
        }
        window.removeEventListener('keydown', this.handleKeyDown)
        window.removeEventListener('keyup', this.handleKeyUp)
    },
}
</script>

<style scoped>
.fullscreen-btn {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: #2a2a2e;
    color: #fff;
    border: 2px solid rgba(255,255,255,0.2);
    cursor: pointer;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.15s ease;
}

.fullscreen-btn:hover {
    background: #3a3a3f;
    border-color: #fff;
}
.color-picker-rainbow {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: conic-gradient(red, yellow, lime, cyan, blue, magenta, red);
    cursor: pointer;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255,255,255,0.3);
}

.color-picker-rainbow input[type="color"] {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
}
/* ── Layout ──────────────────────────────────────────────────────────────── */
.place-layout {
    --place-panel-height: 700px;
    display: flex;
    gap: 0;
    align-items: stretch;
    max-width: calc(100vw - 32px); /* ancho casi completo con margen */
    margin: 0 auto;
    background: #18181b;
    border: 1px solid #2d2d30;
    border-radius: 10px;
    overflow: hidden;
}
.place-layout:fullscreen {
        --place-panel-height: auto;
    width: 100vw;
    height: 100vh;
    max-width: none;
    border-radius: 0;
}
.place-layout:-webkit-full-screen {
    width: 100vw;
    height: 100vh;
}
.canvas-section {
    flex: 1 1 0;
    min-width: 0;
    height: var(--place-panel-height);
    box-sizing: border-box;
    padding: 10px;
    border-right: 1px solid #2d2d30;
    display: flex;
    flex-direction: column;
}

.chat-section {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: var(--place-panel-height);
    box-sizing: border-box;
}

@media (max-width: 768px) {
    .place-layout {
        --place-panel-height: 420px;
        flex-direction: column;
    }

    .canvas-section {
        padding: 8px;
        border-right: none;
        border-bottom: 1px solid #2d2d30;
    }

    .chat-section {
        width: 100%;
    }
}

/* ── Canvas ──────────────────────────────────────────────────────────────── */
.canvas-wrapper {
    position: relative;
    width: 600px;
    height: 600px;
    background: #fff;
    border: 1px solid #444;
    cursor: crosshair;
}

.place-canvas {
    display: block;
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
}

.canvas-viewport {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: #0e0e10;
    border-radius: 6px;
    border: 1px solid #3a3a3d;
    cursor: grab;
    scrollbar-width: thin;
    scrollbar-color: #56565a #1f1f23;
}
.canvas-viewport.dragging {
    cursor: grabbing;
}

.pixel-hover-outline {
    position: absolute;
    border: 1px solid #ffffff;
    outline: 1px solid rgba(0, 0, 0, 0.8);
    box-sizing: border-box;
    pointer-events: none;
    z-index: 9;
}

.cursor-tooltip {
    position: absolute;
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10;
}

/* ── Toolbar ─────────────────────────────────────────────────────────────── */
.toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    background: #1f1f23;
    padding: 8px 10px;
    border-radius: 8px;
}

.color-palette {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    flex: 1;
}

.color-swatch {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.1s, border-color 0.1s;
}

.color-swatch:hover {
    transform: scale(1.2);
}

.color-swatch.selected {
    border-color: #fff;
    transform: scale(1.2);
}

.color-picker {
    width: 36px;
    height: 36px;
    padding: 2px;
    border: none;
    border-radius: 4px;
    background: none;
    cursor: pointer;
}

.color-actual {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    border: 2px solid #fff;
    flex-shrink: 0;
}

.canvas-section .aclaracion {
    flex-shrink: 0;
    margin-bottom: 0;
}

.ciclo-timer {
    color: #d8d8df;
    font-size: 0.95rem;
    letter-spacing: 0.01em;
}

.ciclo-time {
    color: #fff;
    font-weight: 700;
    background: rgba(0, 0, 0, 0.28);
    padding: 2px 8px;
    border-radius: 6px;
}

/* ── Chat ────────────────────────────────────────────────────────────────── */
.chat-header {
    display: flex;
    align-items: center;
    padding: 12px 14px;
    background: linear-gradient(180deg, #121217 0%, #0e0e12 100%);
    border-bottom: 1px solid #303038;
    box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.03);
}

.chat-title {
    font-size: 12px;
    font-weight: 700;
    color: #d7d7dc;
    text-transform: uppercase;
    letter-spacing: 0.09em;
}

.chat-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 8px;
    border-bottom: 1px solid #2d2d38;
    background: #111119;
}

.chat-tab-btn {
    border: 1px solid #2d2d38;
    background: #181824;
    color: #b6b6c2;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: all 0.16s ease;
    cursor: pointer;
}

.chat-tab-btn:hover {
    border-color: #47475b;
    color: #ececf1;
}

.chat-tab-btn.active {
    border-color: #7b52ca;
    background: linear-gradient(180deg, #2a1f43 0%, #201736 100%);
    color: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(151, 105, 237, 0.28);
}

.chat-embed-area {
    flex: 1;
    min-height: 0;
    position: relative;
    background: #0e0e14;
}

.chat-embed-frame {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
    background: #0e0e14;
}

.chat-embed-frame.hidden {
    visibility: hidden;
    pointer-events: none;
}

.chat-embed-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
    text-align: center;
    padding: 20px;
    color: #d7d7e1;
}

.chat-open-link {
    background: linear-gradient(180deg, #9d64ff 0%, #7346be 100%);
    color: #fff;
    text-decoration: none;
    font-weight: 700;
    font-size: 13px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.chat-open-link:hover {
    filter: brightness(1.08);
}

/* ── Auth modal ──────────────────────────────────────────────────────────── */
</style>

