import { Router } from 'express'
import fetch from 'node-fetch'
import config from '../config.js'
import { fetchPlaylist } from './playlist.js'

const router = Router()

// ── Estado compartido del juego (se resetea cada 12hs) ───────────────────
const state = {
    integranteIndex: null,
    integranteQEIndex: null,
    ultimaAsignacion: null,
    intentosTotales: 0,
    aciertos: 0,
    intentosTotalesEN: 0,
    aciertosEN: 0,
    intentosTotalesQE: 0,
    aciertosQE: 0,
    cancionesActuales: [],
}

async function asignarNuevaCancion() {
    const data = await fetchPlaylist(true)
    if (!data?.tracks?.data?.length) {
        console.error('❌ Playlist vacía al asignar canciones')
        return
    }
    const canciones = []
    const usados = new Set()
    let intentos = 0
    while (canciones.length < 3 && intentos < 50) {
        const idx = Math.floor(Math.random() * data.tracks.data.length)
        const track = data.tracks.data[idx]
        if (track.preview && !usados.has(track.id)) {
            canciones.push({ id: track.id })
            usados.add(track.id)
        }
        intentos++
    }
    state.cancionesActuales = canciones
    console.log('🎵 Canciones asignadas:', canciones.map(c => c.id).join(', '))
}

export async function verificarTiming() {
    const { INTERVALO_MS, TOTAL_INTEGRANTES } = config
    if (!state.ultimaAsignacion || Date.now() - state.ultimaAsignacion >= INTERVALO_MS) {
        await asignarNuevaCancion()
        Object.assign(state, {
            intentosTotales: 0,
            aciertos: 0,
            intentosTotalesEN: 0,
            aciertosEN: 0,
            intentosTotalesQE: 0,
            aciertosQE: 0,
            integranteIndex: Math.floor(Math.random() * TOTAL_INTEGRANTES),
            integranteQEIndex: Math.floor(Math.random() * TOTAL_INTEGRANTES),
            ultimaAsignacion: Date.now(),
        })
        console.log('🔁 Nuevo ciclo de juego iniciado')
    }
}

function tiempoRestanteSegundos() {
    return Math.floor((config.INTERVALO_MS - (Date.now() - state.ultimaAsignacion)) / 1000)
}

// ── Olgadle ───────────────────────────────────────────────────────────────
router.get('/integrante', async (req, res) => {
    await verificarTiming()
    res.json({
        integrante: state.integranteIndex,
        tiempoRestante: tiempoRestanteSegundos(),
        intentosTotales: state.intentosTotales,
        aciertos: state.aciertos,
    })
})

router.post('/intento', (req, res) => {
    state.intentosTotales++
    if (req.body.intento == 1) state.aciertos++
    res.json({ intentosTotales: state.intentosTotales, aciertos: state.aciertos })
})

// ── Enkidle ───────────────────────────────────────────────────────────────
router.get('/api/random-tracks', async (req, res) => {
    try {
        await verificarTiming()
        if (!state.cancionesActuales.length) {
            return res.status(404).json({ error: 'Sin canciones asignadas' })
        }
        const tracks = []
        for (const song of state.cancionesActuales) {
            const r = await fetch(`https://api.deezer.com/track/${song.id}`)
            if (!r.ok) continue
            const t = await r.json()
            if (t?.preview) {
                tracks.push({
                    id: t.id,
                    title: t.title,
                    artist: t.artist.name,
                    album: t.album.title,
                    preview: t.preview,
                    cover: t.album.cover_medium,
                })
            }
        }
        if (!tracks.length) return res.status(404).json({ error: 'Sin preview válido' })
        res.json({
            tracks,
            tiempoRestante: tiempoRestanteSegundos(),
            intentosTotalesEN: state.intentosTotalesEN,
            aciertosEN: state.aciertosEN,
        })
    } catch (err) {
        console.error('❌ /api/random-tracks:', err)
        res.status(500).json({ error: 'Error al obtener tracks' })
    }
})

router.post('/intentoEN', (req, res) => {
    state.intentosTotalesEN++
    if (req.body.intento == 1) state.aciertosEN++
    res.json({ intentosTotalesEN: state.intentosTotalesEN, aciertosEN: state.aciertosEN })
})

// ── Quiénes Éramos ────────────────────────────────────────────────────────
router.get('/integranteQE', async (req, res) => {
    await verificarTiming()
    res.json({
        integrante: state.integranteQEIndex,
        tiempoRestante: tiempoRestanteSegundos(),
        intentosTotalesQE: state.intentosTotalesQE,
        aciertosQE: state.aciertosQE,
    })
})

router.post('/intentoQE', (req, res) => {
    state.intentosTotalesQE++
    if (req.body.intento == 1) state.aciertosQE++
    res.json({ intentosTotalesQE: state.intentosTotalesQE, aciertosQE: state.aciertosQE })
})

// ── Versión ───────────────────────────────────────────────────────────────
router.get('/api/version', (req, res) => {
    res.json({ version: 0.6 })
})

export default router