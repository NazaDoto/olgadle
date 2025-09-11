import express from "express";
import cors from "cors";
import fs from "fs";
import https from "https";

const app = express();
app.use(express.json());

app.use(cors());

// Variables para el integrante oculto y control de tiempo
let integranteIndex = null;
let ultimaAsignacion = null;
const INTERVALO_MS = 12 * 60 * 60 * 1000; // 24 horas
let intentosTotales = 0;
let aciertos = 0;
// Función que asigna un nuevo integrante
function asignarNuevoIntegrante(totalIntegrantes) {
    integranteIndex = Math.floor(Math.random() * totalIntegrantes);
    ultimaAsignacion = Date.now();
    console.log("Nuevo integrante oculto:", integranteIndex);
}

// Middleware para comprobar si hay que renovar el integrante
function verificarIntegrante(totalIntegrantes) {
    if (!ultimaAsignacion || Date.now() - ultimaAsignacion >= INTERVALO_MS) {
        asignarNuevoIntegrante(totalIntegrantes);
        intentosTotales = 0;
        aciertos = 0;
    }
}

// Endpoint
app.get("/integrante", (req, res) => {
    const totalIntegrantes = 53; // ⚠️ Cambiá este valor según la cantidad en tu front

    verificarIntegrante(totalIntegrantes);

    // Calcular tiempo restante en segundos
    const tiempoRestante =
        INTERVALO_MS - (Date.now() - ultimaAsignacion);

    res.json({
        integrante: integranteIndex, // el front usa este número como índice
        tiempoRestante: Math.floor(tiempoRestante / 1000), // en segundos
        intentosTotales: intentosTotales,
        aciertos: aciertos,
    });
});


app.post("/intento", (req, res) => {
    const intento = req.body.intento; // viene del body
    intentosTotales++;
    if (intento == 1) {
        aciertos++;
    }
    res.json({ intentosTotales, aciertos });
});



// Endpoint para obtener un track aleatorio de una playlist
app.get("/api/random-track/:playlistId", async(req, res) => {
    const playlistId = req.params.playlistId

    try {
        const response = await fetch(`https://api.deezer.com/playlist/${playlistId}`)
        const data = await response.json()

        if (!data.tracks || !data.tracks.data || data.tracks.data.length === 0) {
            return res.status(404).json({ error: "No se encontraron canciones en la playlist" })
        }

        let randomTrack
        do {
            // Elegir índice aleatorio
            const randomIndex = Math.floor(Math.random() * data.tracks.data.length)
            randomTrack = data.tracks.data[randomIndex]
        } while (!randomTrack.preview) // Repetir si no tiene preview

        // Devolver solo la info necesaria
        res.json({
            id: randomTrack.id,
            title: randomTrack.title,
            artist: randomTrack.artist.name,
            album: randomTrack.album.title,
            preview: randomTrack.preview, // 🔑 el mp3 de 30 segundos
            cover: randomTrack.album.cover_medium,
        })

    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Error al obtener la playlist de Deezer" })
    }
})



// // HTTPS credentials (Certbot)
// const httpsOptions = {
//     key: fs.readFileSync('/var/www/ssl/nazadoto.com.key'),
//     cert: fs.readFileSync('/var/www/ssl/nazadoto.com.crt'),
// };

// // Iniciar servidor HTTPS
// const PORT = process.env.PORT || 3501;
// https.createServer(httpsOptions, app).listen(PORT, () => {
//     console.log(`Servidor HTTPS corriendo en https://olgadle.nazadoto.com:${PORT}`);
// });

app.listen(3501, () => {
    console.log(`Servidor HTTPS corriendo en https://olgadle.nazadoto.com:3501`);
});
