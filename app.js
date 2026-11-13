import express from 'express'
import cors from 'cors'
import http from 'http'
import { Server } from 'socket.io'

import config from './config.js'
import adminRoutes from './routes/admin.js'
import integrantesRoutes from './routes/integrantes.js'
import playlistRoutes from './routes/playlist.js'
import juegoRoutes, { initGame } from './routes/juego.js'
import placeRoutes, { initCanvas, setupPlaceSockets } from './routes/place.js'
import { adminAuth } from './middleware/auth.js'
import db from './db.js'

const app = express()

app.use('/uploads', express.static('uploads'))
app.use(express.json())
app.use(cors())

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/integrantes', integrantesRoutes)
app.use('/api', playlistRoutes)
app.use('/api', juegoRoutes)      // tiene rutas como /integrante y /random-tracks
app.use('/api', adminRoutes)      // tiene /login, /upload
app.use('/api', placeRoutes)      // tiene /place/canvas, etc.

// Programas
app.get('/api/programas', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM programas')
    res.json(rows)
})
app.post('/api/programas', adminAuth, async (req, res) => {
    const [result] = await db.query('INSERT INTO programas(nombre) VALUES (?)', [req.body.nombre])
    res.json({ id: result.insertId })
})

// ── Inicialización ─────────────────────────────────────────────────────────
await initCanvas()
await initGame()

// ── Servidor + Socket.io ───────────────────────────────────────────────────
const server = http.createServer(app)
server.listen(config.PORT, () => {
    console.log(`🖥️ HTTP en http://localhost:${config.PORT}`)
})
const io = new Server(server, {
    path: '/place-socket',
    cors: { origin: "*" },
})
setupPlaceSockets(io)