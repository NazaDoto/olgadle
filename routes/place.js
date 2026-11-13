import { Router } from 'express'
import { gzipSync } from 'node:zlib'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import db, { transaction } from '../db.js'
import config from '../config.js'
import { verifySocketToken } from '../middleware/auth.js'

const router = Router()
const { CANVAS_SIZE,  JWT_SECRET } = config
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3'
const PLACE_RESET_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000  // 30 días
let youtubeChannelIdCache = config.YOUTUBE?.channelId || ''
let placeIo = null

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
    ) ENGINE=InnoDB
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
  // Agregar tabla de historial
  await db.query(`
    CREATE TABLE IF NOT EXISTS canvas_snapshots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        snapshot JSON NOT NULL,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`)

    await db.query(`
        CREATE TABLE IF NOT EXISTS canvas_cycle (
            id TINYINT PRIMARY KEY,
            next_reset_at BIGINT UNSIGNED NOT NULL
        ) ENGINE=InnoDB
    `)
    await db.query(`
        CREATE TABLE IF NOT EXISTS canvas_cycle_snapshots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            size INT NOT NULL,
            rgb_gzip MEDIUMBLOB NOT NULL,
            saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    `)
    const [[cycle]] = await db.query('SELECT id FROM canvas_cycle WHERE id = 1')
    if (!cycle) {
        const configuredStart = config.PLACE_CYCLE_STARTED_AT
        const [[{ lastSnapshot }]] = await db.query(
            'SELECT UNIX_TIMESTAMP(MAX(saved_at)) * 1000 AS lastSnapshot FROM canvas_snapshots'
        )
        const startedAt = configuredStart ? Date.parse(configuredStart) : Number(lastSnapshot || Date.now())
        if (!Number.isFinite(startedAt) || startedAt > Date.now()) {
            throw new Error('PLACE_CYCLE_STARTED_AT debe ser una fecha válida en el pasado')
        }
        await db.query('INSERT IGNORE INTO canvas_cycle VALUES (1, ?)', [startedAt + PLACE_RESET_INTERVAL_MS])
    }

  const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM canvas_pixels')
  const expectedCount = CANVAS_SIZE * CANVAS_SIZE

  if (count < expectedCount) {
      console.log(`🎨 Expandiendo canvas a ${CANVAS_SIZE}×${CANVAS_SIZE} (tenía ${count} píxeles)...`)
      const values = []
      for (let y = 0; y < CANVAS_SIZE; y++)
          for (let x = 0; x < CANVAS_SIZE; x++)
              values.push(`(${x}, ${y}, '#FFFFFF')`)

      const chunk = 5000
      for (let i = 0; i < values.length; i += chunk) {
          await db.query(
              `INSERT IGNORE INTO canvas_pixels (x, y, color) VALUES ${values.slice(i, i + chunk).join(',')}`
          )
      }
      console.log(`✅ Canvas expandido (${count} → ${expectedCount} píxeles)`)
  }
}

function flattenCanvas(pixels) {
    const flat = new Array(CANVAS_SIZE * CANVAS_SIZE).fill('#FFFFFF')
    for (const { x, y, color } of pixels) {
        if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
            flat[y * CANVAS_SIZE + x] = color
        }
    }
    return flat
}

async function withCanvasCycle(work) {
    const result = await transaction(async (connection) => {
        const [[cycle]] = await connection.query('SELECT next_reset_at FROM canvas_cycle WHERE id = 1 FOR UPDATE')
        let nextResetAt = Number(cycle.next_reset_at)
        const now = Date.now()
        const reset = now >= nextResetAt
        if (reset) {
            const [pixels] = await connection.query('SELECT x, y, color FROM canvas_pixels')
            const rgb = Buffer.alloc(CANVAS_SIZE * CANVAS_SIZE * 3, 255)
            for (const { x, y, color } of pixels) {
                if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
                    rgb.writeUIntBE(Number.parseInt(color.slice(1), 16), (y * CANVAS_SIZE + x) * 3, 3)
                }
            }
            await connection.execute('INSERT INTO canvas_cycle_snapshots (size, rgb_gzip) VALUES (?, ?)', [
                CANVAS_SIZE, gzipSync(rgb),
            ])
            await connection.query("UPDATE canvas_pixels SET color = '#FFFFFF', user_id = NULL")
            const elapsedCycles = Math.floor((now - nextResetAt) / PLACE_RESET_INTERVAL_MS) + 1
            nextResetAt += elapsedCycles * PLACE_RESET_INTERVAL_MS
            await connection.query('UPDATE canvas_cycle SET next_reset_at = ? WHERE id = 1', [nextResetAt])
        }
        return { nextResetAt, reset, value: await work?.(connection) }
    })
    if (result.reset) placeIo?.emit('place:canvas-reset')
    return result
}

async function checkCanvasCycle() {
    await withCanvasCycle()
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
    const token = jwt.sign({ id: result.insertId, username }, JWT_SECRET, { audience: 'place', expiresIn: '30d' })
    res.json({ token, username })
})

router.post('/place/login', async (req, res) => {
    const { username, password } = req.body
    const [[user]] = await db.query('SELECT * FROM place_users WHERE username = ?', [username])
    if (!user) return res.status(400).json({ error: 'Usuario o contraseña incorrectos' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(400).json({ error: 'Usuario o contraseña incorrectos' })

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { audience: 'place', expiresIn: '30d' })
    res.json({ token, username: user.username })
})

// ── Canvas GET ────────────────────────────────────────────────────────────
router.get('/place/canvas', async (_req, res) => {
    await checkCanvasCycle()
    const [pixels] = await db.query('SELECT x, y, color FROM canvas_pixels')
    res.json({ canvas: flattenCanvas(pixels), size: CANVAS_SIZE })
})

router.get('/place/reset-info', async (_req, res) => {
    const { nextResetAt } = await withCanvasCycle()
    res.json({
        tiempoRestante: Math.max(0, Math.ceil((nextResetAt - Date.now()) / 1000)),
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

    try {
        let videoId = null

        if (apiKey && !youtubeChannelIdCache) {
            const channelResp = await fetch(
                `${YT_API_BASE}/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${encodeURIComponent(apiKey)}`
            )
            if (channelResp.ok) {
                const channelData = await channelResp.json()
                youtubeChannelIdCache = channelData.items?.[0]?.id || ''
            }
        }

        if (apiKey && youtubeChannelIdCache) {
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
    const pollCycle = async () => {
        try {
            await checkCanvasCycle()
        } catch (error) {
            console.error('Error verificando el ciclo de SQP:', error.message)
        } finally {
            setTimeout(pollCycle, 1000).unref()
        }
    }
    void pollCycle()
    io.on('connection', (socket) => {
        console.log('🟢 cliente conectado', socket.id)
        socket.on('place:pixel', async (data) => {
            const { x, y, color } = data || {}
            if (!Number.isInteger(x) || !Number.isInteger(y) ||
                x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return
            if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) return
            try {
                await withCanvasCycle((connection) => connection.query(
                    'UPDATE canvas_pixels SET color=?, user_id=NULL WHERE x=? AND y=?',
                    [color, x, y]
                ))
                io.emit('place:pixel', { x, y, color })
            } catch (error) {
                console.error('Error guardando píxel:', error.message)
                socket.emit('place:error', 'No se pudo guardar el píxel')
            }
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