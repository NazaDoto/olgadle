import express from "express";
import cors from "cors";
import fs from "fs";
import https from "https";
import fetch from "node-fetch";
import http from "http";

const app = express();
app.use(express.json());
app.use(cors());

// Variables para el integrante oculto y control de tiempo
let integranteIndex = null;
let ultimaAsignacion = null;
const INTERVALO_MS = 12 * 60 * 60 * 1000; // 12 horas
let intentosTotales = 0;
let aciertos = 0;

const INTERVALO_CANCION = 12 * 60 * 60 * 1000; // 12 horas
let cancionActual = null;
let ultimaCancion = null;
let intentosTotalesEN = 0;
let aciertosEN = 0;


// Cache de playlist Deezer
let playlistCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos

// Elegir nueva canción con preview
async function asignarNuevaCancion() {
    const data = await fetchPlaylist(true);
    if (!data || !data.tracks || !data.tracks.data.length) {
        console.error("❌ No se pudo asignar nueva canción (playlist vacía)");
        return;
    }

    let randomTrack;
    let intentos = 0;
    do {
        const randomIndex = Math.floor(Math.random() * data.tracks.data.length);
        randomTrack = data.tracks.data[randomIndex];
        intentos++;
    } while ((!randomTrack.preview) && intentos < 20);

    if (randomTrack && randomTrack.preview) {
        cancionActual = { id: randomTrack.id };
        ultimaCancion = Date.now();
        console.log("🎵 Nueva canción asignada:", randomTrack.title, "-", randomTrack.artist.name);
    } else {
        console.error("❌ No se encontró canción con preview válido después de 20 intentos");
    }
}

function verificarCancion() {
    if (!ultimaCancion || Date.now() - ultimaCancion >= INTERVALO_CANCION) {
        return asignarNuevaCancion();
    }
}


async function fetchPlaylist(force = false) {
    try {
        if (!force && playlistCache && Date.now() - lastFetchTime < CACHE_TTL) {
            return playlistCache;
        }

        console.log("🔄 Refrescando playlist desde Deezer...");
        const response = await fetch(`https://api.deezer.com/playlist/14297920541`);
        if (!response.ok) throw new Error("Error al pedir la playlist");
        const data = await response.json();

        if (!data.tracks || !data.tracks.data) {
            throw new Error("Playlist vacía");
        }

        playlistCache = data;
        lastFetchTime = Date.now();
        return data;
    } catch (err) {
        console.error("❌ Error en fetchPlaylist:", err.message);
        return playlistCache; // devolver lo último válido
    }
}

// Asignación de integrante
function asignarNuevoIntegrante(totalIntegrantes) {
    integranteIndex = Math.floor(Math.random() * totalIntegrantes);
    ultimaAsignacion = Date.now();
    console.log("Nuevo integrante oculto:", integranteIndex);
}

function verificarIntegrante(totalIntegrantes) {
    if (!ultimaAsignacion || Date.now() - ultimaAsignacion >= INTERVALO_MS) {
        asignarNuevoIntegrante(totalIntegrantes);
        intentosTotales = 0;
        aciertos = 0;
    }
}

// Endpoint integrante
app.get("/integrante", (req, res) => {
    const totalIntegrantes = 53;
    verificarIntegrante(totalIntegrantes);

    const tiempoRestante = INTERVALO_MS - (Date.now() - ultimaAsignacion);

    res.json({
        integrante: integranteIndex,
        tiempoRestante: Math.floor(tiempoRestante / 1000),
        intentosTotales,
        aciertos,
    });
});

// Endpoint intento
app.post("/intento", (req, res) => {
    const intento = req.body.intento;
    intentosTotales++;
    if (intento == 1) {
        aciertos++;
    }
    res.json({ intentosTotales, aciertos });
});
app.post("/intentoEN", (req, res) => {
    const intento = req.body.intento;
    intentosTotalesEN++;
    if (intento == 1) {
        aciertosEN++;
    }
    res.json({ intentosTotalesEN, aciertosEN });
});

// Endpoint playlist simplificada
app.get("/api/playlist", async (req, res) => {
    const data = await fetchPlaylist();
    if (!data || !data.tracks || !data.tracks.data) {
        return res.status(404).json({ error: "No se encontraron canciones" });
    }

    const simplifiedTracks = data.tracks.data.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist.name,
    }));

    res.json(simplifiedTracks);
});

// Endpoint random-track (usa siempre la canción actual)
app.get("/api/random-track", async (req, res) => {
    try {
        await verificarCancion();
        if (!cancionActual) return res.status(404).json({ error: "No hay canción asignada" });

        // Fetch directo de Deezer solo para esa canción
        const response = await fetch(`https://api.deezer.com/track/${cancionActual.id}`);
        if (!response.ok) throw new Error("Error al pedir track específico");

        const track = await response.json();
        if (!track || !track.preview) {
            return res.status(404).json({ error: "Track sin preview válido" });
        }

        const tiempoRestante = INTERVALO_CANCION - (Date.now() - ultimaCancion);

        res.json({
            id: track.id,
            title: track.title,
            artist: track.artist.name,
            album: track.album.title,
            preview: track.preview,
            cover: track.album.cover_medium,
            tiempoRestante: Math.floor(tiempoRestante / 1000),
            intentosTotalesEN: intentosTotalesEN,
            aciertosEN: aciertosEN
        });
    } catch (error) {
        console.error("❌ Error en /api/random-track:", error);
        res.status(500).json({ error: "Error al obtener track actual" });
    }
});

// Proxy de tracks
app.get("/api/track-proxy/:id", async (req, res) => {
    const data = await fetchPlaylist();
    try {
        const track = data.tracks.data.find(t => t.id == req.params.id);
        if (!track || !track.preview) return res.status(404).send("Track no encontrado");

        const response = await fetch(track.preview);
        if (!response.ok) throw new Error("Error al descargar el track");

        const buffer = await response.arrayBuffer();
        res.set("Content-Type", "audio/mpeg");
        res.send(Buffer.from(buffer));
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al reproducir track");
    }
});
asignarNuevaCancion();
const ENV = "prod"
const PORT = 3501
// 🚀 Iniciar servidor según entorno
if (ENV === "prod") {
    const httpsOptions = {
        key: fs.readFileSync("/var/www/ssl/nazadoto.com.key"),
        cert: fs.readFileSync("/var/www/ssl/nazadoto.com.crt"),
    };

    https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`🌐 Servidor HTTPS (prod) en https://olgadle.nazadoto.com:${PORT}`);
    });
} else {
    http.createServer(app).listen(PORT, () => {
        console.log(`🖥️ Servidor HTTP (local) en http://localhost:${PORT}`);
    });
}

// Refrescar playlist cada 6 horas automáticamente
setInterval(() => fetchPlaylist(true), CACHE_TTL);