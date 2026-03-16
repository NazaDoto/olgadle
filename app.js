import express from 'express'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import fetch from 'node-fetch'
import http from 'http'
import mysql from 'mysql2/promise'

import multer from "multer"
import sharp from "sharp"
import path from "path"
import { debug } from 'console'

const upload = multer({ dest: "temp/" })




const ENV = 'prod'

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: ENV === 'prod' ? 'Nazacapo341746$' : '2112',

    database: 'olgadle',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
})
const app = express()
const USER = 'admin'
const PASSWORD = 'olgadle@4pp'

app.use("/uploads", express.static("uploads"))
app.use(express.json())
app.use(cors())

app.post("/upload", upload.single("imagen"), async (req, res) => {

    const nombre = req.body.nombre || "integrante"

    const fileName =
        nombre
            .replace(/\s+/g, "_")
            .toLowerCase() +
        ".jpg"

    const outputPath = "uploads/" + fileName

    await sharp(req.file.path)
        .resize(400)
        .jpeg({ quality: 80 })
        .toFile(outputPath)

    fs.unlinkSync(req.file.path)

    res.json({
        url: fileName
    })

})
app.post("/delete-image", (req, res) => {

    const { img } = req.body

    if (!img) return res.json({ ok: true })

    const filePath = "." + img

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }

    res.json({ ok: true })

})


app.post('/login', (req, res) => {
    const { username, password } = req.body

    if (username === USER && password === PASSWORD) {
        res.status(200).send('Login exitoso')
    } else {
        res.status(401).send('Credenciales incorrectas')
    }
})

let version = 0.5
// Variables para el integrante oculto y control de tiempo
let integranteIndex = null
let ultimaAsignacion = null
const INTERVALO_MS = 12 * 60 * 60 * 1000 // 12 horas
let intentosTotales = 0
let aciertos = 0

let cancionesActuales = [] // array global
let intentosTotalesEN = 0
let aciertosEN = 0

let integranteQEIndex = null
let intentosTotalesQE = 0
let aciertosQE = 0

// Cache de playlist Deezer
let playlistCache = null
let lastFetchTime = 0
const CACHE_TTL = 15 * 60 * 1000 // 15 minutos
const totalIntegrantes = 55

// Elegir 3 canciones con preview
async function asignarNuevaCancion() {
    const data = await fetchPlaylist(true)
    if (!data || !data.tracks || !data.tracks.data.length) {
        console.error('❌ No se pudo asignar nuevas canciones (playlist vacía)')
        return
    }

    cancionesActuales = []
    const usados = new Set()
    let intentos = 0

    while (cancionesActuales.length < 3 && intentos < 50) {
        const randomIndex = Math.floor(Math.random() * data.tracks.data.length)
        const track = data.tracks.data[randomIndex]
        if (track.preview && !usados.has(track.id)) {
            cancionesActuales.push({ id: track.id })
            usados.add(track.id)
        }
        intentos++
    }

    if (cancionesActuales.length === 3) {
        console.log('🎵 Nuevas canciones asignadas:', cancionesActuales.map((c) => c.id).join(', '))
    } else {
        console.error('❌ No se encontraron 3 canciones con preview válido')
    }
}

async function verificarTiming() {
    if (!ultimaAsignacion || Date.now() - ultimaAsignacion >= INTERVALO_MS) {
        // Asigna nueva canción
        await asignarNuevaCancion()

        // Reinicia contadores
        intentosTotales = 0
        aciertos = 0
        intentosTotalesQE = 0
        aciertosQE = 0
        intentosTotalesEN = 0
        aciertosEN = 0

        // Elige nuevos integrantes aleatoriamente
        integranteIndex = Math.floor(Math.random() * totalIntegrantes)
        integranteQEIndex = Math.floor(Math.random() * totalIntegrantes)

        // Actualiza el timestamp
        ultimaAsignacion = Date.now()
    }
}

async function fetchPlaylist(force = false) {
    try {
        if (!force && playlistCache && Date.now() - lastFetchTime < CACHE_TTL) {
            return playlistCache
        }

        console.log('🔄 Refrescando playlist desde Deezer...')
        const response = await fetch(`https://api.deezer.com/playlist/14879715523`)
        if (!response.ok) throw new Error('Error al pedir la playlist')
        const data = await response.json()

        if (!data.tracks || !data.tracks.data) {
            throw new Error('Playlist vacía')
        }

        playlistCache = data
        lastFetchTime = Date.now()
        return data
    } catch (err) {
        console.error('❌ Error en fetchPlaylist:', err.message)
        return playlistCache // devolver lo último válido
    }
}

// Endpoint integrante

app.get('/integrante', async (req, res) => {
    await verificarTiming()

    const tiempoRestante = INTERVALO_MS - (Date.now() - ultimaAsignacion)

    res.json({
        integrante: integranteIndex,
        tiempoRestante: Math.floor(tiempoRestante / 1000),
        intentosTotales,
        aciertos,
    })
})

app.get('/integranteQE', async (req, res) => {
    await verificarTiming()

    const tiempoRestante = INTERVALO_MS - (Date.now() - ultimaAsignacion)

    res.json({
        integrante: integranteQEIndex,
        tiempoRestante: Math.floor(tiempoRestante / 1000),
        intentosTotalesQE,
        aciertosQE,
    })
})


// Endpoint intento
app.post('/intento', (req, res) => {
    const intento = req.body.intento
    intentosTotales++
    if (intento == 1) {
        aciertos++
    }
    res.json({ intentosTotales, aciertos })
})
app.post('/intentoEN', (req, res) => {
    const intento = req.body.intento
    intentosTotalesEN++
    if (intento == 1) {
        aciertosEN++
    }
    res.json({ intentosTotalesEN, aciertosEN })
})
app.post('/intentoQE', (req, res) => {
    const intento = req.body.intento
    intentosTotalesQE++
    if (intento == 1) {
        aciertosQE++
    }
    res.json({ intentosTotalesQE, aciertosQE })
})

// Endpoint playlist simplificada
app.get('/api/playlist', async (req, res) => {
    const data = await fetchPlaylist()
    if (!data || !data.tracks || !data.tracks.data) {
        return res.status(404).json({ error: 'No se encontraron canciones' })
    }

    const simplifiedTracks = data.tracks.data.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
    }))

    res.json(simplifiedTracks)
})
app.get('/api/version', (req, res) => {
    res.json({ version })
})
// Endpoint random-track (usa siempre la canción actual)
// Endpoint random-tracks (usa siempre las 3 canciones actuales)
app.get('/api/random-tracks', async (req, res) => {
    try {
        await verificarTiming()
        if (!cancionesActuales || cancionesActuales.length === 0) {
            return res.status(404).json({ error: 'No hay canciones asignadas' })
        }

        const tracks = []
        for (let song of cancionesActuales) {
            const response = await fetch(`https://api.deezer.com/track/${song.id}`)
            if (!response.ok) continue
            const track = await response.json()
            if (track && track.preview) {
                tracks.push({
                    id: track.id,
                    title: track.title,
                    artist: track.artist.name,
                    album: track.album.title,
                    preview: track.preview,
                    cover: track.album.cover_medium,
                })
            }
        }

        if (tracks.length === 0) {
            return res.status(404).json({ error: 'Tracks sin preview válido' })
        }

        const tiempoRestante = INTERVALO_MS - (Date.now() - ultimaAsignacion)

        res.json({
            tracks,
            tiempoRestante: Math.floor(tiempoRestante / 1000),
            intentosTotalesEN,
            aciertosEN,
        })
    } catch (error) {
        console.error('❌ Error en /api/random-tracks:', error)
        res.status(500).json({ error: 'Error al obtener tracks actuales' })
    }
})

app.get('/integrantes', async (req, res) => {
    const [rows] = await db.query(`
SELECT 
i.*,
GROUP_CONCAT(p.nombre) programas
FROM integrantes i
LEFT JOIN integrante_programa ip 
ON i.id = ip.id_integrante
LEFT JOIN programas p
ON ip.id_programa = p.id
GROUP BY i.id
`)

    const data = rows.map((i) => ({
        ...i,
        programas: i.programas ? i.programas.split(',') : [],
    }))

    res.json(data)
})

app.get('/programas', async (req, res) => {
    const [rows] = await db.query('SELECT * FROM programas')

    res.json(rows)
})
app.post('/programas', async (req, res) => {

    const { nombre } = req.body

    const [result] = await db.query(
        'INSERT INTO programas(nombre) VALUES (?)', [nombre]
    )

    res.json({
        id: result.insertId
    })

})
app.delete('/integrantes/:id', async (req, res) => {

    const id = req.params.id

    try {

        // primero borrar relaciones con programas
        await db.query(
            'DELETE FROM integrante_programa WHERE id_integrante = ?',
            [id]
        )

        // luego borrar integrante
        await db.query(
            'DELETE FROM integrantes WHERE id = ?',
            [id]
        )

        res.json({ ok: true })

    } catch (err) {

        console.error(err)
        res.status(500).json({ error: 'Error al eliminar integrante' })

    }

})

app.post('/quitar-programa', async (req, res) => {

    const { id_integrante, programa } = req.body

    try {

        // buscar id del programa por nombre
        const [prog] = await db.query(
            'SELECT id FROM programas WHERE nombre = ?', [programa]
        )

        if (prog.length === 0) {
            return res.status(404).json({ error: 'Programa no encontrado' })
        }

        const id_programa = prog[0].id

        // borrar relación
        await db.query(
            'DELETE FROM integrante_programa WHERE id_integrante = ? AND id_programa = ?', [id_integrante, id_programa]
        )

        res.json({ ok: true })

    } catch (err) {

        console.error(err)
        res.status(500).json({ error: 'Error al quitar programa' })

    }

})

app.post('/integrante-programa', async (req, res) => {
    const { id_integrante, id_programa } = req.body

    await db.query(
        `
INSERT INTO integrante_programa
(id_integrante, id_programa)
VALUES (?,?)
`, [id_integrante, id_programa],
    )

    res.json({ ok: true })
})
app.post('/integrantes', async (req, res) => {

    const { nombre, genero, rol, canta, hizo, nacio, img } = req.body

    try {

        const [result] = await db.query(
            `
      INSERT INTO integrantes
      (nombre, genero, rol, canta, hizo, nacio, img)
      VALUES (?,?,?,?,?,?,?)
      `,
            [nombre, genero, rol, canta, hizo, nacio, img]
        )

        res.json({
            id: result.insertId
        })

    } catch (err) {

        console.error(err)
        res.status(500).json({ error: 'Error al crear integrante' })

    }

})
app.post('/integrantes/:id', async (req, res) => {
    const id = req.params.id

    const { nombre, genero, rol, canta, hizo, nacio, img } = req.body

    await db.query(
        `
UPDATE integrantes
SET
nombre=?,
genero=?,
rol=?,
canta=?,
hizo=?,
nacio=?,
img=?
WHERE id=?
`, [nombre, genero, rol, canta, hizo, nacio, img, id],
    )

    res.json({ ok: true })
})

verificarTiming()
const PORT = 3501
// 🚀 Iniciar servidor según entorno
if (ENV === 'prod') {
    const httpsOptions = {
        key: fs.readFileSync('/var/www/ssl/nazadoto.com.key'),
        cert: fs.readFileSync('/var/www/ssl/nazadoto.com.crt'),
    }

    https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`🌐 Servidor HTTPS (prod) en https://olgadle.nazadoto.com:${PORT}`)
    })
} else {
    http.createServer(app).listen(PORT, () => {
        console.log(`🖥️ Servidor HTTP (local) en http://localhost:${PORT}`)
    })
}

// Refrescar playlist cada 6 horas automáticamente
setInterval(() => fetchPlaylist(true), CACHE_TTL)