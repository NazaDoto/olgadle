import express from 'express'
import cors from 'cors'
import fs from 'fs'
import https from 'https'
import fetch from 'node-fetch'
import http from 'http'

const app = express()
app.use(express.json())
app.use(cors())

let version = 0.3
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

let integrantes = [{
    img: 'agusbotto.jpg',
    nombre: 'Agustina Botto',
    genero: 'Femenino',
    programa: ['Varios'],
    rol: 'Técnica',
    canta: 'No',
    hizo: 'Futurock',
    nacio: 'No sé',
},
{
    img: 'agusnucera.jpg',
    nombre: 'Agustina Nucera',
    genero: 'Femenino',
    programa: ['EFDM'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Infobae',
    nacio: 'No sé',
},
{
    img: 'ariel.jpg',
    nombre: 'Ariel Senosiain',
    genero: 'Masculino',
    programa: ['GOLGANA'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'TyC Sports',
    nacio: '1979',
},
{
    img: 'atahualpa.jpg',
    nombre: 'Atahualpa Cáceres',
    genero: 'Masculino',
    programa: ['Varios'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Periodismo',
    nacio: 'No sé',
},
{
    img: 'benja.jpg',
    nombre: 'Benjamín Amadeo',
    genero: 'Masculino',
    programa: ['SQV'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Actuación',
    nacio: '1984',
},
{
    img: 'betu.jpg',
    nombre: 'Damián Betular',
    genero: 'Masculino',
    programa: ['Sería Increíble'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Telefe',
    nacio: '1982',
},
{
    img: 'camijara.jpg',
    nombre: 'Cami Jara',
    genero: 'Femenino',
    programa: ['TDT'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Streams',
    nacio: '2003',
},
{
    img: 'capi.jpg',
    nombre: 'Capi',
    genero: 'Masculino',
    programa: ['TDL'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Producción',
    nacio: '2000',
},
{
    img: 'coker.jpg',
    nombre: 'Coker',
    genero: 'Masculino',
    programa: ['GOLGANA'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Streams',
    nacio: '1997',
},
{
    img: 'davidovsky.jpg',
    nombre: 'Sebastián Davidovsky',
    genero: 'Masculino',
    programa: ['Paraíso Fiscal'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Periodismo',
    nacio: '1984',
},
{
    img: 'diegui.jpg',
    nombre: 'Diego Vallejos',
    genero: 'Masculino',
    programa: ['Paraíso Fiscal', 'Sería Increíble'],
    rol: 'Técnica',
    canta: 'No',
    hizo: 'Futurock',
    nacio: 'No sé',
},
{
    img: 'eial.jpg',
    nombre: 'Eial Moldavsky',
    genero: 'Masculino',
    programa: ['Sería Increíble', 'Faltan Varones'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'IG/TikTok',
    nacio: '1991',
},
{
    img: 'edul.jpg',
    nombre: 'Gastón Edul',
    genero: 'Masculino',
    programa: ['GOLGANA'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'TyC Sports',
    nacio: '1995',
},
{
    img: 'eve.jpg',
    nombre: 'Evelyn Botto',
    genero: 'Femenino',
    programa: ['TDL', 'Mi Primo Es Así'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Urbana Play',
    nacio: '1992',
},
{
    img: 'evitta.jpg',
    nombre: 'Evitta Luna',
    genero: 'Femenino',
    programa: ['SQV', 'EFDM'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Blender',
    nacio: '1998',
},
{
    img: 'ferdente.jpg',
    nombre: 'Fer Dente',
    genero: 'Masculino',
    programa: ['Paraíso Fiscal'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Actuación',
    nacio: '1990',
},
{
    img: 'ferotero.jpg',
    nombre: 'Fer Otero',
    genero: 'Femenino',
    programa: ['EFDM'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'IG/TikTok',
    nacio: '1987',
},
{
    img: 'geuna.jpg',
    nombre: 'Luciana Geuna',
    genero: 'Femenino',
    programa: ['Paraíso Fiscal'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Periodismo',
    nacio: '1977',
},
{
    img: 'giani.jpg',
    nombre: 'Giani Odoguardi',
    genero: 'Masculino',
    programa: ['TDT'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Luzu TV',
    nacio: '2001',
},
{
    img: 'guadapompei.jpg',
    nombre: 'Guada Pompei',
    genero: 'Femenino',
    programa: ['TDT'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'CM',
    nacio: 'No sé',
},
{
    img: 'homero.jpg',
    nombre: 'Homero Pettinato',
    genero: 'Masculino',
    programa: ['Sería Increíble', 'Faltan Varones'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Rock & Pop',
    nacio: '1987',
},
{
    img: 'juanferrari.jpg',
    nombre: 'Juan Ferrari',
    genero: 'Masculino',
    programa: ['Sería Increíble'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Urbana Play',
    nacio: 'No sé',
},
{
    img: 'juliduyos.jpg',
    nombre: 'Juli Duyos',
    genero: 'Femenino',
    programa: ['Mi Primo Es Así', 'TDL'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Metro 95.1',
    nacio: '1991',
},
{
    img: 'lauti.jpg',
    nombre: 'Lautaro Kermen',
    genero: 'Masculino',
    programa: ['Mi Primo Es Así', 'TDL'],
    rol: 'Productor',
    canta: 'Sí',
    hizo: 'Producción',
    nacio: '1994',
},
{
    img: 'lizy.jpg',
    nombre: 'Lizy Tagliani',
    genero: 'Femenino',
    programa: ['EFDM'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Pop Radio',
    nacio: '1970',
},
{
    img: 'lula.jpg',
    nombre: 'Lula Salomone',
    genero: 'Femenino',
    programa: ['SQV', 'Faltan Varones'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Producción',
    nacio: '2000',
},
{
    img: 'luli.jpg',
    nombre: 'Luli González',
    genero: 'Femenino',
    programa: ['TDL'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Youtube',
    nacio: '2003',
},
{
    img: 'lucas.jpg',
    nombre: 'Lucas Fridman',
    genero: 'Masculino',
    programa: ['SQV'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Vorterix',
    nacio: '1987',
},
{
    img: 'manu.jpg',
    nombre: 'Manu Amabile',
    genero: 'Masculino',
    programa: ['Varios'],
    rol: 'Técnica',
    canta: 'No',
    hizo: 'Multimedia',
    nacio: 'No sé',
},
{
    img: 'marti.jpg',
    nombre: 'Marti Benza',
    genero: 'Femenino',
    programa: ['SQV', 'TDT'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Luzu TV',
    nacio: '2000',
},
{
    img: 'rechi.jpg',
    nombre: 'Martín Rechimuzzi',
    genero: 'Masculino',
    programa: ['Mi Primo Es Así'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Actuación',
    nacio: '1987',
},
{
    img: 'reich.jpg',
    nombre: 'Martín Reich',
    genero: 'Masculino',
    programa: ['Paraíso Fiscal'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Telefe',
    nacio: '1983',
},
{
    img: 'migue.jpg',
    nombre: 'Migue Granados',
    genero: 'Masculino',
    programa: ['SQV'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Vorterix',
    nacio: '1986',
},
{
    img: 'morte.jpg',
    nombre: 'Mortedor',
    genero: 'Masculino',
    programa: ['TDL'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Streams',
    nacio: '2002',
},
{
    img: 'nachito.jpg',
    nombre: 'Nachito Elizalde',
    genero: 'Masculino',
    programa: ['TDL'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Luzu TV',
    nacio: '1988',
},
{
    img: 'chona.jpg',
    nombre: 'Nacho Noviski',
    genero: 'Masculino',
    programa: ['Varios'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Periodismo',
    nacio: 'No sé',
},
{
    img: 'natijota.jpg',
    nombre: 'Nati Jota',
    genero: 'Femenino',
    programa: ['Sería Increíble'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Luzu TV',
    nacio: '1994',
},
{
    img: 'etevenaux.jpg',
    nombre: 'Nicolás Etevenaux',
    genero: 'Masculino',
    programa: ['Varios'],
    rol: 'Técnica',
    canta: 'Sí',
    hizo: 'Vorterix',
    nacio: 'No sé',
},
{
    img: 'nicoferrero.jpg',
    nombre: 'Nico Ferrero',
    genero: 'Masculino',
    programa: ['TDT'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Luzu TV',
    nacio: '2000',
},
{
    img: 'nicogeuna.jpg',
    nombre: 'Nicolás Geuna',
    genero: 'Masculino',
    programa: ['Paraíso Fiscal'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Urbana Play',
    nacio: 'No sé',
},
{
    img: 'noe.jpg',
    nombre: 'Noelia Custodio',
    genero: 'Femenino',
    programa: ['Mi Primo Es Así'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Gelatina',
    nacio: '1989',
},
{
    img: 'paula.jpg',
    nombre: 'Paula Chaves',
    genero: 'Femenino',
    programa: ['TDL'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Telefe',
    nacio: '1984',
},
{
    img: 'paugornitz.jpg',
    nombre: 'Paula Gornitz',
    genero: 'Femenino',
    programa: ['Varios'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Futurock',
    nacio: '2000',
},
{
    img: 'pelao.jpg',
    nombre: 'Pelao Khe',
    genero: 'Masculino',
    programa: ['TDL', 'Faltan Varones'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'IG/TikTok',
    nacio: '1997',
},
{
    img: 'peter.jpg',
    nombre: 'Pedro Alfonso',
    genero: 'Masculino',
    programa: ['GOLGANA', 'Faltan Varones'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Actuación',
    nacio: '1979',
},
{
    img: 'pollo.jpg',
    nombre: 'Pollo Álvarez',
    genero: 'Masculino',
    programa: ['GOLGANA'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Infobae',
    nacio: '1983',
},
{
    img: 'rami.jpg',
    nombre: 'Ramiro Ruffini',
    genero: 'Masculino',
    programa: ['SQV', 'Mi Primo Es Así'],
    rol: 'Técnica',
    canta: 'No',
    hizo: 'Radio',
    nacio: 'No sé',
},
{
    img: 'sebi.jpg',
    nombre: 'Sebi Schurman',
    genero: 'Masculino',
    programa: ['Sería Increíble'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Corta',
    nacio: 'No sé',
},
{
    img: 'sofi.jpg',
    nombre: 'Sofi Morandi',
    genero: 'Femenino',
    programa: ['SQV'],
    rol: 'Conductor',
    canta: 'Sí',
    hizo: 'Actuación',
    nacio: '1997',
},
{
    img: 'tania.jpg',
    nombre: 'Tania Wedeltoft',
    genero: 'Femenino',
    programa: ['Paraíso Fiscal'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Metro 98.7',
    nacio: '1983',
},
{
    img: 'tefi.jpg',
    nombre: 'Tefi Russo',
    genero: 'Femenino',
    programa: ['SQV'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'IG/Tiktok',
    nacio: '1985',
},
{
    img: 'titi.jpg',
    nombre: 'Titi',
    genero: 'Femenino',
    programa: ['Varios'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'Periodismo',
    nacio: 'No sé',
},
{
    img: 'toro.jpg',
    nombre: 'Toro',
    genero: 'Masculino',
    programa: ['Varios'],
    rol: 'Técnica',
    canta: 'No',
    hizo: 'Música',
    nacio: '1985',
},
{
    img: 'toto.jpg',
    nombre: 'Toto Kirzner',
    genero: 'Masculino',
    programa: ['Mi Primo Es Así', 'EFDM', 'Faltan Varones'],
    rol: 'Conductor',
    canta: 'No',
    hizo: 'Actuación',
    nacio: '1998',
},
{
    img: 'zorrito.jpg',
    nombre: 'Zorrito Aguerre',
    genero: 'Masculino',
    programa: ['SQV'],
    rol: 'Productor',
    canta: 'No',
    hizo: 'ESPN',
    nacio: 'No sé',
},
]

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
        console.log('🎵 Nuevas canciones asignadas:', cancionesActuales.map(c => c.id).join(', '))
    } else {
        console.error('❌ No se encontraron 3 canciones con preview válido')
    }
}

async function verificarTiming() {
    if (!ultimaAsignacion || Date.now() - ultimaAsignacion >= INTERVALO_MS) {
        // Asigna nueva canción
        await asignarNuevaCancion();

        // Reinicia contadores
        intentosTotales = 0;
        aciertos = 0;
        intentosTotalesQE = 0;
        aciertosQE = 0;
        intentosTotalesEN = 0
        aciertosEN = 0

        // Elige nuevos integrantes aleatoriamente
        integranteIndex = Math.floor(Math.random() * totalIntegrantes);
        integranteQEIndex = Math.floor(Math.random() * totalIntegrantes);

        // Actualiza el timestamp
        ultimaAsignacion = Date.now();
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

app.get('/integrantes', async (req, res) => {
    res.json(integrantes)
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


verificarTiming();
const ENV = 'prod'
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
