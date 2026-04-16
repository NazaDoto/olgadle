import { Router } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db from '../db.js'
import config from '../config.js'
import { verifySocketToken } from '../middleware/auth.js'

const router = Router()
const { CANVAS_SIZE,  JWT_SECRET } = config
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'
const PLACE_RESET_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
let youtubeChannelIdCache = config.YOUTUBE?.channelId || ''
let placeIo = null
let lastPlaceResetAt = Date.now()
async function extraerVideoIdDesdePaginaLive(handle) {
    const livePageResp = await fetch(`https://www.youtube.com/@${handle}/live`)
    if (!livePageResp.ok) return null
    const html = await livePageResp.text()

    const patterns = [
        /"videoId":"([a-zA-Z0-9_-]{6,})"/,
        /watch\?v=([a-zA-Z0-9_-]{6,})/,
        /\/live\/([a-zA-Z0-9_-]{6,})/,
    ]
    for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match?.[1]) return match[1]
    }
    return null
}

// ── Inicializar canvas en MySQL ───────────────────────────────────────────
export async function initCanvas() {
    await db.query(`
    CREATE TABLE IF NOT EXISTS canvas_pixels (
      x INT NOT NULL,
      y INT NOT NULL,
      color CHAR(7) NOT NULL DEFAULT '#FFFFFF',
      user_id INT DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (x, y)
    )
  `)
    await db.query(`
    CREATE TABLE IF NOT EXISTS place_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
    await db.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      username VARCHAR(20) NOT NULL,
      message VARCHAR(200) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

    const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM canvas_pixels')
    if (count === 0) {
        console.log('🎨 Inicializando canvas 150×150...')
        const values = []
        for (let y = 0; y < CANVAS_SIZE; y++)
            for (let x = 0; x < CANVAS_SIZE; x++)
                values.push(`(${x}, ${y}, '#FFFFFF')`)

        // Insertar en bloques de 5000 para no saturar MySQL
        const chunk = 5000
        for (let i = 0; i < values.length; i += chunk) {
            await db.query(
                `INSERT IGNORE INTO canvas_pixels (x, y, color) VALUES ${values.slice(i, i + chunk).join(',')}`
            )
        }
        console.log('✅ Canvas inicializado')
    }
}

export async function resetCanvasForNewCycle() {
    await db.query(
        "UPDATE canvas_pixels SET color = '#FFFFFF', user_id = NULL"
    )
    if (placeIo) placeIo.emit('place:canvas-reset')
    console.log('🧼 Canvas de place reseteado para nuevo ciclo')
}

async function ensureWeeklyCanvasReset() {
    const now = Date.now()

    if (now - lastPlaceResetAt < PLACE_RESET_INTERVAL_MS) return

    await resetCanvasForNewCycle()

    // 🔥 CLAVE: reiniciar desde AHORA
    lastPlaceResetAt = now
}

function tiempoRestanteResetPlaceSegundos() {
    const nextResetAt = lastPlaceResetAt + PLACE_RESET_INTERVAL_MS
    return Math.max(0, Math.floor((nextResetAt - Date.now()) / 1000))
}

// ── Auth routes ───────────────────────────────────────────────────────────
router.post('/place/register', async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' })
    if (username.length < 3 || username.length > 20)
        return res.status(400).json({ error: 'Usuario: 3-20 caracteres' })
    if (password.length < 6)
        return res.status(400).json({ error: 'Contraseña mínimo 6 caracteres' })

    const [[existing]] = await db.query('SELECT id FROM place_users WHERE username = ?', [username])
    if (existing) return res.status(400).json({ error: 'Usuario ya existe' })

    const hash = await bcrypt.hash(password, 10)
    const [result] = await db.query(
        'INSERT INTO place_users (username, password_hash) VALUES (?, ?)',
        [username, hash]
    )
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, username })
})

router.post('/place/login', async (req, res) => {
    const { username, password } = req.body
    const [[user]] = await db.query('SELECT * FROM place_users WHERE username = ?', [username])
    if (!user) return res.status(400).json({ error: 'Usuario o contraseña incorrectos' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(400).json({ error: 'Usuario o contraseña incorrectos' })

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' })
    res.json({ token, username: user.username })
})

// ── Canvas GET ────────────────────────────────────────────────────────────
router.get('/place/canvas', async (req, res) => {
    await ensureWeeklyCanvasReset()
    const [pixels] = await db.query(
        'SELECT x, y, color FROM canvas_pixels ORDER BY y, x'
    )
    const flat = new Array(CANVAS_SIZE * CANVAS_SIZE).fill('#FFFFFF')
    pixels.forEach(p => { flat[p.y * CANVAS_SIZE + p.x] = p.color })
    res.json({ canvas: flat, size: CANVAS_SIZE })
})

router.get('/place/reset-info', async (_req, res) => {
    console.log('reset-info')
    await ensureWeeklyCanvasReset()
    console.log('ensureWeeklyCanvasReset')
    const nextResetAt = lastPlaceResetAt + PLACE_RESET_INTERVAL_MS
    console.log(tiempoRestanteResetPlaceSegundos())
    res.json({
        tiempoRestante: tiempoRestanteResetPlaceSegundos(),
        proximoResetAt: nextResetAt,
        intervaloMs: PLACE_RESET_INTERVAL_MS,
    })
})

// ── Chat GET ──────────────────────────────────────────────────────────────
router.get('/place/chat', async (req, res) => {
    const [messages] = await db.query(
        'SELECT username, message, created_at FROM chat_messages ORDER BY created_at DESC LIMIT 50'
    )
    res.json({ messages: messages.reverse() })
})

router.get('/place/youtube-live-id', async (_req, res) => {
    const apiKey = config.YOUTUBE?.apiKey
    const handle = config.YOUTUBE?.handle || 'olgaenvivo_'

    if (!apiKey) {
        return res.status(503).json({ error: 'YouTube API key no configurada' })
    }

    try {
        let videoId = null

        if (!youtubeChannelIdCache) {
            const channelResp = await fetch(
                `${YT_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`
            )
            if (channelResp.ok) {
                const channelData = await channelResp.json()
                youtubeChannelIdCache = channelData.items?.[0]?.id || ''
            }
        }

        if (youtubeChannelIdCache) {
            const searchResp = await fetch(
                `${YT_API_BASE}/search?part=id&channelId=${encodeURIComponent(youtubeChannelIdCache)}&eventType=live&type=video&maxResults=1&key=${encodeURIComponent(apiKey)}`
            )
            if (searchResp.ok) {
                const searchData = await searchResp.json()
                videoId = searchData.items?.[0]?.id?.videoId || null
            }
        }

        // Fallback cuando API falla/restricción/cuota: intentar parsear página /live
        if (!videoId) {
            videoId = await extraerVideoIdDesdePaginaLive(handle)
        }

        return res.json({ videoId, live: Boolean(videoId) })
    } catch (error) {
        console.error('youtube live lookup error:', error.message)
        return res.status(502).json({ error: 'No se pudo consultar YouTube ahora', videoId: null, live: false })
    }
})

// ── Socket.io setup (se llama desde app.js pasando el server HTTPS) ───────

export function setupPlaceSockets(io) {
    placeIo = io
    io.on('connection', (socket) => {
        console.log('🟢 cliente conectado', socket.id)
        socket.on('place:pixel', async (data) => {
            console.log('📩 pixel recibido', data)
            await ensureWeeklyCanvasReset()
            const now = Date.now()
            const { x, y, color } = data
            if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return
            if (!/^#[0-9A-Fa-f]{6}$/.test(color)) return
            console.log('dibujando pixel', x, y, color)
            try {
                await db.query(
                    'UPDATE canvas_pixels SET color=?, user_id=? WHERE x=? AND y=?',
                    [color, null, x, y]
                )
            } catch (err) {
                console.error(err)
            }
            console.log('pixel dibujado', x, y, color)
            io.emit('place:pixel', { x, y, color })
        })

        socket.on('chat:message', async (data) => {
            const user = verifySocketToken(data.token)
            if (!user) { socket.emit('place:error', 'No autenticado'); return }

            const message = data.message?.trim()
            if (!message || message.length > 200) return

            await db.query(
                'INSERT INTO chat_messages (user_id, username, message) VALUES (?, ?, ?)',
                [user.id, user.username, message]
            )
            io.emit('chat:message', { username: user.username, message, created_at: new Date().toISOString() })
        })
    })
}

export default router