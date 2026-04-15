import express from 'express'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import http from 'http'
import { Server } from 'socket.io'

import config from './config.js'
import adminRoutes from './routes/admin.js'
import integrantesRoutes from './routes/integrantes.js'
import playlistRoutes from './routes/playlist.js'
import juegoRoutes from './routes/juego.js'
import placeRoutes, { initCanvas, setupPlaceSockets } from './routes/place.js'
import { verificarTiming } from './routes/juego.js'

const app = express()

app.use('/uploads', express.static('uploads'))
app.use(express.json())
app.use(cors())

// ── Rutas ──────────────────────────────────────────────────────────────────
app.use('/', adminRoutes)
app.use('/integrantes', integrantesRoutes)
app.use('/', playlistRoutes)
app.use('/', juegoRoutes)
app.use('/', placeRoutes)

// Programas (simple, lo dejamos en app.js por ser pequeño)
import db from './db.js'
app.get('/programas', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM programas')
    res.json(rows)
})
app.post('/programas', async (req, res) => {
    const [result] = await db.query('INSERT INTO programas(nombre) VALUES (?)', [req.body.nombre])
    res.json({ id: result.insertId })
})

// ── Inicialización ─────────────────────────────────────────────────────────
await initCanvas()
await verificarTiming()

// ── Servidor + Socket.io ───────────────────────────────────────────────────
let server

if (config.ENV === 'prod') {
    const httpsOptions = {
        key: fs.readFileSync(config.SSL.key),
        cert: fs.readFileSync(config.SSL.cert),
    }
    server = https.createServer(httpsOptions, app)
    server.listen(config.PORT, () => {
        console.log(`🌐 HTTPS en https://olgadle.nazadoto.com:${config.PORT}`)
    })
} else {
    server = http.createServer(app)
    server.listen(config.PORT, () => {
        console.log(`🖥️ HTTP en http://localhost:${config.PORT}`)
    })
}

// Socket.io comparte el mismo server HTTPS/HTTP (mismo puerto, sin :3502)
const io = new Server(server, {
    cors: { origin: '*' },
    path: '/place-socket', // path custom para no pisar otros ws
})
setupPlaceSockets(io)