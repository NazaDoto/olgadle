<template>
    <!-- ═══ Layout principal ══════════════════════════════════════════════════ -->
    <div class="container py-5">
        <div class="w-fit-content mx-auto">
            <img src="/sqp.png" class="logo" alt="" />
        </div>
        <p class="lead text-center mt-2 mb-4 adivina-container">Pintá y charlá de chill</p>
        <p class="text-center ciclo-timer mb-3">
            Reinicio semanal del place en
            <span class="ciclo-timer">{{ tiempoRestanteFormateado }}</span>
        </p>

        <div v-if="cargando" class="loader-container">
            <div class="spinner"></div>
        </div>

        <div v-else class="place-layout">
            <!-- ── Canvas ──────────────────────────────────────────────────────── -->
            <div class="canvas-section">
                <!-- Toolbar -->
                <div class="toolbar mb-2">
                    <div class="color-palette">
                        <div v-for="c in paleta" :key="c" class="color-swatch"
                            :class="{ selected: colorSeleccionado === c }" :style="{ background: c }"
                            @click="colorSeleccionado = c" />
                    </div>
                    <label class="color-picker-rainbow" title="Color personalizado">
    <input type="color" v-model="colorPersonalizado" 
        @change="colorSeleccionado = colorPersonalizado" />
</label>
                    <div class="color-actual" :style="{ background: colorSeleccionado }" title="Color actual" />
                </div>

                <!-- Canvas wrapper responsivo -->
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


                <!-- Info zoom -->
                <p class="aclaracion mt-1">Scroll para hacer zoom · Click para poner tu pixel</p>
            </div>

            <!-- ── Chat ────────────────────────────────────────────────────────── -->
            <div class="chat-section">
                <div class="chat-header">
                    <span class="chat-title">Comunidad en vivo</span>
                </div>
                <div class="chat-tabs">
                    <button class="chat-tab-btn" :class="{ active: activeChatTab === 'twitch' }"
                        @click="activeChatTab = 'twitch'">
                        Twitch
                    </button>
                    <button class="chat-tab-btn" :class="{ active: activeChatTab === 'youtube' }"
                        @click="activeChatTab = 'youtube'">
                        YouTube
                    </button>
                </div>

                <div class="chat-embed-area">
                    <iframe class="chat-embed-frame" :class="{ hidden: activeChatTab !== 'twitch' }" :src="twitchChatUrl"
                        title="Chat de Twitch - olgaenvivo" allowfullscreen />

                    <iframe v-if="youtubeChatUrl" class="chat-embed-frame"
                        :class="{ hidden: activeChatTab !== 'youtube' }" :src="youtubeChatUrl"
                        title="Chat de YouTube - olgaenvivo_" allowfullscreen />

                    <div v-if="activeChatTab === 'youtube' && !youtubeChatUrl" class="chat-embed-fallback">
                        <p>
                            {{ youtubeStatusMessage || 'El chat de YouTube necesita el ID del vivo actual.' }}
                        </p>
                        <a class="chat-open-link" href="https://www.youtube.com/@olgaenvivo_/live" target="_blank"
                            rel="noopener noreferrer">
                            Abrir vivo en YouTube
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
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
            cargando: true,
            socket: null,

            // Canvas
            paleta: PALETA,
            colorSeleccionado: '#E50000',
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
            youtubeLiveVideoId: '',
            youtubeRefreshInterval: null,
            youtubeStatusMessage: '',
            tiempoRestanteCiclo: 0,
            cicloTickerInterval: null,
            cicloRefreshInterval: null,
            externalEmbedErrorHandler: null,
        }
    },

    methods: {
        // ── Canvas ────────────────────────────────────────────────────────────
        iniciarCanvas(flatPixels) {
            const canvas = this.$refs.canvas
            this.ctx = canvas.getContext('2d')
            const img = this.ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE)

            for (let i = 0; i < flatPixels.length; i++) {
                const hex = flatPixels[i] || '#FFFFFF'
                const [r, g, b] = this.hexToRgb(hex)
                img.data[i * 4] = r
                img.data[i * 4 + 1] = g
                img.data[i * 4 + 2] = b
                img.data[i * 4 + 3] = 255
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
            try {
                const { data } = await axios.get('/place/youtube-live-id')
                this.youtubeLiveVideoId = data?.videoId || ''
                this.youtubeStatusMessage = this.youtubeLiveVideoId
                    ? ''
                    : 'No se detectó un vivo activo en este momento.'
            } catch (_err) {
                this.youtubeLiveVideoId = ''
                this.youtubeStatusMessage = 'No se pudo consultar YouTube ahora.'
            }
        },

        async cargarTiempoRestanteCiclo() {
            try {
                console.log('fetch tiempo restante')
                const { data } = await axios.get('/place/reset-info')
                console.log(data)
                this.tiempoRestanteCiclo = Math.max(0, Number(data?.tiempoRestante || 0))
            } catch (_err) {
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
        conectarSocket() {
            this.socket = io("https://olgadle.nazadoto.com", {
    path: "/place-socket",
    transports: ["websocket"], // 🔥 importante
})

        this.socket.on('connect', async () => {
    console.log('🟢 conectado')
    const { data } = await axios.get('/place/canvas')
    this.cargando = false
    await this.$nextTick()
    this.iniciarCanvas(data.canvas)
    this.actualizarViewportMedidas()
    this.iniciarObserverViewport()
    this.centrarViewport()
})

    this.socket.on('disconnect', () => {
        console.log('🔴 desconectado')
    })

    this.socket.on('place:pixel', ({ x, y, color }) => {
        console.log('pasa para aqui')
        this.dibujarPixel(x, y, color)
    })


            this.socket.on('place:canvas-reset', async () => {
                try {
                    const { data } = await axios.get('/place/canvas')
                    this.iniciarCanvas(data.canvas)
                    this.centrarViewport()
                } catch (e) {
                    console.error('Error recargando canvas tras reset:', e)
                }
            })
        },
    },
    computed: {
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
            const total = Math.max(0, Math.floor(this.tiempoRestanteCiclo))
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

    async mounted() {
    this.instalarFiltroErroresEmbeds()
    this.cargando = true

    await this.cargarYoutubeLiveVideoId()
    await this.cargarTiempoRestanteCiclo()

    this.youtubeRefreshInterval = setInterval(() => {
        this.cargarYoutubeLiveVideoId()
    }, 60000)
    this.cicloTickerInterval = setInterval(() => {
        this.tiempoRestanteCiclo = Math.max(0, this.tiempoRestanteCiclo - 1)
    }, 1000)
    this.cicloRefreshInterval = setInterval(() => {
        this.cargarTiempoRestanteCiclo()
    }, 60000)

    this.conectarSocket() // el canvas se carga dentro del evento 'connect'
},

    unmounted() {
        if (this.socket) this.socket.disconnect()
        if (this.youtubeRefreshInterval) clearInterval(this.youtubeRefreshInterval)
        if (this.cicloTickerInterval) clearInterval(this.cicloTickerInterval)
        if (this.cicloRefreshInterval) clearInterval(this.cicloRefreshInterval)
        if (this.viewportResizeObserver) this.viewportResizeObserver.disconnect()
        if (this.externalEmbedErrorHandler) {
            window.removeEventListener('error', this.externalEmbedErrorHandler)
        }
    },
}
</script>

<style>
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
.auth-modal {
    width: 320px;
}

.auth-modal .form-control {
    width: 100%;
    box-sizing: border-box;
}

.link-auth {
    color: #9146ff;
    cursor: pointer;
    text-decoration: underline;
}

.w-100 {
    width: 100%;
}
</style>